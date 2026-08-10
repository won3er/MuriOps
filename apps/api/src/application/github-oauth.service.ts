import { randomBytes } from "node:crypto";
import type { OAuthConnectionResult, OAuthGithubRepoOption, OAuthStartResponse } from "@qa-ai/shared";
import { GithubAdapter } from "../infrastructure/adapters/github/github-adapter.js";
import {
  buildGithubAuthorizeUrl,
  exchangeGithubCode,
  fetchGithubAccountLabel,
  isGithubOAuthConfigured,
  listGithubAccessibleRepos,
} from "../infrastructure/oauth/github-oauth-client.js";
import { signOAuthState, verifyOAuthState } from "../infrastructure/security/oauth-state.js";
import {
  consumePendingOAuthSession,
  createPendingOAuthSession,
  getPendingOAuthSession,
  OAuthSessionExpiredError,
} from "../infrastructure/security/oauth-session-store.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { adapterConnectionService } from "./adapter-connection.service.js";
import { NotFoundError } from "./analysis.service.js";

export { OAuthSessionExpiredError };

/**
 * [10/08/2026] "Conectar com GitHub" via OAuth — substitui o formulário de
 * colar PAT à mão. Fluxo: `start` (autenticado) devolve a URL de autorizar;
 * o navegador abre em popup; o GitHub redireciona pro `callback` (público,
 * identidade vem só do `state` assinado); o token fica numa sessão
 * temporária em memória (`oauth-session-store.ts`) até o usuário escolher o
 * repositório em `listRepos`/`finalize` — só aí grava de verdade em
 * `AdapterConnection`, reusando `upsertGithubConnection` (mesmo validador,
 * mesmo segredo de webhook) que o fluxo manual de PAT já usava.
 */
export const githubOAuthService = {
  async start(
    organizationId: string,
    projectId: string,
    userId: string,
    apiBaseUrl: string,
  ): Promise<OAuthStartResponse> {
    if (!isGithubOAuthConfigured()) return { configured: false };
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("Projeto não encontrado");

    const nonce = randomBytes(16).toString("base64url");
    const state = signOAuthState({ organizationId, projectId, userId, nonce });
    return { configured: true, authUrl: buildGithubAuthorizeUrl(apiBaseUrl, state) };
  },

  /** Chamado pela rota pública de callback. Devolve o nonce (pra frontend usar como `session`) ou lança em caso de state inválido/código recusado. */
  async handleCallback(apiBaseUrl: string, code: string, state: string): Promise<string> {
    const payload = verifyOAuthState(state);
    if (!payload) throw new Error("State inválido — inicie a conexão de novo.");

    const token = await exchangeGithubCode(apiBaseUrl, code);
    const accountLabel = await fetchGithubAccountLabel(token.accessToken);

    createPendingOAuthSession(payload.nonce, {
      kind: "GITHUB",
      organizationId: payload.organizationId,
      projectId: payload.projectId,
      userId: payload.userId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      accountLabel,
    });
    return payload.nonce;
  },

  async listRepos(
    organizationId: string,
    projectId: string,
    session: string,
  ): Promise<{ accountLabel: string | null; repos: OAuthGithubRepoOption[] }> {
    const pending = getPendingOAuthSession(session);
    if (
      !pending ||
      pending.kind !== "GITHUB" ||
      pending.organizationId !== organizationId ||
      pending.projectId !== projectId
    ) {
      throw new OAuthSessionExpiredError();
    }
    const repos = await listGithubAccessibleRepos(pending.accessToken);
    return { accountLabel: pending.accountLabel, repos };
  },

  async finalize(
    organizationId: string,
    projectId: string,
    userId: string,
    session: string,
    owner: string,
    repo: string,
    apiBaseUrl: string,
  ): Promise<OAuthConnectionResult> {
    const pending = getPendingOAuthSession(session);
    if (
      !pending ||
      pending.kind !== "GITHUB" ||
      pending.organizationId !== organizationId ||
      pending.projectId !== projectId
    ) {
      throw new OAuthSessionExpiredError();
    }

    const connection = await adapterConnectionService.upsertGithubConnection(
      organizationId,
      projectId,
      userId,
      { owner, repo, token: pending.accessToken },
      {
        refreshToken: pending.refreshToken,
        expiresAt: pending.expiresAt,
        accountLabel: pending.accountLabel,
      },
    );
    consumePendingOAuthSession(session);

    let webhookConfiguredAutomatically = false;
    try {
      const adapter = new GithubAdapter(pending.accessToken, owner, repo);
      const result = await adapter.ensureWebhook(
        `${apiBaseUrl}${connection.webhookUrl}`,
        connection.webhookSecret,
      );
      webhookConfiguredAutomatically = result.created || result.alreadyExisted;
    } catch {
      // Best-effort: token OAuth pode não ter permissão de admin do repo
      // (ex.: colaborador sem acesso de admin). A UI cai pro passo manual
      // de sempre (copiar URL+secret), sem bloquear a conexão em si.
    }

    return {
      ...connection,
      webhookConfiguredAutomatically,
      webhookUrl: `${apiBaseUrl}${connection.webhookUrl}`,
      ...(webhookConfiguredAutomatically ? {} : { webhookSecret: connection.webhookSecret }),
    };
  },
};
