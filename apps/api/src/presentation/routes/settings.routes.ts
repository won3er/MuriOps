import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AI_PROVIDER_NAMES } from "../../infrastructure/ai/index.js";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "../../infrastructure/crypto/secret-box.js";
import { prisma } from "../../infrastructure/database/prisma.js";

const saveSchema = z.object({
  provider: z.enum(AI_PROVIDER_NAMES),
  apiKey: z.string().min(10),
});

type AiProvider = (typeof AI_PROVIDER_NAMES)[number];

/**
 * Evita a falha mais comum de configuração: salvar uma chave de um provedor
 * em outro. Não tenta "adivinhar" nem trocar o provedor automaticamente,
 * porque a escolha explícita continua sendo da organização.
 *
 * A validação é deliberadamente conservadora: só rejeita formatos que são
 * inequivocamente de outro provedor. Outros formatos seguem para a API
 * correspondente, que continua sendo a autoridade final de autenticação.
 */
function providerKeyMismatch(
  provider: AiProvider,
  apiKey: string,
): string | null {
  const key = apiKey.trim();
  if (key.startsWith("AIza") && provider !== "gemini") {
    return "Esta chave parece ser do Gemini. Selecione Gemini (Google) antes de salvar.";
  }
  if (key.startsWith("sk-ant-") && provider !== "claude") {
    return "Esta chave parece ser do Claude. Selecione Claude (Anthropic) antes de salvar.";
  }
  if (key.startsWith("sk-") && provider === "gemini") {
    return "Esta chave parece ser do Claude ou da OpenAI. Uma chave Gemini normalmente começa com AIza.";
  }
  return null;
}

/**
 * Confere credenciais sem gerar texto nem consumir tokens. O formato da chave
 * é apenas uma pista: chaves recentes do Gemini podem não usar o prefixo
 * histórico `AIza`, por isso Gemini e OpenAI também são validados contra a
 * API do provedor selecionado antes de serem persistidos.
 */
async function validateProviderCredential(
  provider: AiProvider,
  apiKey: string,
): Promise<string | null> {
  if (provider === "claude") {
    // A Anthropic não oferece uma consulta de credencial sem geração para
    // chaves comuns. Mantemos a proteção por formato e a API confirma a
    // credencial na primeira operação, sem fallback silencioso.
    return null;
  }

  const request =
    provider === "gemini"
      ? fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", {
          headers: { "x-goog-api-key": apiKey },
          signal: AbortSignal.timeout(10_000),
        })
      : fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10_000),
        });

  try {
    const response = await request;
    if (response.ok) return null;
    if (response.status === 401 || response.status === 403) {
      return `A chave não foi aceita pela API ${provider === "gemini" ? "Gemini" : "OpenAI"}. Selecione o provedor correto ou confira a chave.`;
    }
    return `Não foi possível validar a chave na API ${provider === "gemini" ? "Gemini" : "OpenAI"} agora. Nenhuma alteração foi salva; tente novamente.`;
  } catch {
    return `Não foi possível validar a chave na API ${provider === "gemini" ? "Gemini" : "OpenAI"} agora. Nenhuma alteração foi salva; tente novamente.`;
  }
}

/**
 * Configuração de IA por organização: cada conta usa a própria chave
 * (Claude, OpenAI ou Gemini) — não existe chave padrão compartilhada do
 * servidor. Sem chave própria, os providers de IA degradam pro noop
 * (resultado determinístico, sem IA de verdade).
 */
export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/settings/ai", async (req) => {
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: { aiProvider: true, aiApiKeyEncrypted: true },
    });

    if (!org?.aiProvider || !org.aiApiKeyEncrypted) {
      return { configured: false, provider: null, maskedKey: null };
    }

    let maskedKey: string | null = null;
    try {
      maskedKey = maskSecret(decryptSecret(org.aiApiKeyEncrypted));
    } catch {
      maskedKey = "••••";
    }

    return { configured: true, provider: org.aiProvider, maskedKey };
  });

  app.put("/settings/ai", async (req, reply) => {
    const body = saveSchema.parse(req.body);
    const mismatch = providerKeyMismatch(body.provider, body.apiKey);
    if (mismatch) {
      return reply.status(400).send({
        statusCode: 400,
        error: "ProviderKeyMismatch",
        message: mismatch,
      });
    }
    const credentialError = await validateProviderCredential(
      body.provider,
      body.apiKey,
    );
    if (credentialError) {
      return reply.status(422).send({
        statusCode: 422,
        error: "ProviderCredentialInvalid",
        message: credentialError,
      });
    }
    await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: {
        aiProvider: body.provider,
        aiApiKeyEncrypted: encryptSecret(body.apiKey),
      },
    });
    return reply.status(204).send();
  });

  app.delete("/settings/ai", async (req, reply) => {
    await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: { aiProvider: null, aiApiKeyEncrypted: null },
    });
    return reply.status(204).send();
  });

  // ---- E-mail (Resend) — usado só pelo resumo dos agendamentos do Guardian ----

  const emailSaveSchema = z.object({
    apiKey: z.string().min(10),
    fromAddress: z.string().email(),
  });

  app.get("/settings/email", async (req) => {
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: { emailProvider: true, emailApiKeyEncrypted: true, emailFromAddress: true },
    });
    if (!org?.emailProvider || !org.emailApiKeyEncrypted) {
      return { configured: false, provider: null, maskedKey: null, fromAddress: null };
    }
    let maskedKey: string | null = null;
    try {
      maskedKey = maskSecret(decryptSecret(org.emailApiKeyEncrypted));
    } catch {
      maskedKey = "••••";
    }
    return {
      configured: true,
      provider: org.emailProvider,
      maskedKey,
      fromAddress: org.emailFromAddress,
    };
  });

  app.put("/settings/email", async (req, reply) => {
    const body = emailSaveSchema.parse(req.body);
    await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: {
        emailProvider: "resend",
        emailApiKeyEncrypted: encryptSecret(body.apiKey),
        emailFromAddress: body.fromAddress,
      },
    });
    return reply.status(204).send();
  });

  app.delete("/settings/email", async (req, reply) => {
    await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: { emailProvider: null, emailApiKeyEncrypted: null, emailFromAddress: null },
    });
    return reply.status(204).send();
  });
}
