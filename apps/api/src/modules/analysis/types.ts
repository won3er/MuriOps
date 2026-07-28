import type { Page, Response } from "playwright";
import type { DetectedIssue } from "@qa-ai/shared";

/** Mensagem de console capturada durante o carregamento de uma página. */
export interface ConsoleEntry {
  type: string; // log | warning | error | ...
  text: string;
  location?: string;
}

/** Evento de rede capturado. */
export interface NetworkEntry {
  url: string;
  method: string;
  resourceType: string;
  status: number | null;
  failed: boolean;
  failureText?: string;
  durationMs: number | null;
  sizeBytes: number | null;
  fromCache: boolean;
}

/** Métricas de performance (Navigation/Web Vitals) de uma página. */
export interface PerfMetrics {
  ttfbMs: number | null;
  domContentLoadedMs: number | null;
  loadMs: number | null;
  lcpMs: number | null;
  cls: number | null;
  transferBytes: number;
  requestCount: number;
}

/** Contexto de uma única página analisada (dados coletados na visita). */
export interface PageContext {
  url: string;
  title: string | null;
  depth: number;
  statusCode: number | null;
  responseHeaders: Record<string, string>;
  console: ConsoleEntry[];
  network: NetworkEntry[];
  perf: PerfMetrics;
  /**
   * Referência à página Playwright. Só é garantida como "viva" (não fechada)
   * para a página em processamento no momento e para a primeira página do
   * crawl (mantida aberta até o fim para os analyzers de nível-site que
   * precisam dela — SiteSeo, DeepSecurity). Demais páginas são fechadas
   * logo após seus analyzers por-página rodarem, pra não acumular Chromium
   * aberto em memória durante análises de sites com muitas páginas.
   */
  page: Page;
  mainResponse: Response | null;
  /** Nome do arquivo de screenshot salvo (relativo ao storage). */
  screenshotPath: string | null;
  /** Se a página tem <nav>/role="navigation" — capturado no crawl pra o UxAnalyzer não precisar da página ainda aberta depois. */
  hasNav: boolean;
}

/**
 * Contrato de um analyzer de página. Cada módulo (UI, SEO, ...) implementa isto.
 * Recebe o contexto da página já carregada e devolve problemas detectados.
 */
export interface PageAnalyzer {
  readonly id: string;
  analyze(ctx: PageContext): Promise<DetectedIssue[]>;
}

/** Analyzer que opera sobre o conjunto de páginas (visão global do site). */
export interface SiteAnalyzer {
  readonly id: string;
  analyze(pages: PageContext[], siteUrl: string): Promise<DetectedIssue[]>;
}
