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
  /** Referência viva à página Playwright (válida apenas durante a análise). */
  page: Page;
  mainResponse: Response | null;
  /** Nome do arquivo de screenshot salvo (relativo ao storage). */
  screenshotPath: string | null;
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
