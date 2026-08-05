import {
  ALL_CATEGORIES,
  SEVERITY_WEIGHT,
  type AnalysisCategory,
  type CategoryScores,
  type DetectedIssue,
  type ScoreBreakdown,
} from "@qa-ai/shared";

/**
 * Calcula scores 0-100 por categoria e um score geral.
 *
 * Modelo: cada categoria começa em 100 e perde pontos pela soma ponderada
 * das severidades dos problemas daquela categoria. O geral é a média das
 * categorias, com peso maior para as dimensões mais críticas.
 */
const CATEGORY_WEIGHT: Record<AnalysisCategory, number> = {
  UI: 1,
  UX: 1,
  PERFORMANCE: 1.2,
  SEO: 0.8,
  ACCESSIBILITY: 1,
  SECURITY: 1.3,
  CONSOLE: 0.7,
  NETWORK: 1,
  DEEP_SECURITY: 1.5,
  ACTIVE_SECURITY_TEST: 1.5,
  SOURCE_SECURITY_SCAN: 1.5,
};

/**
 * `executedCategories` deve ser a lista de categorias que essa análise de
 * fato rodou (o `categories` pedido no start da análise). Sem isso, uma
 * dimensão nunca executada (ex.: ACTIVE_SECURITY_TEST numa análise QA
 * padrão) ficaria com 0 problemas encontrados e mostraria nota 100 — como
 * se tivesse passado numa checagem que nunca aconteceu. Por padrão usa
 * ALL_CATEGORIES para não quebrar chamadas antigas, mas todo chamador
 * novo deve passar a lista real.
 */
export function computeScores(
  issues: DetectedIssue[],
  executedCategories: AnalysisCategory[] = ALL_CATEGORIES,
): ScoreBreakdown {
  const categories: CategoryScores = {};

  for (const category of executedCategories) {
    const penalty = issues
      .filter((i) => i.category === category)
      .reduce((sum, i) => sum + SEVERITY_WEIGHT[i.severity], 0);
    categories[category] = clamp(100 - penalty);
  }

  const totalWeight = executedCategories.reduce(
    (s, c) => s + CATEGORY_WEIGHT[c],
    0,
  );
  const overall = totalWeight
    ? Math.round(
        executedCategories.reduce(
          (s, c) => s + (categories[c] ?? 100) * CATEGORY_WEIGHT[c],
          0,
        ) / totalWeight,
      )
    : 100;

  return { overall: clamp(overall), categories };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
