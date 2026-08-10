/**
 * [09/08/2026] O ciclo autônomo de Orquestração (OrchestrationRun/Event,
 * AutonomyLevel) foi removido — ver CLAUDE.md, seção "Redesign de
 * Orquestração → Reconciliação". Os tipos de quality gate continuam em uso
 * (agora consumidos pela Reconciliação, ver reconciliation.ts) — só o
 * ciclo autônomo em si foi cortado.
 */

export interface QualityGateDetail {
  /** null = score geral (overall), preenchido = uma AnalysisCategory específica. */
  category: string | null;
  label: string | null;
  minScore: number;
  actual: number;
  passed: boolean;
}

export interface QualityGateEvaluation {
  passed: boolean;
  details: QualityGateDetail[];
}

export interface ProjectQualityGate {
  id: string;
  projectId: string;
  /** null = score geral; preenchido = uma AnalysisCategory. */
  category: string | null;
  minScore: number;
  label: string | null;
  sourceBlueprintId: string | null;
  createdAt: string;
  updatedAt: string;
}
