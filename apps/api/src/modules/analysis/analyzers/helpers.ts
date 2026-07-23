import type {
  AnalysisCategory,
  DetectedIssue,
  Severity,
} from "@qa-ai/shared";
import { fingerprint, pageKey } from "../fingerprint.js";

/** Cria um DetectedIssue com fingerprint estável derivado dos campos-chave. */
export function issue(params: {
  title: string;
  description: string;
  category: AnalysisCategory;
  severity: Severity;
  pageUrl?: string | null;
  selector?: string | null;
  raw?: string | null;
  /** Partes extras para diferenciar o fingerprint (ex.: url do recurso). */
  fingerprintExtra?: string[];
}): DetectedIssue {
  const fp = fingerprint(
    params.category,
    params.title,
    params.selector ?? "",
    params.pageUrl ? pageKey(params.pageUrl) : "",
    ...(params.fingerprintExtra ?? []),
  );

  return {
    title: params.title,
    description: params.description,
    category: params.category,
    severity: params.severity,
    pageUrl: params.pageUrl ?? null,
    selector: params.selector ?? null,
    raw: params.raw ?? null,
    stepsToReproduce: [],
    impact: null,
    suggestion: null,
    fingerprint: fp,
  };
}
