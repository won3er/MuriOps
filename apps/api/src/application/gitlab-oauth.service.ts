import { randomBytes } from "node:crypto";
import type { OAuthConnectionResult, OAuthGitlabProjectOption, OAuthStartResponse } from "@qa-ai/shared";
import { GitlabAdapter } from "../infrastructure/adapters/gitlab/gitlab-adapter.js";
import {
  buildGitlabAuthorizeUrl,
  exchangeGitlabCode,
  fetchGitlabAccountLabel,
  isGitlabOAuthConfigured,
  listGitlabAccessibleProjects,
} from "../infrastructure/oauth/gitlab-oauth-client.js";
import { signOAuthState, verifyOAuthState } from "../infrastructure/security/oauth-state.js";
import {
  consumePendingOAuthSession,
  createPendingOAuthSession,
  getPendingOAuthSession,
  OAuthSessionExpiredError,
} from "../infrastructure/security/oauth-session-store.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { adapterConnectionService } from "./adapter-connection.service.js";
import { NotFoundError } from "./analysis.service.js";

/**
 * [10/08/2026] "Conectar com GitLab" via OAuth — espelha
 * `github-oauth.service.ts` exatamente (mesma arquitetura, mesmo motivo pra
 * cada decisão já documentado lá). Única diferença de fundo: o access token
 * do GitLab expira de verdade (~2h) — por isso sempre salva
 * `refreshToken`/`expiresAt`, consumidos depois por
 * `adapterConnectionService.ensureFreshCredential`.
 */
export const gitlabOAuthService = {
  async start(
    organizationId: string,
    projectId: string,
    userId: string,
    apiBaseUrl: string,
  ): Promise<OAuthStartResponse> {
    if (!isGitlabOAuthConfigured()) return { configured: false };
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("Projeto não encontrado");

    const nonce = randomBytes(16).toString("base64url");
    const state = signOAuthState({ organizationId, projectId, userId, nonce });
    return { configured: true, authUrl: buildGitlabAuthorizeUrl(apiBaseUrl, state) };
  },

  async handleCallback(apiBaseUrl: string, code: string, state: string): Promise<string> {
    const payload = verifyOAuthState(state);
    if (!payload) throw new Error("State inválido — inicie a conexão de novo.");

    const token = await exchangeGitlabCode(apiBaseUrl, code);
    const accountLabel = await fetchGitlabAccountLabel(token.accessToken);

    createPendingOAuthSession(payload.nonce, {
      kind: "GITLAB",
      organizationId: payload.organizationId,
      projectId: payload.projectId,
      userId: payload.userId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      accountLabel,
    });
    return payload.nonce;
  },

  async listProjects(
    organizationId: string,
    projectId: string,
    session: string,
  ): Promise<{ accountLabel: string | null; projects: OAuthGitlabProjectOption[] }> {
    const pending = getPendingOAuthSession(session);
    if (
      !pending ||
      pending.kind !== "GITLAB" ||
      pending.organizationId !== organizationId ||
      pending.projectId !== projectId
    ) {
      throw new OAuthSessionExpiredError();
    }
    const projects = await listGitlabAccessibleProjects(pending.accessToken);
    return { accountLabel: pending.accountLabel, projects };
  },

  async finalize(
    organizationId: string,
    projectId: string,
    userId: string,
    session: string,
    projectPath: string,
    apiBaseUrl: string,
  ): Promise<OAuthConnectionResult> {
    const pending = getPendingOAuthSession(session);
    if (
      !pending ||
      pending.kind !== "GITLAB" ||
      pending.organizationId !== organizationId ||
      pending.projectId !== projectId
    ) {
      throw new OAuthSessionExpiredError();
    }

    const connection = await adapterConnectionService.upsertGitlabConnection(
      organizationId,
      projectId,
      userId,
      { projectPath, token: pending.accessToken },
      {
        refreshToken: pending.refreshToken,
        expiresAt: pending.expiresAt,
        accountLabel: pending.accountLabel,
      },
    );
    consumePendingOAuthSession(session);

    let webhookConfiguredAutomatically = false;
    try {
      const adapter = new GitlabAdapter(pending.accessToken, projectPath);
      const result = await adapter.ensureWebhook(
        `${apiBaseUrl}${connection.webhookUrl}`,
        connection.webhookSecret,
      );
      webhookConfiguredAutomatically = result.created || result.alreadyExisted;
    } catch {
      // Best-effort — ver comentário equivalente em github-oauth.service.ts.
    }

    return {
      ...connection,
      webhookConfiguredAutomatically,
      webhookUrl: `${apiBaseUrl}${connection.webhookUrl}`,
      ...(webhookConfiguredAutomatically ? {} : { webhookSecret: connection.webhookSecret }),
    };
  },
};
