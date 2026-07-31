import type {
  Analysis,
  AdapterConnection,
  AnalysisComparison,
  AnalysisDetail,
  AnalysisSummary,
  AuthSession,
  Blueprint,
  BlueprintProviderName,
  BlueprintSummary,
  CreateBlueprintRequest,
  CreateOrchestrationRunRequest,
  CreateProjectRequest,
  CreateRemediationPlanRequest,
  DashboardStats,
  IssueFilters,
  LoginRequest,
  OrchestrationEvent,
  OrchestrationRun,
  HumanCheckResponse,
  Project,
  ProjectQualityGate,
  ProjectWithStats,
  RegisterRequest,
  RemediationItemStatus,
  RemediationPlan,
  RemediationSummary,
  StartAnalysisRequest,
  CreateUpgradePlanRequest,
  UpgradeItemStatus,
  UpgradePlan,
  UpgradeSummary,
} from "@qa-ai/shared";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
export const api = {
  // ---- auth ----
  register: (body: RegisterRequest) =>
    request<AuthSession>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getHumanCheck: () =>
    request<HumanCheckResponse>("/auth/human-check"),
  login: (body: LoginRequest) =>
    request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  loginWithGoogle: (credential: string, acceptTerms: true) =>
    request<AuthSession>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential, acceptTerms }),
    }),
  me: () => request<AuthSession>("/auth/me"),
  downloadAccountData: async () => {
    const token = getToken();
    const res = await fetch(`${BASE}/account/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) {
      let message = "Falha ao exportar os dados";
      try {
        const body = await res.json();
        message = body.message ?? message;
      } catch {
        /* resposta sem JSON */
      }
      throw new ApiError(message, res.status);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `muriops-dados-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  deleteAccount: (body: {
    confirmationEmail: string;
    confirmationPhrase: string;
    password?: string;
    googleCredential?: string;
  }) =>
    request<void>("/account", {
      method: "DELETE",
      body: JSON.stringify(body),
    }),

  // ---- projects ----
  listProjects: () => request<ProjectWithStats[]>("/projects"),
  createProject: (body: CreateProjectRequest) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getProject: (id: string) => request<ProjectWithStats>(`/projects/${id}`),
  projectAnalyses: (id: string) =>
    request<Analysis[]>(`/projects/${id}/analyses`),
  projectRemediationPlans: (id: string) =>
    request<RemediationSummary[]>(`/projects/${id}/remediation-plans`),
  deleteProject: (id: string) =>
    request<void>(`/projects/${id}`, { method: "DELETE" }),
  updateProjectAutonomy: (
    id: string,
    autonomyLevel: Project["autonomyLevel"],
  ) =>
    request<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ autonomyLevel }),
    }),

  updateActiveTestingConsent: (id: string, consent: boolean) =>
    request<Project>(`/projects/${id}/active-testing-consent`, {
      method: "PATCH",
      body: JSON.stringify({ consent }),
    }),

  // ---- adapter MCP (Fase 1) ----
  getMcpConnection: (projectId: string) =>
    request<(AdapterConnection & { mcpUrl: string }) | { configured: false }>(
      `/projects/${projectId}/mcp-connection`,
    ),
  connectMcp: (projectId: string) =>
    request<AdapterConnection & { mcpUrl: string }>(
      `/projects/${projectId}/mcp-connection`,
      { method: "POST" },
    ),
  regenerateMcpToken: (projectId: string) =>
    request<AdapterConnection & { mcpUrl: string }>(
      `/projects/${projectId}/mcp-connection/regenerate`,
      { method: "POST" },
    ),
  disconnectMcp: (projectId: string) =>
    request<void>(`/projects/${projectId}/mcp-connection`, {
      method: "DELETE",
    }),

  // ---- adapter GitHub (Fase 2) ----
  getGithubConnection: (projectId: string) =>
    request<
      | (AdapterConnection & { maskedToken: string | null; webhookUrl: string })
      | { configured: false }
    >(`/projects/${projectId}/github-connection`),
  connectGithub: (
    projectId: string,
    body: { owner: string; repo: string; token: string },
  ) =>
    request<AdapterConnection & { webhookSecret: string; webhookUrl: string }>(
      `/projects/${projectId}/github-connection`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  // ---- conexões do projeto (seletor de adapter na Orquestração) ----
  listAdapterConnections: (projectId: string) =>
    request<AdapterConnection[]>(`/projects/${projectId}/adapter-connections`),

  // ---- quality gates (Fase 3) ----
  listQualityGates: (projectId: string) =>
    request<ProjectQualityGate[]>(`/projects/${projectId}/quality-gates`),
  createQualityGate: (
    projectId: string,
    body: { category?: string | null; minScore: number; label?: string },
  ) =>
    request<ProjectQualityGate>(`/projects/${projectId}/quality-gates`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteQualityGate: (projectId: string, gateId: string) =>
    request<void>(`/projects/${projectId}/quality-gates/${gateId}`, {
      method: "DELETE",
    }),

  // ---- orquestrador (Fase 3) ----
  listOrchestrationRuns: (projectId: string) =>
    request<OrchestrationRun[]>(`/projects/${projectId}/orchestration-runs`),
  createOrchestrationRun: (
    projectId: string,
    body: CreateOrchestrationRunRequest = {},
  ) =>
    request<OrchestrationRun>(`/projects/${projectId}/orchestration-runs`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getOrchestrationRun: (id: string) =>
    request<OrchestrationRun>(`/orchestration-runs/${id}`),
  listOrchestrationEvents: (id: string) =>
    request<OrchestrationEvent[]>(`/orchestration-runs/${id}/events`),
  approveOrchestrationRun: (id: string) =>
    request<OrchestrationRun>(`/orchestration-runs/${id}/approve`, {
      method: "POST",
    }),
  cancelOrchestrationRun: (id: string) =>
    request<OrchestrationRun>(`/orchestration-runs/${id}/cancel`, {
      method: "POST",
    }),

  // ---- analyses ----
  /** Hub "Análise": todas as análises da organização, qualquer projeto. */
  listAnalyses: () => request<AnalysisSummary[]>("/analyses"),
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
  openEvidence: async (relativeUrl: string) => {
    if (!relativeUrl.startsWith("/evidence/")) {
      throw new ApiError("Endereço de evidência inválido", 400);
    }
    const token = getToken();
    const res = await fetch(`${BASE}${relativeUrl}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) throw new ApiError("Falha ao abrir a evidência", res.status);
    const blobUrl = URL.createObjectURL(await res.blob());
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  },
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
  listRemediationPlans: () =>
    request<RemediationSummary[]>("/remediation-plans"),
  createRemediationPlan: (body: CreateRemediationPlanRequest) =>
    request<RemediationPlan>("/remediation-plans", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getRemediationPlan: (id: string) =>
    request<RemediationPlan>(`/remediation-plans/${id}`),
  updateRemediationItem: (
    id: string,
    itemId: string,
    status: RemediationItemStatus,
  ) =>
    request<RemediationPlan>(`/remediation-plans/${id}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  deleteRemediationPlan: (id: string) =>
    request<void>(`/remediation-plans/${id}`, { method: "DELETE" }),
  /** Texto do pacote da ponte universal (markdown p/ IA de dev). */
  fetchRemediationBridge: async (id: string): Promise<string> => {
    const token = getToken();
    const res = await fetch(`${BASE}/remediation-plans/${id}/bridge.md`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError("Falha ao gerar o pacote", res.status);
    return res.text();
  },
  /** Baixa o pacote da ponte universal como arquivo .md. */
  downloadRemediationBridge: async (id: string) => {
    const text = await api.fetchRemediationBridge(id);
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aplicacao-${id}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
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

  // ---- atualizar (UpgradePlan) ----
  listUpgradePlans: () => request<UpgradeSummary[]>("/upgrade-plans"),
  createUpgradePlan: (body: CreateUpgradePlanRequest) =>
    request<UpgradePlan>("/upgrade-plans", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createUpgradePlanFromGithub: (projectId: string) =>
    request<UpgradePlan>(`/projects/${projectId}/upgrade-plans/from-github`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  getUpgradePlan: (id: string) => request<UpgradePlan>(`/upgrade-plans/${id}`),
  updateUpgradeItem: (id: string, itemId: string, status: UpgradeItemStatus) =>
    request<UpgradePlan>(`/upgrade-plans/${id}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  deleteUpgradePlan: (id: string) =>
    request<void>(`/upgrade-plans/${id}`, { method: "DELETE" }),
  /** Texto do pacote da ponte universal (markdown p/ IA de dev). */
  fetchUpgradeBridge: async (id: string): Promise<string> => {
    const token = getToken();
    const res = await fetch(`${BASE}/upgrade-plans/${id}/bridge.md`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError("Falha ao gerar o pacote", res.status);
    return res.text();
  },
  /** Baixa o pacote da ponte universal como arquivo .md. */
  downloadUpgradeBridge: async (id: string) => {
    const text = await api.fetchUpgradeBridge(id);
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atualizacao-${id}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  /** Baixa o relatório em PDF do plano de atualização. */
  downloadUpgradePdf: async (id: string) => {
    const token = getToken();
    const res = await fetch(`${BASE}/upgrade-plans/${id}/report.pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError("Falha ao gerar PDF", res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atualizacao-${id}.pdf`;
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
