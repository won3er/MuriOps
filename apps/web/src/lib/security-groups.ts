/**
 * Deriva o "tipo de check" de Segurança Avançada a partir do título do
 * problema (ex.: "TLS — Certificado expirado" → "Certificado expirado").
 * Cada check do analyzer já usa o padrão "Prefixo — Descrição"; extrair a
 * parte depois do travessão dá um pill por check, sem precisar manter uma
 * tabela de mapeamento à parte (novo check = novo pill automaticamente).
 */
export function securityGroupOf(title: string): string {
  const sep = title.indexOf(" — ");
  return sep === -1 ? title : title.slice(sep + 3);
}
