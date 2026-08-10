import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  adapterConnectionService,
  InvalidGithubConnectionError,
  InvalidGitlabConnectionError,
} from "../../application/adapter-connection.service.js";
import {
  analysisService,
  NotFoundError,
} from "../../application/analysis.service.js";
import { projectService } from "../../application/project.service.js";
import { qualityGateService } from "../../application/quality-gate.service.js";
import { remediationService } from "../../application/remediation.service.js";
import { env } from "../../config/env.js";

const createSchema = z.object({
  name: z.string().min(2),
  url: z.string().min(3),
  description: z.string().optional(),
});

const updateActiveTestingConsentSchema = z.object({
  consent: z.boolean(),
});

const githubConnectionSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  token: z.string().min(10),
});

const gitlabConnectionSchema = z.object({
  projectPath: z.string().min(1),
  token: z.string().min(10),
});

const createGateSchema = z.object({
  category: z
    .enum(["UI", "UX", "PERFORMANCE", "SEO", "ACCESSIBILITY", "SECURITY", "CONSOLE", "NETWORK", "DEEP_SECURITY", "ACTIVE_SECURITY_TEST", "SOURCE_SECURITY_SCAN"])
    .nullable()
    .optional(),
  minScore: z.number().int().min(0).max(100),
  label: z.string().optional(),
});

/** URL pública da API — usada pra montar o link `mcpUrl` completo. */
function apiBaseUrl(req: { headers: Record<string, unknown>; protocol: string }): string {
  if (env.PUBLIC_API_URL) return env.PUBLIC_API_URL;
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol;
  return `${proto}://${req.headers.host ?? "localhost"}`;
}

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/projects", async (req) => {
    return projectService.list(req.user.organizationId);
  });

  app.post("/projects", async (req, reply) => {
    const body = createSchema.parse(req.body);
    const project = await projectService.create(
      req.user.organizationId,
      req.user.sub,
      body,
    );
    return reply.status(201).send(project);
  });

  app.get("/projects/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const project = await projectService.getById(req.user.organizationId, id);
    if (!project)
      return reply
        .status(404)
        .send({ statusCode: 404, error: "NotFound", message: "Projeto não encontrado" });
    return project;
  });

  app.get("/projects/:id/analyses", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return analysisService.listByProject(req.user.organizationId, id);
  });

  // Aplicações (pilar Aplicação) geradas a partir de análises deste projeto.
  app.get("/projects/:id/remediation-plans", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return remediationService.list(req.user.organizationId, id);
  });

  // Conexão MCP deste projeto (Fase 1 — segundo adapter pull, além da ponte manual).
  app.post("/projects/:id/mcp-connection", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      const connection = await adapterConnectionService.ensureMcpConnection(
        req.user.organizationId,
        id,
        req.user.sub,
      );
      return reply.status(201).send({
        ...connection,
        mcpUrl: `${apiBaseUrl(req)}/mcp/${connection.bridgeToken}`,
      });
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.get("/projects/:id/mcp-connection", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const connection = await adapterConnectionService.getByProjectAndKind(
      req.user.organizationId,
      id,
      "MCP",
    );
    if (!connection) return { configured: false };
    return {
      ...connection,
      mcpUrl: `${apiBaseUrl(req)}/mcp/${connection.bridgeToken}`,
    };
  });

  app.post("/projects/:id/mcp-connection/regenerate", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      const connection = await adapterConnectionService.regenerateMcpToken(
        req.user.organizationId,
        id,
      );
      return {
        ...connection,
        mcpUrl: `${apiBaseUrl(req)}/mcp/${connection.bridgeToken}`,
      };
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  // Desconecta a conexão MCP — permite reconfigurar do zero depois.
  app.delete("/projects/:id/mcp-connection", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      await adapterConnectionService.disconnectMcp(req.user.organizationId, id);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  // Conexão GitHub deste projeto (Fase 2 — primeiro adapter push).
  app.post("/projects/:id/github-connection", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = githubConnectionSchema.parse(req.body);
    try {
      const connection = await adapterConnectionService.upsertGithubConnection(
        req.user.organizationId,
        id,
        req.user.sub,
        body,
      );
      return reply.status(201).send({
        ...connection,
        webhookUrl: `${apiBaseUrl(req)}${connection.webhookUrl}`,
      });
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      if (err instanceof InvalidGithubConnectionError)
        return reply
          .status(400)
          .send({ statusCode: 400, error: "GitHubConnection", message: err.message });
      throw err;
    }
  });

  app.get("/projects/:id/github-connection", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const connection = await adapterConnectionService.getGithubConnectionMasked(
      req.user.organizationId,
      id,
    );
    if (!connection) return { configured: false };
    return {
      ...connection,
      webhookUrl: `${apiBaseUrl(req)}/webhooks/github/${connection.id}`,
    };
  });

  // Conexão GitLab deste projeto — mesmo padrão push do GitHub (token colado).
  app.post("/projects/:id/gitlab-connection", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = gitlabConnectionSchema.parse(req.body);
    try {
      const connection = await adapterConnectionService.upsertGitlabConnection(
        req.user.organizationId,
        id,
        req.user.sub,
        body,
      );
      return reply.status(201).send({
        ...connection,
        webhookUrl: `${apiBaseUrl(req)}${connection.webhookUrl}`,
      });
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      if (err instanceof InvalidGitlabConnectionError)
        return reply
          .status(400)
          .send({ statusCode: 400, error: "GitLabConnection", message: err.message });
      throw err;
    }
  });

  app.get("/projects/:id/gitlab-connection", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const connection = await adapterConnectionService.getGitlabConnectionMasked(
      req.user.organizationId,
      id,
    );
    if (!connection) return { configured: false };
    return {
      ...connection,
      webhookUrl: connection.webhookUrl ? `${apiBaseUrl(req)}${connection.webhookUrl}` : null,
    };
  });

  // Lista todas as conexões do projeto — seletor de "qual conexão usar" na Orquestração.
  app.get("/projects/:id/adapter-connections", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return adapterConnectionService.listByProject(req.user.organizationId, id);
  });

  // Quality gates do orquestrador (Fase 3) — critério numérico avaliado a cada iteração.
  app.get("/projects/:id/quality-gates", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      return await qualityGateService.list(req.user.organizationId, id);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.post("/projects/:id/quality-gates", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = createGateSchema.parse(req.body);
    try {
      const gate = await qualityGateService.create(req.user.organizationId, id, {
        category: body.category ?? null,
        minScore: body.minScore,
        label: body.label,
      });
      return reply.status(201).send(gate);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.delete("/projects/:id/quality-gates/:gateId", async (req, reply) => {
    const { id, gateId } = z
      .object({ id: z.string(), gateId: z.string() })
      .parse(req.params);
    try {
      await qualityGateService.remove(req.user.organizationId, id, gateId);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  // Consentimento de Teste Ativo Autorizado (Análise de Segurança, opt-in) —
  // sem isso marcado, a categoria ACTIVE_SECURITY_TEST nunca roda pra este
  // projeto (gate de verdade em analysis.service.ts).
  app.patch("/projects/:id/active-testing-consent", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { consent } = updateActiveTestingConsentSchema.parse(req.body);
    try {
      return await projectService.updateActiveTestingConsent(
        req.user.organizationId,
        id,
        req.user.sub,
        consent,
      );
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  // Apaga o projeto e todas as análises/problemas/evidências relacionados.
  app.delete("/projects/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      await projectService.remove(req.user.organizationId, id);
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
