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
};

export function computeScores(issues: DetectedIssue[]): ScoreBreakdown {
  const categories = {} as CategoryScores;

  for (const category of ALL_CATEGORIES) {
    const penalty = issues
      .filter((i) => i.category === category)
      .reduce((sum, i) => sum + SEVERITY_WEIGHT[i.severity], 0);
    categories[category] = clamp(100 - penalty);
  }

  const totalWeight = ALL_CATEGORIES.reduce(
    (s, c) => s + CATEGORY_WEIGHT[c],
    0,
  );
  const overall = Math.round(
    ALL_CATEGORIES.reduce(
      (s, c) => s + categories[c] * CATEGORY_WEIGHT[c],
      0,
    ) / totalWeight,
  );

  return { overall: clamp(overall), categories };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
