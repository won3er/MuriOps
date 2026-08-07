import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../../application/analysis.service.js";
import { NoGithubConnectionError, projectionService } from "../../application/projection.service.js";

const createTaskSchema = z.object({
  title: z.string().min(2),
  description: z.string().default(""),
});

const generateSchema = z.object({
  createIssuesNow: z.boolean().optional().default(false),
});

/**
 * Projeção — tarefas rastreáveis geradas a partir de um plano de Aplicação
 * (RemediationPlan, vindo de Análise ou Atualizar), com sync pra GitHub.
 * Rotas aninhadas em /remediation-plans/:remediationPlanId/projection-tasks
 * porque toda tarefa pertence a exatamente um plano.
 * [06/08/2026] Antes vivia sob /blueprints/:blueprintId — ver CLAUDE.md.
 */
export async function projectionRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/remediation-plans/:remediationPlanId/projection-tasks", async (req, reply) => {
    const { remediationPlanId } = z.object({ remediationPlanId: z.string() }).parse(req.params);
    try {
      return await projectionService.listByPlan(req.user.organizationId, remediationPlanId);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.post("/remediation-plans/:remediationPlanId/projection-tasks", async (req, reply) => {
    const { remediationPlanId } = z.object({ remediationPlanId: z.string() }).parse(req.params);
    const body = createTaskSchema.parse(req.body);
    try {
      const task = await projectionService.createTask(
        req.user.organizationId,
        req.user.sub,
        remediationPlanId,
        body,
      );
      return reply.status(201).send(task);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  // Gera tarefas a partir dos itens do plano de Aplicação já gerado.
  app.post("/remediation-plans/:remediationPlanId/projection-tasks/generate", async (req, reply) => {
    const { remediationPlanId } = z.object({ remediationPlanId: z.string() }).parse(req.params);
    const body = generateSchema.parse(req.body ?? {});
    try {
      const tasks = await projectionService.generateFromPlan(
        req.user.organizationId,
        req.user.sub,
        remediationPlanId,
        body.createIssuesNow,
      );
      return reply.status(201).send(tasks);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.post("/projection-tasks/:id/create-issue", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      return await projectionService.createIssue(req.user.organizationId, id);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      if (err instanceof NoGithubConnectionError)
        return reply
          .status(400)
          .send({ statusCode: 400, error: "NoGithubConnection", message: err.message });
      throw err;
    }
  });

  app.delete("/projection-tasks/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      await projectionService.deleteTask(req.user.organizationId, id);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });
}
