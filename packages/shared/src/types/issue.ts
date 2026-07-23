import type {
  AnalysisCategory,
  IssueStatus,
  Severity,
} from "../enums.js";
import type { Evidence } from "./evidence.js";

export interface Issue {
  id: string;
  analysisId: string;
  title: string;
  description: string;
  category: AnalysisCategory;
  severity: Severity;
  status: IssueStatus;
  /** Página onde o problema foi detectado. */
  pageUrl: string | null;
  /** Seletor CSS / XPath do elemento afetado, quando aplicável. */
  selector: string | null;
  /** Passos para reproduzir (preenchidos pelo detector e enriquecidos pela IA). */
  stepsToReproduce: string[];
  /** Explicação de impacto e por quê — geralmente pela IA. */
  impact: string | null;
  /** Sugestão de correção — geralmente pela IA. */
  suggestion: string | null;
  /** Trecho bruto do console/network associado. */
  raw: string | null;
  evidence: Evidence[];
  /** Chave de detecção estável para comparar entre versões. */
  fingerprint: string;
  createdAt: string;
}

/** Forma emitida por um detector antes de persistir (sem ids do banco). */
export type DetectedIssue = Omit<
  Issue,
  "id" | "analysisId" | "status" | "evidence" | "createdAt"
> & {
  evidenceRefs?: string[];
};
