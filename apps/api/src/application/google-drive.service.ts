import { createHmac, timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { decryptSecret, encryptSecret } from "../infrastructure/crypto/secret-box.js";
import {
  DocumentExtractionError,
  extractTextFromBinary,
  isExtractableBinaryMime,
} from "../infrastructure/documents/text-extractor.js";

/**
 * Conexão OAuth com Google Drive, usada pelo Guardian pra listar/ler
 * documentos direto de uma pasta do usuário em vez de exigir colar o texto
 * manualmente. Fluxo padrão de "authorization code" com refresh token
 * offline — diferente do login com Google (auth.service.ts), que só
 * verifica um ID token sem nunca trocar segredo com o Google.
 *
 * v1: só lê (drive.readonly). Sem escrita, sem apagar, sem mover arquivo.
 */

const DRIVE_SCOPES = "openid email https://www.googleapis.com/auth/drive.readonly";

// Tipos de arquivo que sabemos transformar em texto pro Guardian auditar
// direto (sem parser adicional). PDF e planilha Excel binária (.xlsx/.xls)
// também são suportados, mas via extractTextFromBinary() — ver abaixo.
const GOOGLE_DOC_EXPORT_MIME = "text/plain";
const GOOGLE_SHEET_EXPORT_MIME = "text/csv";
const DOWNLOADABLE_TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/csv",
  "text/tab-separated-values",
  "application/json",
]);

// O mesmo limite aplicado ao documento colado no Guardian. Mantê-lo aqui
// impede que um download grande contorne a validação da rota de auditoria.
const MAX_DRIVE_DOCUMENT_CHARACTERS = 200_000;

export class GoogleDriveError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
  }
}

function assertConfigured(): void {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new GoogleDriveError(
      "Conexão com Google Drive não está configurada neste ambiente (faltam GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET).",
      503,
    );
  }
}

function redirectUri(): string {
  if (env.GOOGLE_DRIVE_REDIRECT_URI) return env.GOOGLE_DRIVE_REDIRECT_URI;
  if (env.PUBLIC_API_URL) return `${env.PUBLIC_API_URL.replace(/\/$/, "")}/guardian/drive/callback`;
  throw new GoogleDriveError(
    "Defina GOOGLE_DRIVE_REDIRECT_URI ou PUBLIC_API_URL pra habilitar a conexão com Google Drive.",
    503,
  );
}

function frontendOrigin(): string {
  const candidate = env.PUBLIC_WEB_URL ?? env.CORS_ORIGIN.split(",")[0]?.trim();
  if (!candidate) {
    throw new GoogleDriveError(
      "Defina PUBLIC_WEB_URL ou CORS_ORIGIN para concluir a conexão com o Google Drive.",
      503,
    );
  }
  try {
    return new URL(candidate).origin;
  } catch {
    throw new GoogleDriveError("PUBLIC_WEB_URL não é uma URL válida.", 503);
  }
}

/** Assina um "state" auto-contido (organizationId + expiração + HMAC) sem
 * depender do formato fixo do payload JWT de sessão — o callback do Google é
 * um redirect de navegador sem Authorization header, então precisamos
 * identificar a organização só pelo que volta na URL. */
function signState(organizationId: string): string {
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const payload = `${organizationId}:${expiresAt}`;
  const sig = createHmac("sha256", env.JWT_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`, "utf8").toString("base64url");
}

function verifyState(state: string): string {
  let decoded: string;
  try {
    decoded = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    throw new GoogleDriveError("Link de conexão inválido.", 400);
  }
  const [organizationId, expiresAtStr, sig, ...rest] = decoded.split(":");
  if (!organizationId || !expiresAtStr || !sig || rest.length > 0)
    throw new GoogleDriveError("Link de conexão inválido.", 400);
  const expiresAt = Number(expiresAtStr);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) {
    throw new GoogleDriveError("Link de conexão expirou — tente conectar de novo.", 400);
  }
  const expected = createHmac("sha256", env.JWT_SECRET)
    .update(`${organizationId}:${expiresAtStr}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(sig, "utf8");
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    throw new GoogleDriveError("Link de conexão inválido ou adulterado.", 400);
  }
  return organizationId;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope: string;
  token_type: string;
}

