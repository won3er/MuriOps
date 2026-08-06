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
 * Projeção — tarefas rastreáveis geradas a partir de um Blueprint, com sync
 * pra GitHub. Rotas aninhadas em /blueprints/:blueprintId/projection-tasks
 * porque toda tarefa pertence a exatamente um blueprint.
 */
export async function projectionRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/blueprints/:blueprintId/projection-tasks", async (req, reply) => {
    const { blueprintId } = z.object({ blueprintId: z.string() }).parse(req.params);
    try {
      return await projectionService.listByBlueprint(req.user.organizationId, blueprintId);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.post("/blueprints/:blueprintId/projection-tasks", async (req, reply) => {
    const { blueprintId } = z.object({ blueprintId: z.string() }).parse(req.params);
    const body = createTaskSchema.parse(req.body);
    try {
      const task = await projectionService.createTask(
        req.user.organizationId,
        req.user.sub,
        blueprintId,
        body,
      );
      return reply.status(201).send(task);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  // Gera tarefas a partir dos marcos (milestones) do blueprint já gerado.
  app.post("/blueprints/:blueprintId/projection-tasks/generate", async (req, reply) => {
    const { blueprintId } = z.object({ blueprintId: z.string() }).parse(req.params);
    const body = generateSchema.parse(req.body ?? {});
    try {
      const tasks = await projectionService.generateFromMilestones(
        req.user.organizationId,
        req.user.sub,
        blueprintId,
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
