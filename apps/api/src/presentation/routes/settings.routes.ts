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
}