async function fetchUserEmail(idToken: string | undefined): Promise<string | null> {
  if (!idToken || !env.GOOGLE_CLIENT_ID) return null;
  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  const ticket = await client
    .verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID })
    .catch(() => null);
  return ticket?.getPayload()?.email ?? null;
}

export const googleDriveService = {
  frontendUrl(query: Record<string, string> = {}): string {
    const url = new URL("/guardian", frontendOrigin());
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    return url.toString();
  },

  isConfigured(): boolean {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  },

  async status(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { googleDriveRefreshTokenEncrypted: true, googleDriveConnectedEmail: true },
    });
    return {
      configured: this.isConfigured(),
      connected: Boolean(org?.googleDriveRefreshTokenEncrypted),
      email: org?.googleDriveConnectedEmail ?? null,
    };
  },

  async disconnect(organizationId: string) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        googleDriveRefreshTokenEncrypted: null,
        googleDriveAccessTokenEncrypted: null,
        googleDriveTokenExpiresAt: null,
        googleDriveConnectedEmail: null,
      },
    });
  },

  buildAuthUrl(organizationId: string): string {
    assertConfigured();
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: DRIVE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state: signState(organizationId),
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  /** Troca o "code" do redirect do Google por tokens e salva na organização
   * identificada pelo state. Retorna a URL do frontend pra redirecionar o
   * navegador do usuário de volta. */
  async handleCallback(code: string, state: string): Promise<{ frontendUrl: string }> {
    assertConfigured();
    const organizationId = verifyState(state);

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      throw new GoogleDriveError(
        `Falha ao trocar código de autorização com o Google (${res.status}).`,
        502,
      );
    }
    const tokens = (await res.json()) as TokenResponse;
    if (!tokens.refresh_token) {
      // Acontece se o usuário já tinha consentido antes sem revogar acesso —
      // Google só devolve refresh_token na primeira vez (ou com prompt=consent,
      // que já forçamos acima). Se mesmo assim faltar, orienta a revogar em
      // myaccount.google.com/permissions e tentar de novo.
      throw new GoogleDriveError(
        "O Google não retornou permissão de acesso contínuo. Revogue o acesso anterior do MuriOps em myaccount.google.com/permissions e conecte de novo.",
        400,
      );
    }
    const email = await fetchUserEmail(tokens.id_token);

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        googleDriveRefreshTokenEncrypted: encryptSecret(tokens.refresh_token),
        googleDriveAccessTokenEncrypted: encryptSecret(tokens.access_token),
        googleDriveTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        googleDriveConnectedEmail: email,
      },
    });

    return { frontendUrl: this.frontendUrl({ drive: "connected" }) };
  },

  /** Retorna um access token válido pra organização, renovando via refresh
   * token se estiver expirado ou perto de expirar. */
  async getValidAccessToken(organizationId: string): Promise<string> {
    assertConfigured();
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        googleDriveRefreshTokenEncrypted: true,
        googleDriveAccessTokenEncrypted: true,
        googleDriveTokenExpiresAt: true,
      },
    });
    if (!org?.googleDriveRefreshTokenEncrypted)
      throw new GoogleDriveError("Google Drive não está conectado. Conecte em Guardian.", 400);

    const stillValid =
      org.googleDriveAccessTokenEncrypted &&
      org.googleDriveTokenExpiresAt &&
      org.googleDriveTokenExpiresAt.getTime() - Date.now() > 60_000;
    if (stillValid) return decryptSecret(org.googleDriveAccessTokenEncrypted!);

    const refreshToken = decryptSecret(org.googleDriveRefreshTokenEncrypted);
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      // Refresh token revogado/expirado — limpa a conexão pra UI oferecer
      // reconectar em vez de ficar tentando com um token morto.
      await this.disconnect(organizationId);
      throw new GoogleDriveError(
        "A conexão com o Google Drive expirou ou foi revogada. Conecte de novo.",
        401,
      );
    }
    const tokens = (await res.json()) as TokenResponse;
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        googleDriveAccessTokenEncrypted: encryptSecret(tokens.access_token),
        googleDriveTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
    return tokens.access_token;
  },

  /** Lista arquivos de uma pasta (ou busca por nome, se `query` for passado).
   * Sem folderId nem query, lista a raiz do "Meu Drive". */
  async listFiles(
    organizationId: string,
    opts: { folderId?: string; query?: string },
  ): Promise<
    Array<{ id: string; name: string; mimeType: string; modifiedTime: string; isFolder: boolean }>
  > {
    const accessToken = await this.getValidAccessToken(organizationId);
    const clauses = ["trashed = false"];
    if (opts.folderId) clauses.push(`'${opts.folderId}' in parents`);
    else if (!opts.query) clauses.push("'root' in parents");
    if (opts.query) clauses.push(`name contains '${opts.query.replace(/'/g, "")}'`);

    const params = new URLSearchParams({
      q: clauses.join(" and "),
      fields: "files(id,name,mimeType,modifiedTime)",
      orderBy: "folder,modifiedTime desc",
      pageSize: "50",
    });
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok)
      throw new GoogleDriveError(`Falha ao listar arquivos do Google Drive (${res.status}).`, 502);
    const data = (await res.json()) as {
      files: Array<{ id: string; name: string; mimeType: string; modifiedTime: string }>;
    };
    return data.files.map((f) => ({
      ...f,
      isFolder: f.mimeType === "application/vnd.google-apps.folder",
    }));
  },

  /** Baixa um arquivo do Drive como texto pronto pra auditar no Guardian.
   * Google Docs/Sheets são exportados; arquivos "de texto" comuns (csv/txt/
   * tsv/json) são baixados direto. Qualquer outro tipo (PDF, imagem, .xlsx
   * binário) é recusado com mensagem explicando a limitação atual. */
  async downloadFileAsText(
    organizationId: string,
    fileId: string,
  ): Promise<{ name: string; content: string }> {
    const accessToken = await this.getValidAccessToken(organizationId);
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!metaRes.ok)
      throw new GoogleDriveError(`Arquivo não encontrado no Drive (${metaRes.status}).`, 404);
    const meta = (await metaRes.json()) as { id: string; name: string; mimeType: string };

    let url: string;
    let binary = false;
    if (meta.mimeType === "application/vnd.google-apps.document") {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${GOOGLE_DOC_EXPORT_MIME}`;
    } else if (meta.mimeType === "application/vnd.google-apps.spreadsheet") {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${GOOGLE_SHEET_EXPORT_MIME}`;
    } else if (DOWNLOADABLE_TEXT_MIME_TYPES.has(meta.mimeType)) {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    } else if (isExtractableBinaryMime(meta.mimeType)) {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      binary = true;
    } else {
      throw new GoogleDriveError(
        `"${meta.name}" é do tipo ${meta.mimeType}, que o Guardian ainda não sabe ler. Por enquanto funciona com Google Docs, Google Sheets, PDF, Excel (.xlsx/.xls), e arquivos .csv/.txt/.tsv/.json.`,
        400,
      );
    }

    const fileRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!fileRes.ok)
      throw new GoogleDriveError(`Falha ao baixar o conteúdo do arquivo (${fileRes.status}).`, 502);

    let content: string;
    if (binary) {
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      try {
        content = await extractTextFromBinary(buffer, meta.mimeType, meta.name);
      } catch (err) {
        if (err instanceof DocumentExtractionError) {
          throw new GoogleDriveError(err.message, err.statusCode);
        }
        throw err;
      }
    } else {
      content = await fileRes.text();
    }

    if (content.length > MAX_DRIVE_DOCUMENT_CHARACTERS) {
      throw new GoogleDriveError(
        `"${meta.name}" excede o limite de 200.000 caracteres. Escolha uma parte menor do documento.`,
        413,
      );
    }
    return { name: meta.name, content };
  },
};
