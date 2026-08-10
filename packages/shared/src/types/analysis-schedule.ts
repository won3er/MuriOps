import type { AnalysisCategory } from "../enums.js";

/**
 * Agendamento de Análise de Segurança — "Continuous Coverage" passivo (ver
 * schema.prisma). Reexecuta sozinho as categorias que não enviam requisição
 * ativa contra o site (DEEP_SECURITY, SOURCE_SECURITY_SCAN). Nunca inclui
 * ACTIVE_SECURITY_TEST — decisão explícita do usuário em 10/08/2026.
 */
export type AnalysisScheduleFrequency = "DAILY" | "WEEKLY";

/** Categorias permitidas num agendamento — validado também no backend, esta
 * lista aqui só evita que o frontend ofereça uma opção que seria recusada. */
export const SCHEDULABLE_CATEGORIES: AnalysisCategory[] = [
  "DEEP_SECURITY",
  "SOURCE_SECURITY_SCAN",
];

export interface AnalysisSchedule {
  id: string;
  projectId: string;
  categories: AnalysisCategory[];
  frequency: AnalysisScheduleFrequency;
  active: boolean;
  lastRunAt: string | null;
  lastRunAnalysisId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnalysisScheduleRequest {
  categories: AnalysisCategory[];
  frequency: AnalysisScheduleFrequency;
}

export interface UpdateAnalysisScheduleRequest {
  categories?: AnalysisCategory[];
  frequency?: AnalysisScheduleFrequency;
  active?: boolean;
}
