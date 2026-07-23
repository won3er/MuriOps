import type { EvidenceType } from "../enums.js";

export interface Evidence {
  id: string;
  type: EvidenceType;
  /** URL relativa servida pela API (ex.: /evidence/<analysisId>/<file>). */
  url: string;
  pageUrl: string | null;
  viewport: string | null;
  capturedAt: string;
  meta: Record<string, unknown> | null;
}
