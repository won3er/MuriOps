import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { decryptSecret } from "../../infrastructure/crypto/secret-box.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { prReviewService } from "../../application/pr-review.service.js";

interface GithubPullRequestPayload {
  action?: string;
  pull_request?: { number?: number; html_url?: string; merged?: boolean };
}

/** Ações de PR que justificam rodar o PR Security Review de novo — abertura e cada novo commit (synchronize). */
const REVIEWABLE_PR_ACTIONS = new Set(["opened", "synchronize", "reopened"]);

function verifySignature(secret: string, rawBody: Buffer, header?: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(header.slice("sha256=".length), "hex");
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Recebe eventos do GitHub e do GitLab (adapter push/observe, Fase 2). Sem
 * login — autenticado por segredo por conexão: assinatura HMAC
 * (`X-Hub-Signature-256`) no GitHub, token cru (`X-Gitlab-Token`) no GitLab
 * (padrão de cada provedor). [10/08/2026] Além de servir de base pra eventos
 * futuros, hoje já aciona de verdade o PR Security Reviews automático:
 * PR/MR aberta ou atualizada dispara um scan dos arquivos alterados
 * (pr-review-scan.ts) e um comentário com os achados (ver pr-review.service.ts).
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

    // [10/08/2026] PR Security Reviews automático: dispara o scan+comentário
    // em background (não aguarda aqui) pra responder dentro do timeout de
    // entrega de webhook do GitHub (~10s) — um scan de PR grande pode levar
    // mais que isso. Erro vira só log; não há como propagar depois do 202.
    const payload = req.body as GithubPullRequestPayload;
    const prNumber = payload.pull_request?.number;
    if (payload.action && REVIEWABLE_PR_ACTIONS.has(payload.action) && prNumber) {
      void prReviewService
        .reviewGithubPullRequest(connectionId, prNumber)
        .catch((err) => req.log.error({ err, connectionId, prNumber }, "PR Security Review (GitHub) falhou"));
    }

    return reply.status(202).send({ ok: true });
  });

  /**
   * Recebe eventos do GitLab. Diferente do GitHub (assinatura HMAC), o GitLab
   * autentica webhook por um token compartilhado enviado cru no header
   * `X-Gitlab-Token` — sem corpo assinado, por isso não precisa do parser de
   * corpo cru especial usado acima.
   */
  app.post("/webhooks/gitlab/:connectionId", async (req, reply) => {
    const { connectionId } = z
      .object({ connectionId: z.string() })
      .parse(req.params);

    const connection = await prisma.adapterConnection.findUnique({
      where: { id: connectionId },
    });
    if (!connection || connection.kind !== "GITLAB" || !connection.webhookSecretEncrypted) {
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Conexão GitLab não encontrada.",
      });
    }

    const secret = decryptSecret(connection.webhookSecretEncrypted);
    const provided = req.headers["x-gitlab-token"] as string | undefined;
    const secretBuf = Buffer.from(secret);
    const providedBuf = Buffer.from(provided ?? "");
    const valid =
      secretBuf.length === providedBuf.length && timingSafeEqual(secretBuf, providedBuf);
    if (!valid) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Token do webhook inválido.",
      });
    }

    const payload = req.body as {
      object_kind?: string;
      object_attributes?: { action?: string; iid?: number };
    };

    if (
      payload.object_kind === "merge_request" &&
      payload.object_attributes?.action &&
      REVIEWABLE_PR_ACTIONS_GITLAB.has(payload.object_attributes.action) &&
      payload.object_attributes.iid
    ) {
      const mrIid = payload.object_attributes.iid;
      void prReviewService
        .reviewGitlabMergeRequest(connectionId, mrIid)
        .catch((err) => req.log.error({ err, connectionId, mrIid }, "PR Security Review (GitLab) falhou"));
    }

    return reply.status(202).send({ ok: true });
  });
}

/** GitLab usa "open"/"update"/"reopen" (sem -ed) — nomenclatura própria, diferente do GitHub. */
const REVIEWABLE_PR_ACTIONS_GITLAB = new Set(["open", "update", "reopen"]);
