import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  analysisScheduleService,
  InvalidScheduleInputError,
} from "../../application/analysis-schedule.service.js";
import { NotFoundError } from "../../application/analysis.service.js";

const categorySchema = z.enum(["DEEP_SECURITY", "SOURCE_SECURITY_SCAN"]);

const createSchema = z.object({
  categories: z.array(categorySchema).min(1),
  frequency: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
});

const updateSchema = z.object({
  categories: z.array(categorySchema).min(1).optional(),
  frequency: z.enum(["DAILY", "WEEKLY"]).optional(),
  active: z.boolean().optional(),
});

/**
 * Agendamento de Análise de Segurança ("Continuous Coverage" passivo).
 * Mesmo padrão de rotas de Fluxos Críticos: listagem/criação aninhada em
 * /projects/:projectId, manipulação por id solta.
 */
export async function analysisScheduleRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/projects/:projectId/analysis-schedules", async (req, reply) => {
    const { projectId } = z.object({ projectId: z.string() }).parse(req.params);
    try {
      return await analysisScheduleService.list(req.user.organizationId, projectId);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.post("/projects/:projectId/analysis-schedules", async (req, reply) => {
    const { projectId } = z.object({ projectId: z.string() }).parse(req.params);
    const body = createSchema.parse(req.body);
    try {
      const schedule = await analysisScheduleService.create(
        req.user.organizationId,
        req.user.sub,
        projectId,
        body,
      );
      return reply.status(201).send(schedule);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      if (err instanceof InvalidScheduleInputError)
        return reply.status(400).send({ statusCode: 400, error: "InvalidScheduleInput", message: err.message });
      throw err;
    }
  });

  app.patch("/analysis-schedules/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = updateSchema.parse(req.body);
    try {
      return await analysisScheduleService.update(req.user.organizationId, id, body);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      if (err instanceof InvalidScheduleInputError)
        return reply.status(400).send({ statusCode: 400, error: "InvalidScheduleInput", message: err.message });
      throw err;
    }
  });

  app.delete("/analysis-schedules/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      await analysisScheduleService.remove(req.user.organizationId, id);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });
}
