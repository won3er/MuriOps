import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../../application/analysis.service.js";
import {
  AiKeyRequiredError,
  blueprintService,
} from "../../application/blueprint.service.js";
import { generateBlueprintReportPdf } from "../../infrastructure/pdf/blueprint-report.js";

const providerSchema = z.enum(["claude", "openai", "gemini"]);

const formSchema = z.object({
  mode: z.literal("form"),
  form: z.object({
    objective: z.string().min(3),
    appType: z.string().min(1),
    features: z.array(z.string()).default([]),
    audience: z.string().default(""),
    scale: z.string().default(""),
    integrations: z.array(z.string()).default([]),
    constraints: z.string().default(""),
    compliance: z.array(z.string()).default([]),
  }),
});

const canvasSchema = z.object({
  mode: z.literal("canvas"),
  canvas: z.object({
    nodes: z
      .array(
        z.object({
          id: z.string(),
          type: z.string(),
          label: z.string(),
          x: z.number(),
          y: z.number(),
        }),
      )
      .min(1, "Adicione ao menos um componente ao canvas."),
    edges: z.array(
      z.object({
        id: z.string(),
        from: z.string(),
        to: z.string(),
        label: z.string().optional(),
      }),
    ),
    notes: z.string().optional(),
  }),
});

const promptSchema = z.object({
  mode: z.literal("prompt"),
  prompt: z.string().min(10, "Descreva o projeto com um pouco mais de detalhe."),
});

const createSchema = z.object({
  title: z.string().min(2),
  provider: providerSchema.optional(),
  projectId: z.string().optional(),
  input: z.discriminatedUnion("mode", [formSchema, canvasSchema, promptSchema]),
});

export async function blueprintRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/blueprints", async (req) => {
    return blueprintService.list(req.user.organizationId);
  });

  app.post("/blueprints", async (req, reply) => {
    const body = createSchema.parse(req.body);
    try {
      const blueprint = await blueprintService.create(
        req.user.organizationId,
        req.user.sub,
        body,
      );
      // 202: aceito e sendo gerado em background; o cliente acompanha por polling.
      return reply.status(202).send(blueprint);
    } catch (err) {
      if (err instanceof AiKeyRequiredError)
        return reply
          .status(400)
          .send({ statusCode: 400, error: "AiKeyRequired", message: err.message });
      throw err;
    }
  });

  app.get("/blueprints/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const blueprint = await blueprintService.getById(
      req.user.organizationId,
      id,
    );
    if (!blueprint)
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Blueprint não encontrado",
      });
    return blueprint;
  });

  // Relatório em PDF do blueprint (objetivos, stack, testes, riscos, roadmap).
  app.get("/blueprints/:id/report.pdf", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const blueprint = await blueprintService.getById(
      req.user.organizationId,
      id,
    );
    if (!blueprint)
      return reply.status(404).send({
        statusCode: 404,
        error: "NotFound",
        message: "Blueprint não encontrado",
      });

    reply
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        `attachment; filename="blueprint-${blueprint.id}.pdf"`,
      );
    const doc = generateBlueprintReportPdf(blueprint);
    return reply.send(doc);
  });

  app.post("/blueprints/:id/regenerate", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { provider } = z
      .object({ provider: providerSchema.optional() })
      .parse(req.body ?? {});
    try {
      return await blueprintService.regenerate(
        req.user.organizationId,
        id,
        provider,
      );
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      if (err instanceof AiKeyRequiredError)
        return reply
          .status(400)
          .send({ statusCode: 400, error: "AiKeyRequired", message: err.message });
      throw err;
    }
  });

  app.delete("/blueprints/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      await blueprintService.remove(req.user.organizationId, id);
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
