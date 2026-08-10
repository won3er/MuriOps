import type {
  Analysis,
  AdapterConnection,
  AnalysisComparison,
  AnalysisDetail,
  AnalysisSummary,
  AuthSession,
  CreateProjectRequest,
  CreateRemediationPlanRequest,
  CreateCriticalFlowRequest,
  UpdateCriticalFlowRequest,
  CriticalFlow,
  FlowRun,
  AnalysisSchedule,
  CreateAnalysisScheduleRequest,
  UpdateAnalysisScheduleRequest,
  ComplianceReport,
  DashboardStats,
  IssueFilters,
  LoginRequest,
  ProjectionTask,
  ReconciliationResult,
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

  // ---- adapter GitLab (mesmo padrão push do GitHub) ----
  getGitlabConnection: (projectId: string) =>
    request<
      | (AdapterConnection & { maskedToken: string | null })
      | { configured: false }
    >(`/projects/${projectId}/gitlab-connection`),
  connectGitlab: (
    projectId: string,
    body: { projectPath: string; token: string },
  ) =>
    request<AdapterConnection>(`/projects/${projectId}/gitlab-connection`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ---- conexões do projeto ----
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

  // ---- reconciliação (substitui o antigo orquestrador — ver CLAUDE.md) ----
  getReconciliation: (projectId: string) =>
    request<ReconciliationResult>(`/projects/${projectId}/reconciliation`),

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

  // ---- projeção (tarefas rastreáveis a partir de um plano de Aplicação) ----
  listProjectionTasks: (remediationPlanId: string) =>
    request<ProjectionTask[]>(`/remediation-plans/${remediationPlanId}/projection-tasks`),
  createProjectionTask: (remediationPlanId: string, body: { title: string; description: string }) =>
    request<ProjectionTask>(`/remediation-plans/${remediationPlanId}/projection-tasks`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  generateProjectionTasks: (remediationPlanId: string, createIssuesNow: boolean) =>
    request<ProjectionTask[]>(`/remediation-plans/${remediationPlanId}/projection-tasks/generate`, {
      method: "POST",
      body: JSON.stringify({ createIssuesNow }),
    }),
  createProjectionIssue: (taskId: string) =>
    request<ProjectionTask>(`/projection-tasks/${taskId}/create-issue`, { method: "POST" }),
  deleteProjectionTask: (taskId: string) =>
    request<void>(`/projection-tasks/${taskId}`, { method: "DELETE" }),

  // ---- fluxos críticos (monitoramento sintético de jornadas) ----
  listCriticalFlows: (projectId: string) =>
    request<CriticalFlow[]>(`/projects/${projectId}/critical-flows`),
  createCriticalFlow: (projectId: string, body: CreateCriticalFlowRequest) =>
    request<CriticalFlow>(`/projects/${projectId}/critical-flows`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getCriticalFlow: (id: string) => request<CriticalFlow>(`/critical-flows/${id}`),
  updateCriticalFlow: (id: string, body: UpdateCriticalFlowRequest) =>
    request<CriticalFlow>(`/critical-flows/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteCriticalFlow: (id: string) => request<void>(`/critical-flows/${id}`, { method: "DELETE" }),
  listFlowRuns: (id: string) => request<FlowRun[]>(`/critical-flows/${id}/runs`),
  runCriticalFlowNow: (id: string) =>
    request<FlowRun>(`/critical-flows/${id}/run-now`, { method: "POST" }),

  // ---- agendamento de análise de segurança (continuous coverage passivo) ----
  listAnalysisSchedules: (projectId: string) =>
    request<AnalysisSchedule[]>(`/projects/${projectId}/analysis-schedules`),
  createAnalysisSchedule: (projectId: string, body: CreateAnalysisScheduleRequest) =>
    request<AnalysisSchedule>(`/projects/${projectId}/analysis-schedules`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateAnalysisSchedule: (id: string, body: UpdateAnalysisScheduleRequest) =>
    request<AnalysisSchedule>(`/analysis-schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAnalysisSchedule: (id: string) =>
    request<void>(`/analysis-schedules/${id}`, { method: "DELETE" }),

  // ---- relatório de compliance (autoavaliação, não certificação) ----
  getComplianceReport: (projectId: string) =>
    request<ComplianceReport>(`/projects/${projectId}/compliance-report`),

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

  // ---- configurações de e-mail (Resend — usado pelos alertas de Fluxos Críticos) ----
  getEmailSettings: () =>
    request<{
      configured: boolean;
      provider: string | null;
      maskedKey: string | null;
      fromAddress: string | null;
    }>("/settings/email"),
  saveEmailSettings: (apiKey: string, fromAddress: string) =>
    request<void>("/settings/email", {
      method: "PUT",
      body: JSON.stringify({ apiKey, fromAddress }),
    }),
  deleteEmailSettings: () => request<void>("/settings/email", { method: "DELETE" }),
};
