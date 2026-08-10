import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { decryptSecret } from "../../infrastructure/crypto/secret-box.js";
import { prisma } from "../../infrastructure/database/prisma.js";

interface GithubPullRequestPayload {
  action?: string;
  pull_request?: { number?: number; html_url?: string; merged?: boolean };
}

function verifySignature(secret: string, rawBody: Buffer, header?: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(header.slice("sha256=".length), "hex");
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Recebe eventos do GitHub (adapter push/observe, Fase 2). Sem login —
 * autenticado por assinatura HMAC (`X-Hub-Signature-256`) com o segredo por
 * conexão, mesmo espírito de segurança dos tokens de ponte, mas verificado
 * por assinatura em vez de posse de string na URL (padrão do próprio GitHub).
 */
export async function githubWebhookRoutes(app: FastifyInstance): Promise<void> {
  // Content-type parser próprio, escopado só a este plugin (Fastify isola por
  // contexto): precisamos do corpo cru pra verificar a assinatura HMAC antes
  // de confiar no JSON já parseado.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      (req as FastifyRequest & { rawBody?: Buffer }).rawBody = body as Buffer;
      try {
        const text = (body as Buffer).toString("utf8");
        done(null, text.length ? JSON.parse(text) : {});
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  app.post("/webhooks/github/:connectionId", async (req, reply) => {
    const { connectionId } = z
      .object({ connectionId: z.string() })
      .parse(req.params);

    const connection = await prisma.adapterConnection.findUnique({
      where: { id: connectionId },
    });
    if (!connection || connection.kind !== "GITHUB" || !connection.webhookSecretEncrypted) {
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Conexão GitHub não encontrada.",
      });
    }

    const secret = decryptSecret(connection.webhookSecretEncrypted);
    const raw = (req as FastifyRequest & { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0);
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    if (!verifySignature(secret, raw, signature)) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Assinatura do webhook inválida.",
      });
    }

    // [09/08/2026] O `onObservation` daqui alimentava o ciclo autônomo de
    // Orquestração (removido — ver CLAUDE.md); o webhook em si (validação de
    // assinatura + recebimento do evento de PR merged) foi mantido porque
    // pode servir de base pra um evento futuro, mas hoje não aciona nada.
    return reply.status(202).send({ ok: true });
  });
}
