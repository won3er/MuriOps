import { AnalysisCategory, Severity, type DetectedIssue } from "@qa-ai/shared";
import type { PageContext, SiteAnalyzer } from "../types.js";
import { issue } from "./helpers.js";

/**
 * Módulo 5 (nível site) — verifica robots.txt e sitemap.xml na origem.
 */
export class SiteSeoAnalyzer implements SiteAnalyzer {
  readonly id = "site-seo";

  async analyze(pages: PageContext[], siteUrl: string): Promise<DetectedIssue[]> {
    const first = pages[0];
    if (!first) return [];

    const origin = new URL(siteUrl).origin;
    const issues: DetectedIssue[] = [];

    const robots = await this.fetchStatus(first, `${origin}/robots.txt`);
    if (robots !== 200) {
      issues.push(
        issue({
          title: "robots.txt ausente",
          description: `Não foi encontrado um robots.txt válido em ${origin}/robots.txt (status ${robots}).`,
          category: AnalysisCategory.SEO,
          severity: Severity.LOW,
          pageUrl: siteUrl,
          fingerprintExtra: ["robots"],
        }),
      );
    }

    const sitemap = await this.fetchStatus(first, `${origin}/sitemap.xml`);
    if (sitemap !== 200) {
      issues.push(
        issue({
          title: "sitemap.xml ausente",
          description: `Não foi encontrado um sitemap.xml em ${origin}/sitemap.xml (status ${sitemap}), prejudicando a indexação.`,
          category: AnalysisCategory.SEO,
          severity: Severity.LOW,
          pageUrl: siteUrl,
          fingerprintExtra: ["sitemap"],
        }),
      );
    }

    return issues;
  }

  private async fetchStatus(ctx: PageContext, url: string): Promise<number> {
    try {
      return await ctx.page.evaluate(async (u) => {
        const res = await fetch(u, { method: "GET" });
        return res.status;
      }, url);
    } catch {
      return 0;
    }
  }
}
