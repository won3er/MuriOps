import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../../application/analysis.service.js";
import { criticalFlowService, InvalidFlowInputError } from "../../application/critical-flow.service.js";

const stepSchema = z.object({
  action: z.enum(["NAVIGATE", "CLICK", "FILL", "SELECT", "WAIT_FOR_SELECTOR", "ASSERT_TEXT", "ASSERT_URL"]),
  selector: z.string().optional(),
  value: z.string().optional(),
  expected: z.string().optional(),
  label: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(2),
  startUrl: z.string().url(),
  steps: z.array(stepSchema).min(1),
  frequency: z.enum(["EVERY_15_MIN", "EVERY_HOUR", "DAILY"]).default("EVERY_HOUR"),
  alertEmail: z.string().email().optional(),
  alertAfterConsecutiveFailures: z.number().int().min(1).optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  startUrl: z.string().url().optional(),
  steps: z.array(stepSchema).min(1).optional(),
  frequency: z.enum(["EVERY_15_MIN", "EVERY_HOUR", "DAILY"]).optional(),
  active: z.boolean().optional(),
  alertEmail: z.string().email().nullable().optional(),
  alertAfterConsecutiveFailures: z.number().int().min(1).optional(),
});

/**
 * Fluxos Críticos — monitoramento sintético de jornadas de negócio.
 * Rotas de listagem/criação aninhadas em /projects/:projectId (todo fluxo
 * pertence a um projeto); rotas de manipulação por id ficam soltas
 * (/critical-flows/:id), mesmo padrão de /projection-tasks/:id.
 */
export async function criticalFlowRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/projects/:projectId/critical-flows", async (req, reply) => {
    const { projectId } = z.object({ projectId: z.string() }).parse(req.params);
    try {
      return await criticalFlowService.list(req.user.organizationId, projectId);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.post("/projects/:projectId/critical-flows", async (req, reply) => {
    const { projectId } = z.object({ projectId: z.string() }).parse(req.params);
    const body = createSchema.parse(req.body);
    try {
      const flow = await criticalFlowService.create(req.user.organizationId, req.user.sub, projectId, body);
      return reply.status(201).send(flow);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      if (err instanceof InvalidFlowInputError)
        return reply.status(400).send({ statusCode: 400, error: "InvalidFlowInput", message: err.message });
      throw err;
    }
  });

  app.get("/critical-flows/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      return await criticalFlowService.get(req.user.organizationId, id);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.patch("/critical-flows/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = updateSchema.parse(req.body);
    try {
      return await criticalFlowService.update(req.user.organizationId, id, body);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      if (err instanceof InvalidFlowInputError)
        return reply.status(400).send({ statusCode: 400, error: "InvalidFlowInput", message: err.message });
      throw err;
    }
  });

  app.delete("/critical-flows/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      await criticalFlowService.remove(req.user.organizationId, id);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.get("/critical-flows/:id/runs", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      return await criticalFlowService.listRuns(req.user.organizationId, id);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.post("/critical-flows/:id/run-now", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      const run = await criticalFlowService.runNow(req.user.organizationId, id);
      return reply.status(201).send(run);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });
}
