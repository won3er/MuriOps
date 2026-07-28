import { AnalysisCategory, Severity, type DetectedIssue } from "@qa-ai/shared";
import type { PageContext, SiteAnalyzer } from "../types.js";
import { issue } from "./helpers.js";

const DEEP_CLICKS = 4;

/**
 * Módulo 3 — Experiência do Usuário (nível site).
 * Avalia facilidade de navegação, profundidade de cliques, páginas difíceis
 * de alcançar e ausência de navegação consistente.
 */
export class UxAnalyzer implements SiteAnalyzer {
  readonly id = "ux";

  async analyze(pages: PageContext[], siteUrl: string): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];

    const deep = pages.filter((p) => p.depth >= DEEP_CLICKS);
    if (deep.length > 0) {
      const examples = deep.slice(0, 5).map((p) => `${p.url} (${p.depth} cliques)`);
      issues.push(
        issue({
          title: "Conteúdo profundo demais na navegação",
          description: `${deep.length} página(s) exigem ${DEEP_CLICKS}+ cliques a partir da home — usuário provavelmente desiste antes de chegar lá, e buscadores também rastreiam com menos prioridade páginas muito profundas. Exemplo(s): ${examples.join(", ")}${deep.length > examples.length ? ` e mais ${deep.length - examples.length}` : ""}.`,
          category: AnalysisCategory.UX,
          severity: Severity.MEDIUM,
          pageUrl: deep[0]!.url,
          fingerprintExtra: ["deep-nav"],
          raw: deep.map((p) => `${p.depth} cliques: ${p.url}`).join("\n"),
        }),
      );
    }

    // Navegação consistente: procura <nav> na maioria das páginas. hasNav é
    // capturado no crawl (não depende da página ainda estar aberta aqui —
    // a maioria já foi fechada assim que seus analyzers por-página rodaram).
    const navResults = pages.map((p) => ({ url: p.url, hasNav: p.hasNav }));
    const withoutNav = navResults.filter((r) => !r.hasNav);
    if (pages.length > 1 && withoutNav.length / pages.length > 0.4) {
      const examples = withoutNav.slice(0, 5).map((r) => r.url);
      issues.push(
        issue({
          title: "Navegação inconsistente entre páginas",
          description: `${withoutNav.length} de ${pages.length} páginas não possuem um menu de navegação identificável (<nav> ou role="navigation") — usuário perde a referência de onde está no site e como voltar. Página(s): ${examples.join(", ")}${withoutNav.length > examples.length ? ` e mais ${withoutNav.length - examples.length}` : ""}.`,
          category: AnalysisCategory.UX,
          severity: Severity.MEDIUM,
          pageUrl: withoutNav[0]!.url,
          fingerprintExtra: ["no-nav"],
        }),
      );
    }

    return issues;
  }
}
