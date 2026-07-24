import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../../application/analysis.service.js";
import { remediationService } from "../../application/remediation.service.js";
import { env } from "../../config/env.js";
import { buildRemediationBridgeMarkdown } from "../../infrastructure/bridge/remediation-bridge.js";
import { generateRemediationReportPdf } from "../../infrastructure/pdf/remediation-report.js";

const providerSchema = z.enum(["claude", "openai", "gemini"]);

const createSchema = z.object({
  sourceType: z.enum(["analysis", "blueprint", "project"]),
  sourceId: z.string().min(1),
  scope: z.enum(["qa", "security", "full"]).optional(),
  provider: providerSchema.optional(),
});

const itemStatusSchema = z.object({
  status: z.enum(["pending", "done"]),
});

/** URL pública da API para os comandos do pacote da ponte. */
function apiBaseUrl(req: FastifyRequest): string {
  if (env.PUBLIC_API_URL) return env.PUBLIC_API_URL;
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol;
  return `${proto}://${req.headers.host ?? "localhost"}`;
}

export async function remediationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // Lista todas as Aplicações da organização (página principal da seção).
  app.get("/remediation-plans", async (req) => {
    return remediationService.list(req.user.organizationId);
  });

  app.post("/remediation-plans", async (req, reply) => {
    const body = createSchema.parse(req.body);
    try {
      const plan = await remediationService.create(
        req.user.organizationId,
        req.user.sub,
        body,
      );
      // 202: aceito e sendo gerado em background; o cliente acompanha por polling.
      return reply.status(202).send(plan);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.get("/remediation-plans/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const plan = await remediationService.getById(req.user.organizationId, id);
    if (!plan)
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Aplicação não encontrada",
      });
    return plan;
  });

  // Relatório em PDF do plano de aplicação (checklist de mudanças).
  app.get("/remediation-plans/:id/report.pdf", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const plan = await remediationService.getById(req.user.organizationId, id);
    if (!plan)
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Aplicação não encontrada",
      });

    reply
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        `attachment; filename="aplicacao-${plan.id}.pdf"`,
      );
    const doc = generateRemediationReportPdf(plan);
    return reply.send(doc);
  });

  app.patch("/remediation-plans/:id/items/:itemId", async (req, reply) => {
    const { id, itemId } = z
      .object({ id: z.string(), itemId: z.string() })
      .parse(req.params);
    const { status } = itemStatusSchema.parse(req.body);
    try {
      return await remediationService.updateItemStatus(
        req.user.organizationId,
        id,
        itemId,
        status,
      );
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  // Pacote da ponte universal: markdown de instruções pra IA do ambiente
  // de dev (Claude Code, Windsurf, Codex...) com API de sincronização.
  app.get("/remediation-plans/:id/bridge.md", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const plan = await remediationService.getById(req.user.organizationId, id);
    if (!plan)
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Aplicação não encontrada",
      });
    if (plan.status !== "READY")
      return reply.status(409).send({
        statusCode: 409,
        error: "Conflict",
        message: "O plano ainda não está pronto",
      });

    const md = buildRemediationBridgeMarkdown(plan, apiBaseUrl(req));
    return reply
      .header("Content-Type", "text/markdown; charset=utf-8")
      .header(
        "Content-Disposition",
        `attachment; filename="aplicacao-${plan.id}.md"`,
      )
      .send(md);
  });

  app.delete("/remediation-plans/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      await remediationService.remove(req.user.organizationId, id);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });
}

/**
 * API pública da ponte universal — SEM login. Autenticada pelo token único
 * do plano (na URL), que só o dono conhece. É por aqui que a IA do ambiente
 * de desenvolvimento consulta o checklist e marca itens como "Feito".
 */
export async function remediationBridgeRoutes(
  app: FastifyInstance,
): Promise<void> {
  // Estado atual do plano (título, resumo e itens com status).
  app.get("/apply/:token", async (req, reply) => {
    const { token } = z.object({ token: z.string().min(10) }).parse(req.params);
    const plan = await remediationService.getByToken(token);
    if (!plan)
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Plano não encontrado — confira o token",
      });
    // Não vaza o token de volta nem ids internos além do necessário.
    return {
      title: plan.title,
      status: plan.status,
      summary: plan.result?.summary ?? null,
      items: (plan.result?.items ?? []).map((it) => ({
        id: it.id,
        title: it.title,
        category: it.category,
        severity: it.severity,
        filePath: it.filePath,
        description: it.description,
        howTo: it.howTo,
        status: it.status,
      })),
    };
  });

  // Marca um item como feito/pendente — usado pela IA conforme aplica.
  app.patch("/apply/:token/items/:itemId", async (req, reply) => {
    const { token, itemId } = z
      .object({ token: z.string().min(10), itemId: z.string().min(1) })
      .parse(req.params);
    const { status } = itemStatusSchema.parse(req.body);
    try {
      const plan = await remediationService.updateItemStatusByToken(
        token,
        itemId,
        status,
      );
      const items = plan.result?.items ?? [];
      return {
        ok: true,
        itemId,
        status,
        done: items.filter((i) => i.status === "done").length,
        total: items.length,
      };
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });
}
