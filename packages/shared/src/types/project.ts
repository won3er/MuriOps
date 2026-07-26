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
}

export interface UpdateProjectAutonomyRequest {
  autonomyLevel: AutonomyLevel;
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
