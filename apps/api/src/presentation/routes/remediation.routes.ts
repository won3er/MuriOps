import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../../application/analysis.service.js";
import { remediationService } from "../../application/remediation.service.js";
import { generateRemediationReportPdf } from "../../infrastructure/pdf/remediation-report.js";

const providerSchema = z.enum(["claude", "openai", "gemini"]);

const createSchema = z.object({
  sourceType: z.enum(["analysis", "blueprint"]),
  sourceId: z.string().min(1),
  provider: providerSchema.optional(),
});

const itemStatusSchema = z.object({
  status: z.enum(["pending", "done"]),
});

export async function remediationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.post("/remediation-plans", async (req, reply) => {
    const body = createSchema.parse(req.body);
    try {
      const plan = await remediationService.create(
        req.user.organizationId,
        req.user.sub,
        body,
      );
      // 202: aceito e sendo gerado em background; o cliente acompanha por polling.
      return reply.status(202).send(plan);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.get("/remediation-plans/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const plan = await remediationService.getById(req.user.organizationId, id);
    if (!plan)
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Aplicação não encontrada",
      });
    return plan;
  });

  // Relatório em PDF do plano de aplicação (checklist de mudanças).
  app.get("/remediation-plans/:id/report.pdf", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const plan = await remediationService.getById(req.user.organizationId, id);
    if (!plan)
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Aplicação não encontrada",
      });

    reply
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        `attachment; filename="aplicacao-${plan.id}.pdf"`,
      );
    const doc = generateRemediationReportPdf(plan);
    return reply.send(doc);
  });

  app.patch("/remediation-plans/:id/items/:itemId", async (req, reply) => {
    const { id, itemId } = z
      .object({ id: z.string(), itemId: z.string() })
      .parse(req.params);
    const { status } = itemStatusSchema.parse(req.body);
    try {
      return await remediationService.updateItemStatus(
        req.user.organizationId,
        id,
        itemId,
        status,
      );
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.delete("/remediation-plans/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      await remediationService.remove(req.user.organizationId, id);
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
