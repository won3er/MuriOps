/**
 * Guardian — auditoria operacional de negócio, não de site. Reaplica a
 * mesma espinha dorsal do resto do produto (achado → severidade → correção
 * sugerida) sobre documentos que o usuário cola (planilha exportada como
 * texto/CSV, contrato, formulário) em vez de UI/SEO/segurança de um site.
 *
 * v1 (30/07/2026): entrada só por texto colado — sem upload/parse de PDF ou
 * planilha binária ainda (ver GuardianRun.sourceName pra referência do que
 * o texto representa).
 */

export type GuardianStatus = "PENDING" | "READY" | "FAILED";
export type GuardianRiskLevel = "low" | "medium" | "high" | "critical";
export type GuardianOverallStatus = "green" | "yellow" | "red";
export type GuardianFindingStatus = "open" | "acknowledged" | "resolved" | "ignored";
export type GuardianProviderName = "claude" | "openai" | "gemini";

/** Uma regra de negócio em linguagem natural (ex.: "estoque nunca pode ficar negativo"). */
export interface GuardianRule {
  id: string;
  description: string;
}

export interface GuardianRuleset {
  id: string;
  name: string;
  description: string | null;
  rules: GuardianRule[];
  createdAt: string;
  updatedAt: string;
}

export interface GuardianRulesetSummary {
  id: string;
  name: string;
  description: string | null;
  ruleCount: number;
  createdAt: string;
}

export interface CreateGuardianRulesetRequest {
  name: string;
  description?: string;
  /** Uma regra por linha, texto livre — o service atribui os ids. */
  rules: string[];
}

export interface GuardianFinding {
  id: string;
  title: string;
  description: string;
  riskLevel: GuardianRiskLevel;
  /** Regra violada, quando o achado vem de uma regra específica do ruleset. */
  ruleId: string | null;
  ruleDescription: string | null;
  /** Trecho do documento que evidencia o problema, quando aplicável. */
  evidence: string | null;
  suggestion: string;
  status: GuardianFindingStatus;
}

export interface GuardianResult {
  overallStatus: GuardianOverallStatus;
  summary: string;
  findings: GuardianFinding[];
}

export interface GuardianRun {
  id: string;
  projectId: string | null;
  rulesetId: string | null;
  rulesetName: string | null;
  title: string;
  sourceName: string | null;
  provider: string;
  status: GuardianStatus;
  result: GuardianResult | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuardianRunSummary {
  id: string;
  title: string;
  rulesetId: string | null;
  status: GuardianStatus;
  overallStatus: GuardianOverallStatus | null;
  findingCount: number;
  criticalCount: number;
  createdAt: string;
}

export interface CreateGuardianRunRequest {
  title?: string;
  projectId?: string | null;
  rulesetId?: string | null;
  sourceName?: string;
  documentText: string;
  provider?: GuardianProviderName;
}

export interface UpdateGuardianFindingRequest {
  status: GuardianFindingStatus;
}

/** Alimenta o painel executivo (verde/amarelo/vermelho) da seção Guardian. */
export interface GuardianDashboardStats {
  totalRuns: number;
  green: number;
  yellow: number;
  red: number;
  openCriticalFindings: number;
}
