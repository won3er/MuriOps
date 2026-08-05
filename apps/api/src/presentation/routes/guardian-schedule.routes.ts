import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { guardianScheduleService } from "../../application/guardian-schedule.service.js";
import { InvalidGuardianInputError } from "../../application/guardian.service.js";
import { NotFoundError } from "../../application/analysis.service.js";

const createScheduleSchema = z.object({
  name: z.string().min(1).optional(),
  projectId: z.string().min(1).optional().nullable(),
  rulesetId: z.string().min(1).optional().nullable(),
  driveFileId: z.string().min(1),
  driveFileName: z.string().min(1),
  hourUtc: z.number().int().min(0).max(23),
  recipientEmail: z.string().email().optional().nullable(),
});

const updateScheduleSchema = z.object({
  active: z.boolean().optional(),
  hourUtc: z.number().int().min(0).max(23).optional(),
  recipientEmail: z.string().email().optional().nullable(),
  rulesetId: z.string().min(1).optional().nullable(),
});

export async function guardianScheduleRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/guardian/schedules", async (req) => {
    return guardianScheduleService.list(req.user.organizationId);
  });

  app.post("/guardian/schedules", async (req, reply) => {
    const body = createScheduleSchema.parse(req.body);
    try {
      const schedule = await guardianScheduleService.create(
        req.user.organizationId,
        req.user.sub,
        body,
      );
      return reply.status(201).send(schedule);
    } catch (err) {
      if (err instanceof InvalidGuardianInputError)
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

  app.patch("/guardian/schedules/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = updateScheduleSchema.parse(req.body);
    try {
      return await guardianScheduleService.update(req.user.organizationId, id, body);
    } catch (err) {
      if (err instanceof InvalidGuardianInputError)
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

  app.delete("/guardian/schedules/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      await guardianScheduleService.remove(req.user.organizationId, id);
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
