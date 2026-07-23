import type { AnalysisCategory } from "../enums.js";

/** Nota 0-100 por dimensão. */
export type CategoryScores = Record<AnalysisCategory, number>;

export interface ScoreBreakdown {
  overall: number;
  categories: CategoryScores;
}
