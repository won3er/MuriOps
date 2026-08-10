/**
 * Categorias de análise. Cada uma mapeia para um módulo do engine
 * e para uma dimensão de score (0-100).
 */
export const AnalysisCategory = {
  UI: "UI",
  UX: "UX",
  PERFORMANCE: "PERFORMANCE",
  SEO: "SEO",
  ACCESSIBILITY: "ACCESSIBILITY",
  SECURITY: "SECURITY",
  CONSOLE: "CONSOLE",
  NETWORK: "NETWORK",
  /** Auditoria prática de segurança: TLS, DNS, segredos expostos, headers avançados, etc. */
  DEEP_SECURITY: "DEEP_SECURITY",
  /**
   * Teste Ativo Autorizado — opt-in, só roda se o projeto tiver
   * `activeTestingConsent = true` (checado em analysis.service.ts).
   * Rate-limit/brute-force, enumeração de usuário e payloads limitados
   * contra formulários do próprio site. Nunca roda por padrão.
   */
  ACTIVE_SECURITY_TEST: "ACTIVE_SECURITY_TEST",
  /**
   * Análise de Segurança via GitHub — opt-in, só roda se o projeto tiver uma
   * conexão GITHUB ativa (checado em analysis.service.ts). Lê o código-fonte
   * do repositório (segredos commitados, dependências com CVE real via
   * manifesto, padrões de código inseguro). Só leitura — nunca escreve no
   * repositório. Nunca roda por padrão.
   */
  SOURCE_SECURITY_SCAN: "SOURCE_SECURITY_SCAN",
} as const;
export type AnalysisCategory =
  (typeof AnalysisCategory)[keyof typeof AnalysisCategory];

export const ALL_CATEGORIES: AnalysisCategory[] = Object.values(AnalysisCategory);

/** Severidade de um problema encontrado. Ordenável (maior = mais grave). */
export const Severity = {
  INFO: "INFO",
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  INFO: 0,
  LOW: 1,
  MEDIUM: 3,
  HIGH: 7,
  CRITICAL: 15,
};

/** Estado de um problema no fluxo de triagem. */
export const IssueStatus = {
  OPEN: "OPEN",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  FIXED: "FIXED",
  IGNORED: "IGNORED",
} as const;
export type IssueStatus = (typeof IssueStatus)[keyof typeof IssueStatus];

/** Ciclo de vida de uma análise. */
export const AnalysisStatus = {
  QUEUED: "QUEUED",
  CRAWLING: "CRAWLING",
  ANALYZING: "ANALYZING",
  AI_REVIEW: "AI_REVIEW",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type AnalysisStatus =
  (typeof AnalysisStatus)[keyof typeof AnalysisStatus];

/** Tipos de evidência capturados durante a análise. */
export const EvidenceType = {
  SCREENSHOT: "SCREENSHOT",
  VIDEO: "VIDEO",
  CONSOLE: "CONSOLE",
  NETWORK: "NETWORK",
  DOM: "DOM",
} as const;
export type EvidenceType = (typeof EvidenceType)[keyof typeof EvidenceType];

export const SubscriptionPlan = {
  FREE: "FREE",
  PRO: "PRO",
  BUSINESS: "BUSINESS",
  ENTERPRISE: "ENTERPRISE",
} as const;
export type SubscriptionPlan =
  (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

// [09/08/2026] AutonomyLevel / OrchestrationRunStatus / OrchestrationEventType
// removidos junto com o ciclo autônomo de Orquestração — ver CLAUDE.md.

export const AdapterKind = {
  MANUAL_BRIDGE: "MANUAL_BRIDGE",
  MCP: "MCP",
  GITHUB: "GITHUB",
  GITLAB: "GITLAB",
} as const;
export type AdapterKind = (typeof AdapterKind)[keyof typeof AdapterKind];

export const AdapterCapability = {
  ANALYZE: "ANALYZE",
  APPLY: "APPLY",
  OBSERVE: "OBSERVE",
} as const;
export type AdapterCapability =
  (typeof AdapterCapability)[keyof typeof AdapterCapability];
