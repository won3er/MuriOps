import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../../application/analysis.service.js";
import { reconciliationService } from "../../application/reconciliation.service.js";

/**
 * Reconciliação — substitui o antigo ciclo autônomo de Orquestração (ver
 * CLAUDE.md, 09/08/2026). Uma única rota de leitura, sem execução nem
 * estado próprio: compara a última Analysis concluída do projeto com as
 * Aplicações (RemediationPlan) geradas a partir dela.
 */
export async function reconciliationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/projects/:id/reconciliation", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      return await reconciliationService.getForProject(req.user.organizationId, id);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });
}
