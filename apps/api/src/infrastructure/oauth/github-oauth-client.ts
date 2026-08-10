import { env } from "../../config/env.js";

/**
 * [10/08/2026] Cliente puro do fluxo OAuth do GitHub — sem Prisma, sem
 * `secret-box`, só chamadas HTTP. Mantido separado de
 * `application/github-oauth.service.ts` (que orquestra estado/sessão/banco)
 * pra `adapter-connection.service.ts` poder importar só a parte pura sem
 * criar dependência circular entre os dois services de aplicação.
 */

export function isGithubOAuthConfigured(): boolean {
  return Boolean(env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET);
}

export function githubOAuthRedirectUri(apiBaseUrl: string): string {
  return env.GITHUB_OAUTH_REDIRECT_URI ?? `${apiBaseUrl}/adapter-connections/github/oauth/callback`;
}

export function buildGithubAuthorizeUrl(apiBaseUrl: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_OAUTH_CLIENT_ID ?? "",
    redirect_uri: githubOAuthRedirectUri(apiBaseUrl),
    scope: "repo",
    state,
    allow_signup: "false",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export interface GithubTokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}

export async function exchangeGithubCode(
  apiBaseUrl: string,
  code: string,
): Promise<GithubTokenResult> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: githubOAuthRedirectUri(apiBaseUrl),
    }),
  });
  const body = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(body.error_description ?? body.error ?? "Falha ao trocar o código do GitHub por um token.");
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? null,
    // Só GitHub Apps com "expiring user tokens" habilitado devolvem expires_in
    // — a maioria das OAuth Apps clássicas não expira (fica null aqui, e
    // `ensureFreshCredential` nunca tenta renovar nesse caso).
    expiresAt: body.expires_in ? new Date(Date.now() + body.expires_in * 1000) : null,
  };
}

/** Login da conta conectada — só pra exibir "Conectado como X" na UI. */
export async function fetchGithubAccountLabel(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { login?: string };
    return body.login ?? null;
  } catch {
    return null;
  }
}

export interface GithubRepoOption {
  owner: string;
  repo: string;
  fullName: string;
  private: boolean;
}

/** Lista repositórios acessíveis pelo token — até 200 (2 páginas), ordenados por atividade recente. */
export async function listGithubAccessibleRepos(accessToken: string): Promise<GithubRepoOption[]> {
  const repos: GithubRepoOption[] = [];
  for (const page of [1, 2]) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!res.ok) break;
    const body = (await res.json()) as {
      name: string;
      private: boolean;
      full_name: string;
      owner: { login: string };
    }[];
    for (const r of body) {
      repos.push({ owner: r.owner.login, repo: r.name, fullName: r.full_name, private: r.private });
    }
    if (body.length < 100) break;
  }
  return repos;
}
