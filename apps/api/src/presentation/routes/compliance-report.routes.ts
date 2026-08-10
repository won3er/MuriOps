import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { complianceReportService } from "../../application/compliance-report.service.js";
import { NotFoundError } from "../../application/analysis.service.js";

export async function complianceReportRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/projects/:id/compliance-report", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      return await complianceReportService.generate(req.user.organizationId, id);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply.status(404).send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });
}
