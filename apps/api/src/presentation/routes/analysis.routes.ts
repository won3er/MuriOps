import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  analysisService,
  NotFoundError,
} from "../../application/analysis.service.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { generateAnalysisReportPdf } from "../../infrastructure/pdf/report.js";

const startSchema = z.object({
  url: z.string().optional(),
  categories: z.array(z.string()).optional(),
  maxDepth: z.number().int().min(0).max(5).optional(),
  maxPages: z.number().int().min(1).max(200).optional(),
});

const filtersSchema = z.object({
  category: z.string().optional(),
  severity: z.string().optional(),
  status: z.string().optional(),
  pageUrl: z.string().optional(),
  search: z.string().optional(),
});

export async function analysisRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  const guard = async (
    reply: import("fastify").FastifyReply,
    fn: () => Promise<unknown>,
  ) => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  };

  // Hub "Análise": todas as análises da organização, qualquer projeto.
  app.get("/analyses", async (req) => {
    return analysisService.listAll(req.user.organizationId);
  });

  // Inicia uma nova análise em um projeto.
  app.post("/projects/:id/analyses", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = startSchema.parse(req.body ?? {});
    return guard(reply, async () => {
      const analysis = await analysisService.start(
        req.user.organizationId,
        id,
        body,
      );
      return reply.status(202).send(analysis);
    });
  });

  // Detalhe da análise (com problemas filtráveis).
  app.get("/analyses/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const filters = filtersSchema.parse(req.query ?? {});
    return guard(reply, () =>
      analysisService.detail(req.user.organizationId, id, filters),
    );
  });

  // Relatório em PDF (resumo, score e problemas reais — falsos positivos ficam de fora).
  app.get("/analyses/:id/report.pdf", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return guard(reply, async () => {
      const detail = await analysisService.detail(req.user.organizationId, id);
      const analysis = await prisma.analysis.findFirst({
        where: { id, project: { organizationId: req.user.organizationId } },
        include: { project: { select: { url: true, name: true } } },
      });
      if (!analysis) throw new NotFoundError("Análise não encontrada");

      reply
        .header("Content-Type", "application/pdf")
        .header(
          "Content-Disposition",
          `attachment; filename="relatorio-qa-ai-v${detail.version}.pdf"`,
        );

      const doc = generateAnalysisReportPdf(detail, analysis.project.url);
      return reply.send(doc);
    });
  });

  // Atualiza status de um problema (triagem).
  app.patch("/issues/:id/status", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { status } = z
      .object({
        status: z.enum(["OPEN", "ACKNOWLEDGED", "FIXED", "IGNORED"]),
      })
      .parse(req.body);
    return guard(reply, () =>
      analysisService.updateIssueStatus(req.user.organizationId, id, status),
    );
  });

  // Apaga uma análise (busca) e seus dados relacionados.
  app.delete("/analyses/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return guard(reply, async () => {
      await analysisService.remove(req.user.organizationId, id);
      return reply.status(204).send();
    });
  });

  // Comparação entre versões.
  app.get("/analyses/:from/compare/:to", async (req, reply) => {
    const { from, to } = z
      .object({ from: z.string(), to: z.string() })
      .parse(req.params);
    return guard(reply, () =>
      analysisService.compare(req.user.organizationId, from, to),
    );
  });
}
