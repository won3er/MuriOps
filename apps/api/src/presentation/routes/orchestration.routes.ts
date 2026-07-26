import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../../application/analysis.service.js";
import { ConflictError, orchestrationService } from "../../application/orchestration.service.js";

const createSchema = z.object({
  maxIterations: z.number().int().min(1).max(20).optional(),
  adapterConnectionId: z.string().optional(),
});

/**
 * Execuções do orquestrador (núcleo QA-only): analisa → avalia quality gates
 * → (Fase 3: gera plano → aplica → reanalisa) → repete até passar ou parar.
 */
export async function orchestrationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.post("/projects/:id/orchestration-runs", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = createSchema.parse(req.body ?? {});
    try {
      const run = await orchestrationService.create(
        req.user.organizationId,
        id,
        body,
      );
      // 202: aceito e avançando em background; o cliente acompanha por polling.
      return reply.status(202).send(run);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.get("/projects/:id/orchestration-runs", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return orchestrationService.list(req.user.organizationId, id);
  });

  app.get("/orchestration-runs/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const run = await orchestrationService.getById(req.user.organizationId, id);
    if (!run)
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Execução não encontrada",
      });
    return run;
  });

  app.get("/orchestration-runs/:id/events", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      return await orchestrationService.listEvents(req.user.organizationId, id);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  // Aprovação humana (autonomia MANUAL): retoma um run parado em AWAITING_APPLY.
  app.post("/orchestration-runs/:id/approve", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      return await orchestrationService.approve(req.user.organizationId, id);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      if (err instanceof ConflictError)
        return reply
          .status(409)
          .send({ statusCode: 409, error: "Conflict", message: err.message });
      throw err;
    }
  });

  app.post("/orchestration-runs/:id/cancel", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      return await orchestrationService.cancel(req.user.organizationId, id);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      if (err instanceof ConflictError)
        return reply
          .status(409)
          .send({ statusCode: 409, error: "Conflict", message: err.message });
      throw err;
    }
  });
}
