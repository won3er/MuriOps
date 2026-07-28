import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { adapterConnectionService } from "../../application/adapter-connection.service.js";
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

const updateAutonomySchema = z.object({
  autonomyLevel: z.enum(["MANUAL", "SUPERVISED", "AUTONOMOUS"]),
});

const githubConnectionSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  token: z.string().min(10),
});

const wordpressConnectionSchema = z.object({
  siteUrl: z.string().url(),
  username: z.string().min(1),
  appPassword: z.string().min(8),
});

const shopifyConnectionSchema = z.object({
  shopDomain: z.string().min(3),
  accessToken: z.string().min(8),
});

const nuvemshopConnectionSchema = z.object({
  storeId: z.string().min(1),
  accessToken: z.string().min(8),
});

const ftpConnectionSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive().optional(),
  user: z.string().min(1),
  password: z.string().min(1),
  secure: z.boolean().optional(),
  remotePath: z.string().optional(),
});

const createGateSchema = z.object({
  category: z
    .enum(["UI", "UX", "PERFORMANCE", "SEO", "ACCESSIBILITY", "SECURITY", "CONSOLE", "NETWORK", "DEEP_SECURITY"])
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

  // Aplicações (pilar Aplicação) geradas a partir de análises/blueprints deste projeto.
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
    if (!connection) return reply.status(404).send({ configured: false });
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
      throw err;
    }
  });

  app.get("/projects/:id/github-connection", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const connection = await adapterConnectionService.getGithubConnectionMasked(
      req.user.organizationId,
      id,
    );
    if (!connection) return reply.status(404).send({ configured: false });
    return {
      ...connection,
      webhookUrl: `${apiBaseUrl(req)}/webhooks/github/${connection.id}`,
    };
  });

  // Conexões de plataforma (Fase 4 — apply real): WordPress, Shopify, Nuvemshop, FTP.
  app.post("/projects/:id/wordpress-connection", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = wordpressConnectionSchema.parse(req.body);
    try {
      const connection = await adapterConnectionService.upsertWordpressConnection(
        req.user.organizationId,
        id,
        req.user.sub,
        body,
      );
      return reply.status(201).send(connection);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.post("/projects/:id/shopify-connection", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = shopifyConnectionSchema.parse(req.body);
    try {
      const connection = await adapterConnectionService.upsertShopifyConnection(
        req.user.organizationId,
        id,
        req.user.sub,
        body,
      );
      return reply.status(201).send(connection);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.post("/projects/:id/nuvemshop-connection", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = nuvemshopConnectionSchema.parse(req.body);
    try {
      const connection = await adapterConnectionService.upsertNuvemshopConnection(
        req.user.organizationId,
        id,
        req.user.sub,
        body,
      );
      return reply.status(201).send(connection);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.post("/projects/:id/ftp-connection", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = ftpConnectionSchema.parse(req.body);
    try {
      const connection = await adapterConnectionService.upsertFtpConnection(
        req.user.organizationId,
        id,
        req.user.sub,
        body,
      );
      return reply.status(201).send(connection);
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  const platformKinds = [
    ["wordpress-connection", "WORDPRESS"],
    ["shopify-connection", "SHOPIFY"],
    ["nuvemshop-connection", "NUVEMSHOP"],
    ["ftp-connection", "FTP"],
  ] as const;
  for (const [path, kind] of platformKinds) {
    app.get(`/projects/:id/${path}`, async (req, reply) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const connection = await adapterConnectionService.getPlatformConnectionMasked(
        req.user.organizationId,
        id,
        kind,
      );
      if (!connection) return reply.status(404).send({ configured: false });
      return connection;
    });
  }

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

  // Nível de autonomia do orquestrador pra este projeto (padrão MANUAL).
  app.patch("/projects/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { autonomyLevel } = updateAutonomySchema.parse(req.body);
    try {
      return await projectService.updateAutonomyLevel(
        req.user.organizationId,
        id,
        autonomyLevel,
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
