import { AnalysisCategory, Severity, type DetectedIssue } from "@qa-ai/shared";
import type { PageAnalyzer, PageContext } from "../types.js";
import { issue } from "./helpers.js";

interface SeoSnapshot {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  h1Count: number;
  ogTitle: string | null;
  ogImage: string | null;
  imagesWithoutAlt: number;
  /** Até 5 exemplos de src das imagens sem alt, para localizar o elemento exato. */
  imagesWithoutAltExamples: string[];
  hasViewport: boolean;
  headingSkips: boolean;
}

/**
 * Módulo 5 — SEO.
 * Verifica meta tags, Open Graph, canonical, estrutura de headings e alt.
 * (robots.txt / sitemap.xml são checados no SiteAnalyzer.)
 */
export class SeoAnalyzer implements PageAnalyzer {
  readonly id = "seo";

  async analyze(ctx: PageContext): Promise<DetectedIssue[]> {
    const snap = await this.collect(ctx);
    const issues: DetectedIssue[] = [];
    const add = (
      title: string,
      description: string,
      severity: Severity,
      key: string,
    ) =>
      issues.push(
        issue({
          title,
          description,
          category: AnalysisCategory.SEO,
          severity,
          pageUrl: ctx.url,
          fingerprintExtra: [key],
        }),
      );

    if (!snap.title || snap.title.trim().length === 0)
      add("Título ausente", "A página não possui <title>.", Severity.HIGH, "title");
    else if (snap.title.length > 65)
      add(
        "Título muito longo",
        `O <title> tem ${snap.title.length} caracteres (ideal ≤ 60).`,
        Severity.LOW,
        "title-long",
      );

    if (!snap.metaDescription)
      add(
        "Meta description ausente",
        "A página não possui meta description.",
        Severity.MEDIUM,
        "desc",
      );

    if (!snap.canonical)
      add(
        "Canonical ausente",
        "A página não define uma tag <link rel=\"canonical\">.",
        Severity.LOW,
        "canonical",
      );

    if (snap.h1Count === 0)
      add("H1 ausente", "A página não possui um heading <h1>.", Severity.MEDIUM, "h1-0");
    else if (snap.h1Count > 1)
      add(
        "Múltiplos H1",
        `A página possui ${snap.h1Count} elementos <h1> (recomendado 1).`,
        Severity.LOW,
        "h1-many",
      );

    if (snap.headingSkips)
      add(
        "Estrutura de headings inconsistente",
        "A hierarquia de headings pula níveis (ex.: h1 → h3).",
        Severity.LOW,
        "heading-skip",
      );

    if (!snap.ogTitle || !snap.ogImage)
      add(
        "Open Graph incompleto",
        "Faltam tags Open Graph (og:title/og:image) para compartilhamento em redes sociais.",
        Severity.LOW,
        "og",
      );

    if (!snap.hasViewport)
      add(
        "Meta viewport ausente",
        "A página não define <meta name=\"viewport\">, prejudicando responsividade e SEO mobile.",
        Severity.MEDIUM,
        "viewport",
      );

    if (snap.imagesWithoutAlt > 0)
      issues.push(
        issue({
          title: "Imagens sem atributo alt",
          description: `${snap.imagesWithoutAlt} imagem(ns) sem alt, prejudicando SEO (buscadores não entendem o conteúdo da imagem) e acessibilidade (leitores de tela não conseguem descrevê-la). Exemplo(s): ${snap.imagesWithoutAltExamples.join(", ")}${snap.imagesWithoutAlt > snap.imagesWithoutAltExamples.length ? ` e mais ${snap.imagesWithoutAlt - snap.imagesWithoutAltExamples.length}` : ""}.`,
          category: AnalysisCategory.SEO,
          severity: Severity.MEDIUM,
          pageUrl: ctx.url,
          selector: snap.imagesWithoutAltExamples[0]
            ? `img[src="${snap.imagesWithoutAltExamples[0]}"]`
            : null,
          fingerprintExtra: ["img-alt"],
        }),
      );

    return issues;
  }

  private async collect(ctx: PageContext): Promise<SeoSnapshot> {
    return ctx.page.evaluate(() => {
      const meta = (sel: string) =>
        document.querySelector(sel)?.getAttribute("content") ?? null;
      const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
        (h) => Number(h.tagName[1]),
      );
      let headingSkips = false;
      for (let i = 1; i < headings.length; i++) {
        if (headings[i]! - headings[i - 1]! > 1) headingSkips = true;
      }
      const imgs = [...document.querySelectorAll("img")];
      const withoutAlt = imgs.filter((i) => !i.getAttribute("alt"));
      return {
        title: document.title || null,
        metaDescription: meta('meta[name="description"]'),
        canonical:
          document
            .querySelector('link[rel="canonical"]')
            ?.getAttribute("href") ?? null,
        h1Count: document.querySelectorAll("h1").length,
        ogTitle: meta('meta[property="og:title"]'),
        ogImage: meta('meta[property="og:image"]'),
        imagesWithoutAlt: withoutAlt.length,
        imagesWithoutAltExamples: withoutAlt
          .slice(0, 5)
          .map((i) => i.getAttribute("src") ?? "(sem src)"),
        hasViewport: !!document.querySelector('meta[name="viewport"]'),
        headingSkips,
      } satisfies SeoSnapshot;
    });
  }
}
