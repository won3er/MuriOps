import { AnalysisCategory, Severity, type DetectedIssue } from "@qa-ai/shared";
import type { PageAnalyzer, PageContext } from "../types.js";
import { issue } from "./helpers.js";

const THRESHOLDS = {
  ttfbMs: 800,
  lcpMs: 2500,
  cls: 0.1,
  loadMs: 4000,
  transferKb: 3000,
  requestCount: 80,
};

/**
 * Módulo 4 — Performance.
 * Avalia TTFB, LCP, CLS, tempo de load, peso total e número de requests.
 */
export class PerformanceAnalyzer implements PageAnalyzer {
  readonly id = "performance";

  async analyze(ctx: PageContext): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];
    const p = ctx.perf;

    if (p.ttfbMs !== null && p.ttfbMs > THRESHOLDS.ttfbMs) {
      issues.push(
        metric(
          ctx,
          "TTFB alto",
          `O Time To First Byte foi ${Math.round(p.ttfbMs)}ms (ideal < ${THRESHOLDS.ttfbMs}ms).`,
          Severity.MEDIUM,
          "ttfb",
        ),
      );
    }

    if (p.lcpMs !== null && p.lcpMs > THRESHOLDS.lcpMs) {
      issues.push(
        metric(
          ctx,
          "LCP acima do recomendado",
          `O Largest Contentful Paint foi ${Math.round(p.lcpMs)}ms (ideal < ${THRESHOLDS.lcpMs}ms).`,
          p.lcpMs > THRESHOLDS.lcpMs * 1.6 ? Severity.HIGH : Severity.MEDIUM,
          "lcp",
        ),
      );
    }

    if (p.cls !== null && p.cls > THRESHOLDS.cls) {
      issues.push(
        metric(
          ctx,
          "CLS elevado (layout instável)",
          `O Cumulative Layout Shift foi ${p.cls.toFixed(3)} (ideal < ${THRESHOLDS.cls}).`,
          Severity.MEDIUM,
          "cls",
        ),
      );
    }

    if (p.loadMs !== null && p.loadMs > THRESHOLDS.loadMs) {
      issues.push(
        metric(
          ctx,
          "Tempo de carregamento alto",
          `A página levou ${Math.round(p.loadMs)}ms para carregar completamente.`,
          Severity.MEDIUM,
          "load",
        ),
      );
    }

    const transferKb = p.transferBytes / 1024;
    if (transferKb > THRESHOLDS.transferKb) {
      issues.push(
        metric(
          ctx,
          "Peso da página elevado",
          `A página transferiu ${Math.round(transferKb)}KB (acima de ${THRESHOLDS.transferKb}KB). Considere compressão, lazy loading e otimização de imagens.`,
          Severity.MEDIUM,
          "weight",
        ),
      );
    }

    if (p.requestCount > THRESHOLDS.requestCount) {
      issues.push(
        metric(
          ctx,
          "Número alto de requisições",
          `A página fez ${p.requestCount} requisições. Reduza com bundling, sprites e cache.`,
          Severity.LOW,
          "requests",
        ),
      );
    }

    return issues;
  }
}

function metric(
  ctx: PageContext,
  title: string,
  description: string,
  severity: Severity,
  key: string,
): DetectedIssue {
  return issue({
    title,
    description,
    category: AnalysisCategory.PERFORMANCE,
    severity,
    pageUrl: ctx.url,
    fingerprintExtra: [key],
  });
}
