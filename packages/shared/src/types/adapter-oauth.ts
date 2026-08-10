import type { AdapterConnection } from "./adapter.js";

/**
 * [10/08/2026] "Conectar com GitHub/GitLab" via OAuth — substitui o
 * formulário de colar PAT à mão por um fluxo de autorizar e escolher o
 * repositório numa lista, mesma filosofia do picker de pastas do Drive.
 */
export interface OAuthStartResponse {
  /** false quando a OAuth App não está configurada no ambiente (sem GITHUB_OAUTH_CLIENT_ID/GITLAB_OAUTH_CLIENT_ID) — a tela cai pro formulário manual de PAT. */
  configured: boolean;
  authUrl?: string;
}

export interface OAuthGithubRepoOption {
  owner: string;
  repo: string;
  fullName: string;
  private: boolean;
}

export interface OAuthGitlabProjectOption {
  projectPath: string;
  name: string;
  visibility: string;
}

export interface OAuthConnectionResult extends AdapterConnection {
  /** true quando o webhook do PR Security Reviews foi criado automaticamente via API — sem isso, a UI mostra o passo manual de copiar URL+secret (mesmo fallback de sempre). */
  webhookConfiguredAutomatically: boolean;
  webhookUrl: string | null;
  /** Só vem preenchido quando o webhook NÃO foi automático — a UI usa pra mostrar o passo manual. */
  webhookSecret?: string;
}
