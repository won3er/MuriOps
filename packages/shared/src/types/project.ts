import type { AutonomyLevel, SubscriptionPlan } from "../enums.js";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  url: string;
  ownerId: string;
  autonomyLevel: AutonomyLevel;
  createdAt: string;
  updatedAt: string;
  /** Consentimento pra "Teste Ativo Autorizado" — ver ACTIVE_SECURITY_TEST em enums.ts. */
  activeTestingConsent: boolean;
  activeTestingConsentAt: string | null;
}

export interface UpdateProjectAutonomyRequest {
  autonomyLevel: AutonomyLevel;
}

export interface UpdateActiveTestingConsentRequest {
  /**
   * true = declara ser proprietário do site ou ter autorização por escrito
   * do proprietário para testes ativos de segurança. false = revoga.
   */
  consent: boolean;
}

export interface ProjectWithStats extends Project {
  analysisCount: number;
  lastScore: number | null;
  lastAnalysisAt: string | null;
}

export interface Organization {
  id: string;
  name: string;
  plan: SubscriptionPlan;
}
