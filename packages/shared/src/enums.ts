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

/** Nível de autonomia do orquestrador. Padrão MANUAL: toda aplicação de mudança pede aprovação humana. */
export const AutonomyLevel = {
  MANUAL: "MANUAL",
  SUPERVISED: "SUPERVISED",
  AUTONOMOUS: "AUTONOMOUS",
} as const;
export type AutonomyLevel = (typeof AutonomyLevel)[keyof typeof AutonomyLevel];

/** Ciclo de vida de um OrchestrationRun. */
export const OrchestrationRunStatus = {
  QUEUED: "QUEUED",
  ANALYZING: "ANALYZING",
  EVALUATING_GATES: "EVALUATING_GATES",
  PLANNING: "PLANNING",
  AWAITING_APPLY: "AWAITING_APPLY",
  APPLYING: "APPLYING",
  AWAITING_OBSERVATION: "AWAITING_OBSERVATION",
  REANALYZING: "REANALYZING",
  PASSED: "PASSED",
  STOPPED: "STOPPED",
  FAILED: "FAILED",
} as const;
export type OrchestrationRunStatus =
  (typeof OrchestrationRunStatus)[keyof typeof OrchestrationRunStatus];

/** Estados ativos de um run — usados na recuperação de boot (mesma ideia de recoverStaleAnalyses). */
export const ACTIVE_ORCHESTRATION_STATUSES: OrchestrationRunStatus[] = [
  OrchestrationRunStatus.ANALYZING,
  OrchestrationRunStatus.EVALUATING_GATES,
  OrchestrationRunStatus.PLANNING,
  OrchestrationRunStatus.APPLYING,
  OrchestrationRunStatus.REANALYZING,
];

export const OrchestrationEventType = {
  RUN_STARTED: "RUN_STARTED",
  ANALYSIS_STARTED: "ANALYSIS_STARTED",
  ANALYSIS_COMPLETED: "ANALYSIS_COMPLETED",
  GATE_EVALUATED: "GATE_EVALUATED",
  PLAN_GENERATED: "PLAN_GENERATED",
  APPLY_REQUESTED: "APPLY_REQUESTED",
  APPLY_APPROVED: "APPLY_APPROVED",
  APPLY_COMPLETED: "APPLY_COMPLETED",
  OBSERVATION_RECEIVED: "OBSERVATION_RECEIVED",
  ITERATION_ADVANCED: "ITERATION_ADVANCED",
  RUN_PASSED: "RUN_PASSED",
  RUN_STOPPED: "RUN_STOPPED",
  RUN_FAILED: "RUN_FAILED",
} as const;
export type OrchestrationEventType =
  (typeof OrchestrationEventType)[keyof typeof OrchestrationEventType];

export const AdapterKind = {
  MANUAL_BRIDGE: "MANUAL_BRIDGE",
  MCP: "MCP",
  GITHUB: "GITHUB",
  // Adapters push que aplicam de verdade na plataforma do site (Fase 4).
  WORDPRESS: "WORDPRESS",
  SHOPIFY: "SHOPIFY",
  NUVEMSHOP: "NUVEMSHOP",
  // Hostinger/Hostgator (e qualquer host com acesso a arquivo) via FTP/FTPS.
  FTP: "FTP",
} as const;
export type AdapterKind = (typeof AdapterKind)[keyof typeof AdapterKind];

export const AdapterCapability = {
  ANALYZE: "ANALYZE",
  APPLY: "APPLY",
  OBSERVE: "OBSERVE",
} as const;
export type AdapterCapability =
  (typeof AdapterCapability)[keyof typeof AdapterCapability];
