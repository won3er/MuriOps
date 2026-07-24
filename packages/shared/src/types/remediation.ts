/**
 * Aplicação (RemediationPlan) — transforma os achados de uma Análise QA ou
 * de um Blueprint num plano de ação concreto: o que mudar, onde, e como.
 * Fase 1 (manual): a IA não altera o código do usuário, só instrui — ele
 * marca cada item como feito conforme aplica as mudanças.
 */

export type RemediationSourceType = "analysis" | "blueprint";
export type RemediationStatus = "PENDING" | "READY" | "FAILED";
export type RemediationItemStatus = "pending" | "done";
export type RemediationProviderName = "claude" | "openai" | "gemini";

export interface RemediationItem {
  id: string;
  title: string;
  /** Categoria livre — reaproveita as categorias de análise (SEO, PERFORMANCE…) quando vem de lá. */
  category: string;
  severity: string;
  /** Caminho de arquivo sugerido pela IA, quando aplicável (heurístico). */
  filePath: string | null;
  description: string;
  /** Passo a passo de como aplicar a mudança. */
  howTo: string;
  status: RemediationItemStatus;
}

export interface RemediationResult {
  summary: string;
  items: RemediationItem[];
}

export interface RemediationPlan {
  id: string;
  projectId: string | null;
  sourceType: RemediationSourceType;
  sourceId: string;
  title: string;
  provider: string;
  status: RemediationStatus;
  result: RemediationResult | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RemediationSummary {
  id: string;
  projectId: string | null;
  sourceType: RemediationSourceType;
  sourceId: string;
  title: string;
  status: RemediationStatus;
  itemCount: number;
  doneCount: number;
  createdAt: string;
  updatedAt: string;
}
