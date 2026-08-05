import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../../application/analysis.service.js";
import {
  AiKeyRequiredError,
  guardianService,
  InvalidGuardianInputError,
  MAX_GUARDIAN_DOCUMENT_CHARACTERS,
} from "../../application/guardian.service.js";
import {
  DocumentExtractionError,
  extractTextFromBinary,
} from "../../infrastructure/documents/text-extractor.js";

const providerSchema = z.enum(["claude", "openai", "gemini"]);

const createRulesetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  rules: z.array(z.string()).min(1),
});

const createRunSchema = z.object({
  title: z.string().min(1).optional(),
  projectId: z.string().min(1).optional().nullable(),
  rulesetId: z.string().min(1).optional().nullable(),
  sourceName: z.string().max(250).optional(),
  documentText: z.string().min(1).max(MAX_GUARDIAN_DOCUMENT_CHARACTERS),
  provider: providerSchema.optional(),
});

const findingStatusSchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved", "ignored"]),
});

export async function guardianRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // ---- rulesets ----

  app.get("/guardian/rulesets", async (req) => {
    return guardianService.listRulesets(req.user.organizationId);
  });

  app.post("/guardian/rulesets", async (req, reply) => {
    const body = createRulesetSchema.parse(req.body);
    try {
      const ruleset = await guardianService.createRuleset(
        req.user.organizationId,
        req.user.sub,
        body,
      );
      return reply.status(201).send(ruleset);
    } catch (err) {
      if (err instanceof InvalidGuardianInputError)
        return reply
          .status(400)
          .send({ statusCode: 400, error: "ValidationError", message: err.message });
      throw err;
    }
  });

  app.get("/guardian/rulesets/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const ruleset = await guardianService.getRuleset(req.user.organizationId, id);
    if (!ruleset)
      return reply
        .status(404)
        .send({ statusCode: 404, error: "NotFound", message: "Conjunto de regras não encontrado" });
    return ruleset;
  });

  app.delete("/guardian/rulesets/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      await guardianService.deleteRuleset(req.user.organizationId, id);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  // ---- upload de arquivo (PDF/Excel) — extrai texto pro campo de auditoria ----

  app.post("/guardian/extract-text", async (req, reply) => {
    const file = await req.file();
    if (!file) {
      return reply
        .status(400)
        .send({ statusCode: 400, error: "ValidationError", message: "Envie um arquivo" });
    }
    const buffer = await file.toBuffer();
    try {
      const content = await extractTextFromBinary(buffer, file.mimetype, file.filename);
      if (content.length > MAX_GUARDIAN_DOCUMENT_CHARACTERS) {
        return reply.status(413).send({
          statusCode: 413,
          error: "TooLarge",
          message: `"${file.filename}" excede o limite de 200.000 caracteres. Envie uma parte do documento.`,
        });
      }
      return { name: file.filename, content };
    } catch (err) {
      if (err instanceof DocumentExtractionError) {
        return reply
          .status(err.statusCode)
          .send({ statusCode: err.statusCode, error: "ExtractionError", message: err.message });
      }
      throw err;
    }
  });

  // ---- runs (auditorias) ----

  app.get("/guardian/runs", async (req) => {
    const { projectId } = z
      .object({ projectId: z.string().optional() })
      .parse(req.query ?? {});
    return guardianService.listRuns(req.user.organizationId, projectId);
  });

  app.post("/guardian/runs", async (req, reply) => {
    const body = createRunSchema.parse(req.body);
    try {
      const run = await guardianService.createRun(req.user.organizationId, req.user.sub, body);
      return reply.status(202).send(run);
    } catch (err) {
      if (err instanceof AiKeyRequiredError)
        return reply
          .status(400)
          .send({ statusCode: 400, error: "AiKeyRequired", message: err.message });
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

  app.get("/guardian/runs/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const run = await guardianService.getRun(req.user.organizationId, id);
    if (!run)
      return reply
        .status(404)
        .send({ statusCode: 404, error: "NotFound", message: "Auditoria não encontrada" });
    return run;
  });

  app.post("/guardian/runs/:id/retry", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      const run = await guardianService.retryRun(req.user.organizationId, id);
      return reply.status(202).send(run);
    } catch (err) {
      if (err instanceof AiKeyRequiredError)
        return reply
          .status(400)
          .send({ statusCode: 400, error: "AiKeyRequired", message: err.message });
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

  app.patch("/guardian/runs/:id/findings/:findingId", async (req, reply) => {
    const { id, findingId } = z
      .object({ id: z.string(), findingId: z.string() })
      .parse(req.params);
    const body = findingStatusSchema.parse(req.body);
    try {
      return await guardianService.updateFindingStatus(
        req.user.organizationId,
        id,
        findingId,
        body,
      );
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.delete("/guardian/runs/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      await guardianService.deleteRun(req.user.organizationId, id);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  // ---- dashboard executivo ----

  app.get("/guardian/dashboard", async (req) => {
    return guardianService.dashboardStats(req.user.organizationId);
  });
}
