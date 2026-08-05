import type { AnalysisCategory } from "../enums.js";

/**
 * Nota 0-100 por dimensão. Parcial de propósito: só inclui as categorias
 * que essa análise de fato executou — uma categoria ausente (ex.: Teste
 * Ativo Autorizado numa análise que só pediu QA padrão) não deve aparecer
 * com nota 100 como se tivesse passado numa checagem que nunca rodou.
 */
export type CategoryScores = Partial<Record<AnalysisCategory, number>>;

export interface ScoreBreakdown {
  overall: number;
  categories: CategoryScores;
}
