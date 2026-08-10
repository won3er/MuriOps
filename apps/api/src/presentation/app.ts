import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { authPlugin } from "./plugins/auth.plugin.js";
import { analysisRoutes } from "./routes/analysis.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { accountRoutes } from "./routes/account.routes.js";
import { projectionRoutes } from "./routes/projection.routes.js";
import { criticalFlowRoutes } from "./routes/critical-flow.routes.js";
import { dashboardRoutes } from "./routes/dashboard.routes.js";
import { evidenceRoutes } from "./routes/evidence.routes.js";
import { mcpBridgeRoutes } from "./routes/mcp.routes.js";
import { orchestrationRoutes } from "./routes/orchestration.routes.js";
import { projectRoutes } from "./routes/project.routes.js";
import {
  remediationBridgeRoutes,
  remediationRoutes,
} from "./routes/remediation.routes.js";
import { settingsRoutes } from "./routes/settings.routes.js";
import { upgradeBridgeRoutes, upgradeRoutes } from "./routes/upgrade.routes.js";
import { githubWebhookRoutes } from "./routes/webhooks.routes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === "development"
          ? { target: "pino-pretty" }
          : undefined,
      level: "info",
      // Rotas de ponte/MCP carregam tokens na URL para que ferramentas de
      // desenvolvimento possam se conectar sem sessão de navegador. Nunca
      // deixe URLs, Authorization ou cookies irem para os logs do Render.
      redact: {
        paths: ["req.url", "req.headers.authorization", "req.headers.cookie"],
        censor: "[REDACTED]",
      },
    },
  });

  await app.register(fastifyCors, {
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });

  // Headers de segurança (CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  // Referrer-Policy, Permissions-Policy, COOP, CORP) — a mesma checklist que
  // o módulo de Segurança Avançada cobra dos sites analisados.
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-site" },
  });

  // Rate limit global — mitiga scraping/DoS básico. Rotas de auth têm limite
  // mais estrito (ver auth.routes.ts) contra brute force de login.
  await app.register(fastifyRateLimit, {
    max: 300,
    timeWindow: "1 minute",
  });

  await app.register(authPlugin);

  // Serve evidências (screenshots, logs) sob /evidence/<analysisId>/<arquivo>.

  // Tratamento centralizado de erros (validação Zod -> 400).
  app.setErrorHandler((error: FastifyError, _req, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        statusCode: 400,
        error: "ValidationError",
        message: "Dados inválidos",
        issues: error.flatten(),
      });
    }
    app.log.error(error);
    const statusCode = error.statusCode ?? 500;
    // Erros 5xx podem carregar detalhes internos (query, path, stack) — só
    // expõe a mensagem original para 4xx, que já são textos pensados pro
    // usuário (ex.: NotFoundError). Em produção some com qualquer coisa ≥500.
    const message =
      statusCode >= 500
        ? "Erro interno. Tente novamente em instantes."
        : (error.message ?? "Erro interno");
    return reply.status(statusCode).send({
      statusCode,
      error: error.name ?? "InternalServerError",
      message,
    });
  });

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(authRoutes);
  await app.register(accountRoutes);
  await app.register(evidenceRoutes);
  await app.register(projectRoutes);
  await app.register(analysisRoutes);
  await app.register(projectionRoutes);
  await app.register(criticalFlowRoutes);
  await app.register(remediationRoutes);
  // Ponte universal da Aplicação: pública, autenticada por token do plano.
  await app.register(remediationBridgeRoutes);
  await app.register(upgradeRoutes);
  // Ponte universal da Atualização: pública, autenticada por token do plano.
  await app.register(upgradeBridgeRoutes);
  await app.register(dashboardRoutes);
  await app.register(settingsRoutes);
  await app.register(orchestrationRoutes);
  // Bridge MCP: pública, autenticada só pelo token da conexão na URL.
  await app.register(mcpBridgeRoutes);
  // Webhook do GitHub: público, autenticado por assinatura HMAC.
  await app.register(githubWebhookRoutes);

  return app;
}
