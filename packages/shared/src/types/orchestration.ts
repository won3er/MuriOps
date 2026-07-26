/**
 * Orquestrador — o núcleo QA-only que fecha o ciclo analisar → gerar plano →
 * aplicar (por um adapter) → reanalisar → repetir até bater os quality gates.
 * Toda regra de QA e decisão de negócio mora aqui, nunca num adapter.
 */

import type {
  AutonomyLevel,
  OrchestrationEventType,
  OrchestrationRunStatus,
} from "../enums.js";

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

export interface OrchestrationRun {
  id: string;
  projectId: string;
  status: OrchestrationRunStatus;
  iteration: number;
  maxIterations: number;
  /** Snapshot do nível de autonomia no início do run. */
  autonomyLevel: AutonomyLevel;
  currentAnalysisId: string | null;
  currentPlanId: string | null;
  adapterConnectionId: string | null;
  gateResult: QualityGateEvaluation | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrchestrationEvent {
  id: string;
  runId: string;
  type: OrchestrationEventType;
  message: string;
  data: Record<string, unknown> | null;
  createdAt: string;
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

export interface CreateOrchestrationRunRequest {
  maxIterations?: number;
  adapterConnectionId?: string;
}
