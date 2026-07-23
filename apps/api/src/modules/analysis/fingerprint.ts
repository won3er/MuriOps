import { createHash } from "node:crypto";

/**
 * Gera uma chave de detecção estável a partir de partes significativas.
 * Usada para deduplicar e comparar problemas entre versões de análise
 * (ex.: saber se um bug foi corrigido de v1 para v2).
 */
export function fingerprint(...parts: (string | null | undefined)[]): string {
  const normalized = parts
    .map((p) => (p ?? "").trim().toLowerCase())
    .join("|");
  return createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}

/** Normaliza URL removendo query/hash para agrupar por página. */
export function pageKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}
