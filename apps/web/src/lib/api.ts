import type {
  Analysis,
  AnalysisComparison,
  AnalysisDetail,
  AuthSession,
  Blueprint,
  BlueprintProviderName,
  BlueprintSummary,
  CreateBlueprintRequest,
  CreateProjectRequest,
  CreateRemediationPlanRequest,
  DashboardStats,
  IssueFilters,
  LoginRequest,
  Project,
  ProjectWithStats,
  RegisterRequest,
  RemediationItemStatus,
  RemediationPlan,
  RemediationSummary,
  StartAnalysisRequest,
} from "@qa-ai/shared";

const BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

const TOKEN_KEY = "qa-ai-token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      // Só envia Content-Type quando há body — Fastify rejeita
      // application/json com corpo vazio (ex.: DELETE sem payload).
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      /* ignore */
    }
    if (res.status === 401 && typeof window !== "undefined") clearToken();
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** URL absoluta para servir evidências (screenshots etc.). */
export function evidenceUrl(relativeUrl: string): string {
  return `${BASE}${relativeUrl}`;
}

export const api = {
  // ---- auth ----
  register: (body: RegisterRequest) =>
    request<AuthSession>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: LoginRequest) =>
    request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<AuthSession>("/auth/me"),

  // ---- projects ----
  listProjects: () => request<ProjectWithStats[]>("/projects"),
  createProject: (body: CreateProjectRequest) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  projectAnalyses: (id: string) =>
    request<Analysis[]>(`/projects/${id}/analyses`),
  projectRemediationPlans: (id: string) =>
    request<RemediationSummary[]>(`/projects/${id}/remediation-plans`),
  deleteProject: (id: string) =>
    request<void>(`/projects/${id}`, { method: "DELETE" }),

  // ---- analyses ----
  startAnalysis: (projectId: string, body: StartAnalysisRequest = {}) =>
    request<Analysis>(`/projects/${projectId}/analyses`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAnalysis: (id: string, filters: IssueFilters = {}) => {
    const q = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v) as [string, string][],
    ).toString();
    return request<AnalysisDetail>(`/analyses/${id}${q ? `?${q}` : ""}`);
  },
  updateIssueStatus: (issueId: string, status: string) =>
    request(`/issues/${issueId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  compare: (fromId: string, toId: string) =>
    request<AnalysisComparison>(`/analyses/${fromId}/compare/${toId}`),
  deleteAnalysis: (id: string) =>
    request<void>(`/analyses/${id}`, { method: "DELETE" }),
  /** Baixa o relatório em PDF (requer auth via header, por isso não é um <a href> direto). */
  downloadReportPdf: async (id: string, version: number) => {
    const token = getToken();
    const res = await fetch(`${BASE}/analyses/${id}/report.pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError("Falha ao gerar PDF", res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-qa-ai-v${version}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // ---- blueprints (pilar Projetar) ----
  listBlueprints: () => request<BlueprintSummary[]>("/blueprints"),
  createBlueprint: (body: CreateBlueprintRequest) =>
    request<Blueprint>("/blueprints", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getBlueprint: (id: string) => request<Blueprint>(`/blueprints/${id}`),
  regenerateBlueprint: (id: string, provider?: BlueprintProviderName) =>
    request<Blueprint>(`/blueprints/${id}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ provider }),
    }),
  deleteBlueprint: (id: string) =>
    request<void>(`/blueprints/${id}`, { method: "DELETE" }),
  /** Baixa o relatório em PDF do blueprint. */
  downloadBlueprintPdf: async (id: string, title: string) => {
    const token = getToken();
    const res = await fetch(`${BASE}/blueprints/${id}/report.pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError("Falha ao gerar PDF", res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blueprint-${title.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // ---- aplicação (RemediationPlan) ----
  createRemediationPlan: (body: CreateRemediationPlanRequest) =>
    request<RemediationPlan>("/remediation-plans", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getRemediationPlan: (id: string) =>
    request<RemediationPlan>(`/remediation-plans/${id}`),
  updateRemediationItem: (id: string, itemId: string, status: RemediationItemStatus) =>
    request<RemediationPlan>(`/remediation-plans/${id}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  deleteRemediationPlan: (id: string) =>
    request<void>(`/remediation-plans/${id}`, { method: "DELETE" }),
  /** Baixa o relatório em PDF do plano de aplicação. */
  downloadRemediationPdf: async (id: string) => {
    const token = getToken();
    const res = await fetch(`${BASE}/remediation-plans/${id}/report.pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError("Falha ao gerar PDF", res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aplicacao-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // ---- dashboard ----
  dashboard: () => request<DashboardStats>("/dashboard/stats"),

  // ---- configurações de IA ----
  getAiSettings: () =>
    request<{
      configured: boolean;
      provider: "claude" | "openai" | "gemini" | null;
      maskedKey: string | null;
    }>("/settings/ai"),
  saveAiSettings: (provider: "claude" | "openai" | "gemini", apiKey: string) =>
    request<void>("/settings/ai", {
      method: "PUT",
      body: JSON.stringify({ provider, apiKey }),
    }),
  deleteAiSettings: () => request<void>("/settings/ai", { method: "DELETE" }),
};
