import type { AnalysisCategory, AnalysisStatus } from "../enums.js";
import type { Issue } from "./issue.js";
import type { ScoreBreakdown } from "./score.js";

export interface CrawledPage {
  url: string;
  title: string | null;
  depth: number;
  linkedFrom: string | null;
  statusCode: number | null;
}

export interface Analysis {
  id: string;
  projectId: string;
  status: AnalysisStatus;
  /** Versão incremental por projeto (v1, v2, ...) para comparação. */
  version: number;
  /** Categorias selecionadas para esta execução (define os filtros disponíveis na UI). */
  categories: AnalysisCategory[];
  score: ScoreBreakdown | null;
  pagesDiscovered: number;
  issueCount: number;
  durationMs: number | null;
  error: string | null;
  /** Resumo executivo escrito pela IA. */
  aiSummary: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface AnalysisDetail extends Analysis {
  pages: CrawledPage[];
  issues: Issue[];
}

/** Diferença entre duas análises (comparação de versões). */
export interface AnalysisComparison {
  from: Analysis;
  to: Analysis;
  scoreDelta: number;
  fixedIssues: Issue[];
  newIssues: Issue[];
  persistingIssues: Issue[];
}
