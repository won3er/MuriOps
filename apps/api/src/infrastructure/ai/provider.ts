import type {
  AnalysisCategory,
  RemediationResult,
  Severity,
  UpgradeResult,
} from "@qa-ai/shared";
import type { RemediationDesignInput } from "./remediation-prompt.js";
import type { UpgradeDesignInput } from "./upgrade-prompt.js";

/** Um problema bruto detectado pelos módulos, entregue à IA para enriquecer. */
export interface AiIssueInput {
  fingerprint: string;
  title: string;
  description: string;
  category: AnalysisCategory;
  severity: Severity;
  pageUrl: string | null;
  selector: string | null;
  raw: string | null;
}

export interface AiAnalysisInput {
  siteUrl: string;
  pagesDiscovered: number;
  categoryScores: Record<string, number>;
  overallScore: number;
  issues: AiIssueInput[];
}

/** Enriquecimento produzido pela IA para um problema específico. */
export interface AiIssueEnrichment {
  fingerprint: string;
  /** false = a IA julgou como falso positivo/irrelevante; o problema é marcado como ignorado. */
  valid: boolean;
  impact: string;
  suggestion: string;
  stepsToReproduce: string[];
  /** A IA pode reavaliar severidade; ignorado se ausente. */
  severity?: Severity;
}

export interface AiAnalysisResult {
  /** Resumo executivo em linguagem profissional. */
  summary: string;
  enrichments: AiIssueEnrichment[];
}

/**
 * Contrato de provider de IA. Implementações: Claude (Fable), OpenAI, noop.
 * O engine não conhece o provider concreto — injeção via factory.
 */
export interface AiProvider {
  readonly name: string;
  enrichAnalysis(input: AiAnalysisInput): Promise<AiAnalysisResult>;
  /**
   * Transforma achados de uma análise num plano de aplicação concreto — o
   * checklist do pilar Aplicação.
   */
  buildRemediationPlan(input: RemediationDesignInput): Promise<RemediationResult>;
  /**
   * Analisa um package.json e devolve um plano de atualização de dependências
   * (pilar Atualizar) — risco, breaking changes e passo a passo por pacote.
   */
  buildUpgradePlan(input: UpgradeDesignInput): Promise<UpgradeResult>;
}
