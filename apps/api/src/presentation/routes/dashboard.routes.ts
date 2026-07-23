import type { FastifyInstance } from "fastify";
import { analysisService } from "../../application/analysis.service.js";

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/dashboard/stats", async (req) => {
    return analysisService.dashboard(req.user.organizationId);
  });
}
