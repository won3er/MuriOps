import type {
  AnalysisCategory,
  BlueprintResult,
  Severity,
} from "@qa-ai/shared";
import type { BlueprintDesignInput } from "./blueprint-prompt.js";

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
   * Projeta um plano de desenvolvimento com QA embutido (pilar Projetar).
   * Recebe a descrição do projeto e devolve o blueprint estruturado.
   */
  designBlueprint(input: BlueprintDesignInput): Promise<BlueprintResult>;
}
