/**
 * Reconciliação — substitui o antigo ciclo autônomo de Orquestração
 * (ver CLAUDE.md, 09/08/2026). Não tem execução nem estado próprio: é
 * calculada on-the-fly a cada requisição, comparando a última Analysis
 * concluída do projeto com os RemediationPlans gerados a partir dela
 * (Análise → Aplicação), e avaliando os quality gates do projeto contra
 * o score dessa análise.
 */

import type { QualityGateEvaluation } from "./orchestration.js";
import type { RemediationSummary } from "./remediation.js";

export type ReconciliationStatus =
  /** Sem nenhuma análise concluída ainda. */
  | "no_analysis"
  /** Análise concluída, mas nenhuma Aplicação foi gerada a partir dela ainda. */
  | "no_plan"
  /** Existe Aplicação com itens pendentes. */
  | "pending_items"
  /** Todos os itens das Aplicações da análise atual estão marcados como feitos. */
  | "all_applied"
  /** Todos os itens aplicados, mas os quality gates configurados não passam com o score atual. */
  | "applied_gate_failing";

export interface ReconciliationResult {
  projectId: string;
  status: ReconciliationStatus;
  /** Análise concluída mais recente do projeto, se houver. */
  latestAnalysis: {
    id: string;
    version: number;
    finishedAt: string | null;
    overallScore: number | null;
    /** Dias desde que essa análise terminou — null se ainda não terminou. */
    daysSinceFinished: number | null;
  } | null;
  /** Aplicações (RemediationPlan) geradas a partir da análise mais recente. */
  plans: RemediationSummary[];
  totalItems: number;
  totalDone: number;
  totalPending: number;
  gateEvaluation: QualityGateEvaluation | null;
}
