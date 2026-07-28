import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../../application/analysis.service.js";
import { InvalidPackageJsonError, upgradeService } from "../../application/upgrade.service.js";
import { env } from "../../config/env.js";
import { buildUpgradeBridgeMarkdown } from "../../infrastructure/bridge/upgrade-bridge.js";
import { generateUpgradeReportPdf } from "../../infrastructure/pdf/upgrade-report.js";

const providerSchema = z.enum(["claude", "openai", "gemini"]);

const ecosystemSchema = z.enum([
  "npm",
  "pip",
  "poetry",
  "bundler",
  "maven",
  "gradle",
  "go",
  "nuget",
  "composer",
  "cargo",
  "legacy",
  "unknown",
]);

const createSchema = z
  .object({
    projectId: z.string().min(1).optional().nullable(),
    title: z.string().min(1).optional(),
    /** Manifesto de qualquer ecossistema suportado. */
    manifest: z.string().min(1).optional(),
    /** Alias legado — o cliente anterior ao multi-linguagem só mandava este. */
    packageJson: z.string().min(1).optional(),
    fileName: z.string().min(1).optional().nullable(),
    ecosystem: ecosystemSchema.optional(),
    provider: providerSchema.optional(),
  })
  .refine((b) => Boolean(b.manifest ?? b.packageJson), {
    message: "Envie o conteúdo do manifesto de dependências",
    path: ["manifest"],
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

export async function upgradeRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // Lista todas as Atualizações da organização (página principal da seção).
  app.get("/upgrade-plans", async (req) => {
    return upgradeService.list(req.user.organizationId);
  });

  app.post("/upgrade-plans", async (req, reply) => {
    const body = createSchema.parse(req.body);
    try {
      const plan = await upgradeService.create(req.user.organizationId, req.user.sub, body);
      // 202: aceito e sendo gerado em background; o cliente acompanha por polling.
      return reply.status(202).send(plan);
    } catch (err) {
      if (err instanceof InvalidPackageJsonError)
        return reply
          .status(400)
          .send({ statusCode: 400, error: "ValidationError", message: err.message });
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.get("/upgrade-plans/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const plan = await upgradeService.getById(req.user.organizationId, id);
    if (!plan)
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Atualização não encontrada",
      });
    return plan;
  });

  // Relatório em PDF do plano de atualização.
  app.get("/upgrade-plans/:id/report.pdf", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const plan = await upgradeService.getById(req.user.organizationId, id);
    if (!plan)
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Atualização não encontrada",
      });

    reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="atualizacao-${plan.id}.pdf"`);
    const doc = generateUpgradeReportPdf(plan);
    return reply.send(doc);
  });

  app.patch("/upgrade-plans/:id/items/:itemId", async (req, reply) => {
    const { id, itemId } = z
      .object({ id: z.string(), itemId: z.string() })
      .parse(req.params);
    const { status } = itemStatusSchema.parse(req.body);
    try {
      return await upgradeService.updateItemStatus(req.user.organizationId, id, itemId, status);
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
  app.get("/upgrade-plans/:id/bridge.md", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const plan = await upgradeService.getById(req.user.organizationId, id);
    if (!plan)
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Atualização não encontrada",
      });
    if (plan.status !== "READY")
      return reply.status(409).send({
        statusCode: 409,
        error: "Conflict",
        message: "O plano ainda não está pronto",
      });

    const md = buildUpgradeBridgeMarkdown(plan, apiBaseUrl(req));
    return reply
      .header("Content-Type", "text/markdown; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="atualizacao-${plan.id}.md"`)
      .send(md);
  });

  app.delete("/upgrade-plans/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      await upgradeService.remove(req.user.organizationId, id);
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
 * de desenvolvimento consulta o plano de atualização e marca itens como "Feito".
 */
export async function upgradeBridgeRoutes(app: FastifyInstance): Promise<void> {
  // Estado atual do plano (título, resumo, risco e itens com status).
  app.get("/apply-upgrade/:token", async (req, reply) => {
    const { token } = z.object({ token: z.string().min(10) }).parse(req.params);
    const plan = await upgradeService.getByToken(token);
    if (!plan)
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Plano não encontrado — confira o token",
      });
    return {
      title: plan.title,
      status: plan.status,
      summary: plan.result?.summary ?? null,
      overallRisk: plan.result?.overallRisk ?? null,
      recommendedOrder: plan.result?.recommendedOrder ?? [],
      items: (plan.result?.items ?? []).map((it) => ({
        id: it.id,
        packageName: it.packageName,
        currentVersion: it.currentVersion,
        targetVersion: it.targetVersion,
        riskLevel: it.riskLevel,
        breakingChanges: it.breakingChanges,
        migrationSteps: it.migrationSteps,
        filePath: it.filePath,
        status: it.status,
      })),
    };
  });

  // Marca um item como feito/pendente — usado pela IA conforme migra cada dependência.
  app.patch("/apply-upgrade/:token/items/:itemId", async (req, reply) => {
    const { token, itemId } = z
      .object({ token: z.string().min(10), itemId: z.string().min(1) })
      .parse(req.params);
    const { status } = itemStatusSchema.parse(req.body);
    try {
      const plan = await upgradeService.updateItemStatusByToken(token, itemId, status);
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
