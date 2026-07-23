/**
 * Blueprint — pilar de PROJETAR (distinto de analisar sites existentes).
 * O usuário descreve um projeto (por formulário estruturado, canvas de nós ou
 * prompt livre) e a IA age como um QA sênior projetando o plano de
 * desenvolvimento com qualidade embutida: objetivos, arquitetura (Mermaid),
 * stack, estratégia de teste, matriz de risco, marcos, quality gates e um
 * radar de maturidade de QA.
 */

/** Como o usuário descreveu o projeto. */
export type BlueprintMode = "form" | "canvas" | "prompt";

export type BlueprintProviderName = "claude" | "openai" | "gemini";

export type BlueprintStatus = "PENDING" | "READY" | "FAILED";

/** Entrada por formulário estruturado + tags. */
export interface BlueprintFormInput {
  objective: string;
  appType: string; // ex.: "web app", "mobile", "API", "marketplace"
  features: string[];
  audience: string; // ex.: "B2B", "B2C", "interno"
  scale: string; // ex.: "MVP", "média", "alta"
  integrations: string[];
  constraints: string;
  compliance: string[]; // ex.: "LGPD", "PCI-DSS", "WCAG AA"
}

/** Nó do canvas visual (tela, serviço, banco, integração…). */
export interface BlueprintCanvasNode {
  id: string;
  type: string; // screen | service | database | integration | queue | external
  label: string;
  x: number;
  y: number;
}

export interface BlueprintCanvasEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface BlueprintCanvasInput {
  nodes: BlueprintCanvasNode[];
  edges: BlueprintCanvasEdge[];
  notes?: string;
}

/** União discriminada da entrada bruta conforme o modo. */
export type BlueprintInputPayload =
  | { mode: "form"; form: BlueprintFormInput }
  | { mode: "canvas"; canvas: BlueprintCanvasInput }
  | { mode: "prompt"; prompt: string };

// ---------- Resultado gerado pela IA ----------

export interface BlueprintObjectives {
  goal: string;
  scope: string;
  outOfScope: string;
  successCriteria: string[];
}

export interface BlueprintTechChoice {
  category: string; // ex.: "Frontend", "Backend", "Banco", "Infra", "Testes"
  choice: string;
  rationale: string;
  alternatives: string[];
}

export interface BlueprintTestStrategy {
  /** Distribuição percentual da pirâmide de testes (soma ~100). */
  pyramid: { unit: number; integration: number; e2e: number };
  approaches: string[]; // ex.: "TDD", "BDD", "testes de contrato"
  tooling: string[]; // ex.: "Vitest", "Playwright", "k6"
  environments: string[]; // ex.: "local", "staging", "prod-like"
}

export interface BlueprintTestCase {
  id: string;
  title: string;
  type: string; // unit | integration | e2e | performance | security | a11y
  priority: "P0" | "P1" | "P2" | "P3";
  given: string;
  when: string;
  then: string;
}

export interface BlueprintRisk {
  risk: string;
  category: string; // técnico | negócio | segurança | prazo | qualidade
  likelihood: number; // 1-5
  impact: number; // 1-5
  mitigation: string;
}

export interface BlueprintMilestone {
  name: string;
  durationWeeks: number;
  deliverables: string[];
  qaFocus: string;
}

export interface BlueprintQualityGate {
  stage: string; // ex.: "Pull Request", "Merge", "Deploy staging", "Release"
  criteria: string[];
  metric: string; // ex.: "cobertura de linhas"
  threshold: string; // ex.: "≥ 80%"
}

/** Radar de maturidade de QA — 0..100 por dimensão. */
export interface BlueprintMaturityDimension {
  dimension: string; // ex.: "Automação", "CI/CD", "Cobertura", "Observabilidade"
  score: number; // 0-100
}

export interface BlueprintNfr {
  category: string; // Performance | Segurança | Acessibilidade | Escalabilidade | Confiabilidade
  requirement: string;
  target: string; // ex.: "LCP < 2.5s", "99.9% uptime"
}

export interface BlueprintMetric {
  name: string; // ex.: "Lead time", "Change failure rate", "MTTR"
  target: string;
  why: string;
}

export interface BlueprintResult {
  summary: string;
  objectives: BlueprintObjectives;
  personas: string[];
  techStack: BlueprintTechChoice[];
  /** Diagrama de arquitetura em sintaxe Mermaid (graph/flowchart). */
  architectureMermaid: string;
  /** Fluxo do usuário / sequência em sintaxe Mermaid. */
  userFlowMermaid: string;
  testStrategy: BlueprintTestStrategy;
  testCases: BlueprintTestCase[];
  riskMatrix: BlueprintRisk[];
  milestones: BlueprintMilestone[];
  qualityGates: BlueprintQualityGate[];
  qaMaturityRadar: BlueprintMaturityDimension[];
  nfrs: BlueprintNfr[];
  metrics: BlueprintMetric[];
}

/** Registro persistido. */
export interface Blueprint {
  id: string;
  projectId: string | null;
  title: string;
  mode: BlueprintMode;
  provider: string;
  status: BlueprintStatus;
  input: BlueprintInputPayload;
  result: BlueprintResult | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Item enxuto para listagem. */
export interface BlueprintSummary {
  id: string;
  title: string;
  mode: BlueprintMode;
  provider: string;
  status: BlueprintStatus;
  createdAt: string;
  updatedAt: string;
}
