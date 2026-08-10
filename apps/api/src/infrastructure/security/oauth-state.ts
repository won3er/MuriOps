import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

/**
 * [10/08/2026] "state" assinado por HMAC pro fluxo de OAuth (GitHub/GitLab)
 * — mesma ideia documentada no CLAUDE.md pro Drive: o callback do provedor é
 * um redirect de navegador sem Authorization header, então a identidade de
 * quem iniciou (organização/projeto/usuário) só pode vir do próprio state,
 * verificado por assinatura em vez de confiado às cegas. Reusa JWT_SECRET —
 * não precisa de variável de ambiente nova só pra isso.
 */
export interface OAuthStatePayload {
  organizationId: string;
  projectId: string;
  userId: string;
  nonce: string;
}

export function signOAuthState(payload: OAuthStatePayload): string {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", env.JWT_SECRET).update(json).digest("base64url");
  return `${json}.${sig}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [json, sig] = parts as [string, string];
  const expected = createHmac("sha256", env.JWT_SECRET).update(json).digest("base64url");
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length || !timingSafeEqual(expectedBuf, sigBuf)) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as OAuthStatePayload;
  } catch {
    return null;
  }
}
