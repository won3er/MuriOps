import type { DetectedIssue } from "@qa-ai/shared";
import type { PrScanResult } from "./pr-review-scan.js";

const SEVERITY_ORDER: DetectedIssue["severity"][] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

const SEVERITY_EMOJI: Record<string, string> = {
  CRITICAL: "🔴",
  HIGH: "🟠",
  MEDIUM: "🟡",
  LOW: "🔵",
  INFO: "⚪",
};

const SEVERITY_LABEL_PT: Record<string, string> = {
  CRITICAL: "Crítico",
  HIGH: "Alto",
  MEDIUM: "Médio",
  LOW: "Baixo",
  INFO: "Informativo",
};

/** Marcador oculto no comentário — não é usado pra editar (v1 sempre posta um comentário novo), mas identifica a origem caso uma versão futura queira agrupar/atualizar. */
export const PR_REVIEW_COMMENT_MARKER = "<!-- muriops-pr-security-review -->";

export function renderPrReviewComment(result: PrScanResult): string {
  const lines: string[] = [
    PR_REVIEW_COMMENT_MARKER,
    "## 🛡️ MuriOps — Revisão de segurança automática",
    "",
    `Verificação nos arquivos alterados desta alteração (${result.filesScanned} de ${result.filesChanged} arquivo(s) elegível(is) analisado(s)) — mesmo motor de heurísticas da Análise de Segurança via GitHub/GitLab: segredos commitados, dependências com CVE conhecida, código inseguro e Dockerfile inseguro.`,
    "",
  ];

  if (result.issues.length === 0) {
    lines.push("✅ Nenhum problema encontrado nos padrões verificados.");
  } else {
    for (const severity of SEVERITY_ORDER) {
      const group = result.issues.filter((i) => i.severity === severity);
      if (group.length === 0) continue;
      lines.push(`### ${SEVERITY_EMOJI[severity] ?? ""} ${SEVERITY_LABEL_PT[severity] ?? severity} (${group.length})`);
      lines.push("");
      for (const finding of group) {
        lines.push(`- **${finding.title}** — ${finding.description}`);
      }
      lines.push("");
    }
  }

  if (result.filesSkipped > 0) {
    lines.push(`_${result.filesSkipped} arquivo(s) elegível(is) não analisado(s) por exceder o teto desta execução._`);
    lines.push("");
  }

  lines.push("---");
  lines.push(
    "_Comentário automático do MuriOps, gerado pelo webhook configurado nesta conexão. Detecção por heurística/indício — não é confirmação de exploit real. Revise antes do merge._",
  );

  return lines.join("\n");
}
