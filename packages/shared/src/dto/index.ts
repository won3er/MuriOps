/** Contratos de request/response da API HTTP. */

import type {
  BlueprintInputPayload,
  BlueprintMode,
  BlueprintProviderName,
} from "../types/blueprint.js";
import type {
  RemediationItemStatus,
  RemediationProviderName,
  RemediationScope,
  RemediationSourceType,
} from "../types/remediation.js";

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  acceptTerms: true;
  organizationName?: string;
  /** Resposta ao código de 6 dígitos exibido na tela de cadastro (verificação anti-bot). */
  humanCheckAnswer: string;
}

/** Resposta de GET /auth/human-check — código atual e quando ele troca. */
export interface HumanCheckResponse {
  code: string;
  secondsRemaining: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  acceptTerms: true;
}

export interface CreateProjectRequest {
  name: string;
  url: string;
  description?: string;
}

export interface StartAnalysisRequest {
  /** Sobrescreve a URL do projeto para esta análise (opcional). */
  url?: string;
  /** Categorias a rodar; ausente = todas. */
  categories?: string[];
  /** Profundidade máxima do crawler. */
  maxDepth?: number;
  /** Máximo de páginas a visitar. */
  maxPages?: number;
}

export interface DashboardStats {
  totalAnalyses: number;
  totalProjects: number;
  monitoredSites: number;
  averageDurationMs: number;
  totalIssues: number;
  averageScore: number | null;
}

export interface IssueFilters {
  category?: string;
  severity?: string;
  status?: string;
  pageUrl?: string;
  search?: string;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

// ---------- Blueprint (pilar Projetar) ----------

export interface CreateBlueprintRequest {
  title: string;
  /** Modo de entrada e payload correspondente (discriminado por `mode`). */
  input: BlueprintInputPayload;
  /** IA escolhida por request. Ausente = provider configurado da organização. */
  provider?: BlueprintProviderName;
  /** Vínculo opcional a um projeto existente. */
  projectId?: string;
}

export type { BlueprintMode };

// ---------- Aplicação (RemediationPlan) ----------

export interface CreateRemediationPlanRequest {
  sourceType: RemediationSourceType;
  /** id da Análise, do Blueprint ou do Projeto de origem. */
  sourceId: string;
  /** Obrigatório quando sourceType === "project": qa | security | full. */
  scope?: RemediationScope;
  /** IA escolhida por request. Ausente = provider configurado da organização. */
  provider?: RemediationProviderName;
}

export interface UpdateRemediationItemRequest {
  status: RemediationItemStatus;
}
