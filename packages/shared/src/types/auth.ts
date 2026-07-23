import type { SubscriptionPlan } from "../enums.js";

export interface User {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
  plan: SubscriptionPlan;
}

export interface JwtPayload {
  sub: string;
  organizationId: string;
  email: string;
}
