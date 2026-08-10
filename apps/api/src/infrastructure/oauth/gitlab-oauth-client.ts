import { env } from "../../config/env.js";

/**
 * [10/08/2026] Cliente puro do fluxo OAuth do GitLab — mesma separação do
 * `github-oauth-client.ts` (sem Prisma/secret-box aqui). Diferente do
 * GitHub, o access token do GitLab SEMPRE expira (~2h) — por isso
 * `refreshGitlabAccessToken` é usado de verdade por
 * `adapter-connection.service.ts.ensureFreshCredential`, não só por
 * completude.
 */

export function isGitlabOAuthConfigured(): boolean {
  return Boolean(env.GITLAB_OAUTH_CLIENT_ID && env.GITLAB_OAUTH_CLIENT_SECRET);
}

export function gitlabOAuthRedirectUri(apiBaseUrl: string): string {
  return env.GITLAB_OAUTH_REDIRECT_URI ?? `${apiBaseUrl}/adapter-connections/gitlab/oauth/callback`;
}

export function buildGitlabAuthorizeUrl(apiBaseUrl: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GITLAB_OAUTH_CLIENT_ID ?? "",
    redirect_uri: gitlabOAuthRedirectUri(apiBaseUrl),
    response_type: "code",
    scope: "api",
    state,
  });
  return `https://gitlab.com/oauth/authorize?${params.toString()}`;
}

export interface GitlabTokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}

export async function exchangeGitlabCode(
  apiBaseUrl: string,
  code: string,
): Promise<GitlabTokenResult> {
  return requestGitlabToken({
    client_id: env.GITLAB_OAUTH_CLIENT_ID ?? "",
    client_secret: env.GITLAB_OAUTH_CLIENT_SECRET ?? "",
    code,
    grant_type: "authorization_code",
    redirect_uri: gitlabOAuthRedirectUri(apiBaseUrl),
  });
}

/** GitLab exige o mesmo `redirect_uri` original também na renovação — por isso não é uma função pura de 1 argumento como a do GitHub. */
export async function refreshGitlabAccessToken(
  refreshToken: string,
  apiBaseUrl?: string,
): Promise<GitlabTokenResult> {
  return requestGitlabToken({
    client_id: env.GITLAB_OAUTH_CLIENT_ID ?? "",
    client_secret: env.GITLAB_OAUTH_CLIENT_SECRET ?? "",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    redirect_uri: gitlabOAuthRedirectUri(apiBaseUrl ?? env.PUBLIC_API_URL ?? ""),
  });
}

async function requestGitlabToken(body: Record<string, string>): Promise<GitlabTokenResult> {
  const res = await fetch("https://gitlab.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "Falha ao obter token do GitLab.");
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  };
}

/** Username da conta conectada — só pra exibir "Conectado como X" na UI. */
export async function fetchGitlabAccountLabel(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://gitlab.com/api/v4/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { username?: string };
    return body.username ?? null;
  } catch {
    return null;
  }
}

export interface GitlabProjectOption {
  projectPath: string;
  name: string;
  visibility: string;
}

/** Lista projetos acessíveis pelo token — até 200 (2 páginas), ordenados por atividade recente. */
export async function listGitlabAccessibleProjects(
  accessToken: string,
): Promise<GitlabProjectOption[]> {
  const projects: GitlabProjectOption[] = [];
  for (const page of [1, 2]) {
    const res = await fetch(
      `https://gitlab.com/api/v4/projects?membership=true&per_page=100&page=${page}&order_by=last_activity_at`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) break;
    const body = (await res.json()) as {
      path_with_namespace: string;
      name: string;
      visibility: string;
    }[];
    for (const p of body) {
      projects.push({ projectPath: p.path_with_namespace, name: p.name, visibility: p.visibility });
    }
    if (body.length < 100) break;
  }
  return projects;
}
