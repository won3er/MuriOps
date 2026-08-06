import type { AnalysisCategory } from "@qa-ai/shared";
import type { PageAnalyzer, SiteAnalyzer } from "../types.js";
import { AccessibilityAnalyzer } from "./accessibility.analyzer.js";
import { ActiveSecurityTestAnalyzer } from "./active-security-test/active-security-test.analyzer.js";
import { ConsoleAnalyzer } from "./console.analyzer.js";
import { DeepSecurityAnalyzer } from "./deep-security/deep-security.analyzer.js";
import { ExposedSecretsAnalyzer } from "./exposed-secrets.analyzer.js";
import { NetworkAnalyzer } from "./network.analyzer.js";
import { PerformanceAnalyzer } from "./performance.analyzer.js";
import { SecurityAnalyzer } from "./security.analyzer.js";
import { SeoAnalyzer } from "./seo.analyzer.js";
import { SiteSeoAnalyzer } from "./site-seo.analyzer.js";
import { UiAnalyzer } from "./ui.analyzer.js";
import { UxAnalyzer } from "./ux.analyzer.js";

/** Módulos por-página, mapeados à categoria que produzem. */
export const PAGE_ANALYZERS: Record<AnalysisCategory, PageAnalyzer[]> = {
  UI: [new UiAnalyzer()],
  UX: [],
  PERFORMANCE: [new PerformanceAnalyzer()],
  SEO: [new SeoAnalyzer()],
  ACCESSIBILITY: [new AccessibilityAnalyzer()],
  SECURITY: [new ExposedSecretsAnalyzer()],
  CONSOLE: [new ConsoleAnalyzer()],
  NETWORK: [new NetworkAnalyzer()],
  DEEP_SECURITY: [],
  ACTIVE_SECURITY_TEST: [],
  SOURCE_SECURITY_SCAN: [],
};

/**
 * Módulos de nível site (rodam sobre o conjunto de páginas).
 *
 * ACTIVE_SECURITY_TEST é opt-in — o gate de verdade (bloqueia a categoria se
 * o projeto não tiver `activeTestingConsent`) fica em analysis.service.ts,
 * antes mesmo de a análise ser enfileirada. Aqui ela só é registrada como
 * qualquer outra categoria; nunca roda sozinha sem ter sido pedida E aprovada.
 */
export const SITE_ANALYZERS: Record<string, SiteAnalyzer[]> = {
  UX: [new UxAnalyzer()],
  SEO: [new SiteSeoAnalyzer()],
  SECURITY: [new SecurityAnalyzer()],
  DEEP_SECURITY: [new DeepSecurityAnalyzer()],
  ACTIVE_SECURITY_TEST: [new ActiveSecurityTestAnalyzer()],
};

/** Seleciona os analyzers por-página para as categorias solicitadas. */
export function selectPageAnalyzers(
  categories: AnalysisCategory[],
): PageAnalyzer[] {
  return categories.flatMap((c) => PAGE_ANALYZERS[c] ?? []);
}

export function selectSiteAnalyzers(
  categories: AnalysisCategory[],
): SiteAnalyzer[] {
  return categories.flatMap((c) => SITE_ANALYZERS[c] ?? []);
}
