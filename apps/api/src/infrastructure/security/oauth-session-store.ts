/**
 * [10/08/2026] Guarda em memória o token recém-obtido de um "Conectar com
 * GitHub/GitLab" enquanto o usuário escolhe o repositório na tela (a etapa
 * entre o callback do provedor e o POST de confirmar) — mesmo espírito do
 * folder-picker do Drive, mas sem gravar nada em `AdapterConnection` até o
 * usuário de fato escolher, pra não deixar uma conexão "meio conectada" no
 * banco se ele desistir no meio do fluxo.
 *
 * Deliberadamente em memória (não uma tabela nova): é um estado curtíssimo
 * (poucos minutos), de uma única instância (Render free tier não roda mais
 * de uma réplica), e perder a sessão só significa refazer o "Conectar" — o
 * mesmo tipo de limitação já aceito nos outros loops leves do produto
 * (`recoverStale*`, `runDueSchedules` etc., ver CLAUDE.md).
 */

export class OAuthSessionExpiredError extends Error {
  readonly statusCode = 400;
  constructor() {
    super('A sessão de conexão expirou — clique em "Conectar" de novo.');
  }
}

export interface PendingOAuthSession {
  kind: "GITHUB" | "GITLAB";
  organizationId: string;
  projectId: string;
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  accountLabel: string | null;
}

const TTL_MS = 10 * 60 * 1000; // 10 minutos — tempo de sobra pra escolher o repositório na tela.

const sessions = new Map<string, PendingOAuthSession>();
const timers = new Map<string, NodeJS.Timeout>();

export function createPendingOAuthSession(
  sessionId: string,
  session: PendingOAuthSession,
): void {
  sessions.set(sessionId, session);
  const existingTimer = timers.get(sessionId);
  if (existingTimer) clearTimeout(existingTimer);
  timers.set(
    sessionId,
    setTimeout(() => {
      sessions.delete(sessionId);
      timers.delete(sessionId);
    }, TTL_MS),
  );
}

export function getPendingOAuthSession(sessionId: string): PendingOAuthSession | null {
  return sessions.get(sessionId) ?? null;
}

export function consumePendingOAuthSession(sessionId: string): void {
  sessions.delete(sessionId);
  const timer = timers.get(sessionId);
  if (timer) clearTimeout(timer);
  timers.delete(sessionId);
}
