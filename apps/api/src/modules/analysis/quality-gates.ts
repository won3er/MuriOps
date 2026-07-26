import type { ProjectQualityGate, QualityGateEvaluation, ScoreBreakdown } from "@qa-ai/shared";

/**
 * Avalia um score de análise contra os quality gates configurados no projeto.
 * Determinístico e 100% do núcleo — nenhum adapter participa dessa decisão.
 *
 * Um gate sem `category` mira o score geral (`score.overall`); com
 * `category`, mira `score.categories[category]`.
 */
export function evaluateQualityGates(
  score: ScoreBreakdown,
  gates: ProjectQualityGate[],
): QualityGateEvaluation {
  if (gates.length === 0) {
    return { passed: true, details: [] };
  }

  const details = gates.map((gate) => {
    const actual = gate.category
      ? (score.categories as Record<string, number>)[gate.category] ?? 0
      : score.overall;
    return {
      category: gate.category,
      label: gate.label,
      minScore: gate.minScore,
      actual,
      passed: actual >= gate.minScore,
    };
  });

  return { passed: details.every((d) => d.passed), details };
}
