import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { githubOAuthService } from "../../application/github-oauth.service.js";
import { gitlabOAuthService } from "../../application/gitlab-oauth.service.js";
import { NotFoundError } from "../../application/analysis.service.js";
import { OAuthSessionExpiredError } from "../../infrastructure/security/oauth-session-store.js";
import { env } from "../../config/env.js";

/** URL pública da API — mesmo helper duplicado em project.routes.ts/remediation.routes.ts (sem módulo compartilhado ainda pra isso). */
function apiBaseUrl(req: FastifyRequest): string {
  if (env.PUBLIC_API_URL) return env.PUBLIC_API_URL;
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol;
  return `${proto}://${req.headers.host ?? "localhost"}`;
}

function webBaseUrl(): string {
  return env.PUBLIC_WEB_URL ?? "http://localhost:3000";
}

const selectRepoSchema = z.object({
  session: z.string().min(1),
  owner: z.string().min(1),
  repo: z.string().min(1),
});

const selectProjectSchema = z.object({
  session: z.string().min(1),
  projectPath: z.string().min(1),
});

/**
 * [10/08/2026] "Conectar com GitHub/GitLab" via OAuth — rotas autenticadas
 * (start/repos/select-repo). Registradas junto das demais rotas de projeto,
 * mesmo hook de autenticação.
 */
export async function adapterOAuthRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/projects/:id/github-oauth/start", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return githubOAuthService.start(req.user.organizationId, id, req.user.sub, apiBaseUrl(req));
  });

  app.get("/projects/:id/github-oauth/repos", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { session } = z.object({ session: z.string().min(1) }).parse(req.query);
    try {
      return await githubOAuthService.listRepos(req.user.organizationId, id, session);
    } catch (err) {
      if (err instanceof OAuthSessionExpiredError)
        return reply
          .status(400)
          .send({ statusCode: 400, error: "OAuthSessionExpired", message: err.message });
      throw err;
    }
  });

  app.post("/projects/:id/github-oauth/select-repo", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = selectRepoSchema.parse(req.body);
    try {
      const result = await githubOAuthService.finalize(
        req.user.organizationId,
        id,
        req.user.sub,
        body.session,
        body.owner,
        body.repo,
        apiBaseUrl(req),
      );
      return reply.status(201).send(result);
    } catch (err) {
      if (err instanceof OAuthSessionExpiredError)
        return reply
          .status(400)
          .send({ statusCode: 400, error: "OAuthSessionExpired", message: err.message });
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });

  app.get("/projects/:id/gitlab-oauth/start", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return gitlabOAuthService.start(req.user.organizationId, id, req.user.sub, apiBaseUrl(req));
  });

  app.get("/projects/:id/gitlab-oauth/repos", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { session } = z.object({ session: z.string().min(1) }).parse(req.query);
    try {
      return await gitlabOAuthService.listProjects(req.user.organizationId, id, session);
    } catch (err) {
      if (err instanceof OAuthSessionExpiredError)
        return reply
          .status(400)
          .send({ statusCode: 400, error: "OAuthSessionExpired", message: err.message });
      throw err;
    }
  });

  app.post("/projects/:id/gitlab-oauth/select-repo", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = selectProjectSchema.parse(req.body);
    try {
      const result = await gitlabOAuthService.finalize(
        req.user.organizationId,
        id,
        req.user.sub,
        body.session,
        body.projectPath,
        apiBaseUrl(req),
      );
      return reply.status(201).send(result);
    } catch (err) {
      if (err instanceof OAuthSessionExpiredError)
        return reply
          .status(400)
          .send({ statusCode: 400, error: "OAuthSessionExpired", message: err.message });
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });
}

/**
 * Callback público (sem login) — é o próprio GitHub/GitLab redirecionando o
 * navegador depois do usuário autorizar. Identidade vem só do `state`
 * assinado (ver oauth-state.ts), nunca de um header de autenticação, porque
 * um redirect de navegador não carrega Authorization. Redireciona de volta
 * pro popup no frontend com o "session" (nonce) na query string — o token de
 * verdade nunca passa pela URL, fica só no servidor até o `select-repo`.
 */
export async function adapterOAuthCallbackRoutes(app: FastifyInstance): Promise<void> {
  app.get("/adapter-connections/github/oauth/callback", async (req, reply) => {
    const { code, state, error } = z
      .object({ code: z.string().optional(), state: z.string().optional(), error: z.string().optional() })
      .parse(req.query);
    if (error || !code || !state) {
      return reply.redirect(`${webBaseUrl()}/aplicacao?oauthError=${encodeURIComponent(error ?? "cancelado")}`);
    }
    try {
      const session = await githubOAuthService.handleCallback(apiBaseUrl(req), code, state);
      return reply.redirect(
        `${webBaseUrl()}/aplicacao?view=connections&githubOAuthSession=${encodeURIComponent(session)}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao conectar com o GitHub.";
      return reply.redirect(`${webBaseUrl()}/aplicacao?oauthError=${encodeURIComponent(message)}`);
    }
  });

  app.get("/adapter-connections/gitlab/oauth/callback", async (req, reply) => {
    const { code, state, error } = z
      .object({ code: z.string().optional(), state: z.string().optional(), error: z.string().optional() })
      .parse(req.query);
    if (error || !code || !state) {
      return reply.redirect(`${webBaseUrl()}/aplicacao?oauthError=${encodeURIComponent(error ?? "cancelado")}`);
    }
    try {
      const session = await gitlabOAuthService.handleCallback(apiBaseUrl(req), code, state);
      return reply.redirect(
        `${webBaseUrl()}/aplicacao?view=connections&gitlabOAuthSession=${encodeURIComponent(session)}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao conectar com o GitLab.";
      return reply.redirect(`${webBaseUrl()}/aplicacao?oauthError=${encodeURIComponent(message)}`);
    }
  });
}
