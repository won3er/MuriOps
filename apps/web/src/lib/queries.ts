"use client";

import type {
  CreateProjectRequest,
  CreateRemediationPlanRequest,
  CreateCriticalFlowRequest,
  UpdateCriticalFlowRequest,
  CriticalFlow,
  AnalysisSchedule,
  CreateAnalysisScheduleRequest,
  UpdateAnalysisScheduleRequest,
  Project,
  ProjectionTask,
  ProjectWithStats,
  RemediationItemStatus,
  RemediationPlan,
  RemediationSummary,
  CreateUpgradePlanRequest,
  UpgradeItemStatus,
  UpgradePlan,
  UpgradeSummary,
} from "@qa-ai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./api";

/** Chaves de cache centralizadas — evita strings soltas e erros de digitação. */
export const qk = {
  projectionTasks: (remediationPlanId: string) => ["projection-tasks", remediationPlanId] as const,
  projects: ["projects"] as const,
  dashboard: ["dashboard"] as const,
  remediationPlan: (id: string) => ["remediation-plan", id] as const,
  remediationPlans: ["remediation-plans"] as const,
  projectRemediationPlans: (projectId: string) =>
    ["remediation-plans", "project", projectId] as const,
  upgradePlan: (id: string) => ["upgrade-plan", id] as const,
  upgradePlans: ["upgrade-plans"] as const,
  mcpConnection: (projectId: string) => ["mcp-connection", projectId] as const,
  githubConnection: (projectId: string) =>
    ["github-connection", projectId] as const,
  gitlabConnection: (projectId: string) =>
    ["gitlab-connection", projectId] as const,
  adapterConnections: (projectId: string) =>
    ["adapter-connections", projectId] as const,
  reconciliation: (projectId: string) => ["reconciliation", projectId] as const,
  qualityGates: (projectId: string) => ["quality-gates", projectId] as const,
  emailSettings: ["email-settings"] as const,
  criticalFlows: (projectId: string) => ["critical-flows", projectId] as const,
  criticalFlow: (id: string) => ["critical-flow", id] as const,
  flowRuns: (id: string) => ["flow-runs", id] as const,
  analysisSchedules: (projectId: string) => ["analysis-schedules", projectId] as const,
};

// ---------- Projeção (tarefas rastreáveis a partir de um plano de Aplicação) ----------

/** Lista de tarefas de Projeção — polling leve enquanto houver alguma IN_PROGRESS aguardando sync com o GitHub. */
export function useProjectionTasks(remediationPlanId: string) {
  return useQuery({
    queryKey: qk.projectionTasks(remediationPlanId),
    queryFn: () => api.listProjectionTasks(remediationPlanId),
    enabled: !!remediationPlanId,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((t) => t.status === "IN_PROGRESS") ? 15_000 : false,
  });
}

export function useGenerateProjectionTasks(remediationPlanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (createIssuesNow: boolean) =>
      api.generateProjectionTasks(remediationPlanId, createIssuesNow),
    onSuccess: (tasks) => {
      qc.setQueryData<ProjectionTask[]>(qk.projectionTasks(remediationPlanId), tasks);
      toast.success("Tarefas de Projeção geradas a partir do plano");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Falha ao gerar tarefas"),
  });
}

export function useCreateProjectionTask(remediationPlanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description: string }) =>
      api.createProjectionTask(remediationPlanId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.projectionTasks(remediationPlanId) }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha ao criar tarefa"),
  });
}

export function useCreateProjectionIssue(remediationPlanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.createProjectionIssue(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projectionTasks(remediationPlanId) });
      toast.success("Issue criada no GitHub");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Falha ao criar issue no GitHub"),
  });
}

export function useDeleteProjectionTask(remediationPlanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.deleteProjectionTask(taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.projectionTasks(remediationPlanId) }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha ao apagar tarefa"),
  });
}

// ---------- Fluxos Críticos (monitoramento sintético de jornadas) ----------

export function useCriticalFlows(projectId: string) {
  return useQuery({
    queryKey: qk.criticalFlows(projectId),
    queryFn: () => api.listCriticalFlows(projectId),
    enabled: !!projectId,
  });
}

export function useCriticalFlow(id: string) {
  return useQuery({
    queryKey: qk.criticalFlow(id),
    queryFn: () => api.getCriticalFlow(id),
    enabled: !!id,
  });
}

export function useFlowRuns(id: string) {
  return useQuery({
    queryKey: qk.flowRuns(id),
    queryFn: () => api.listFlowRuns(id),
    enabled: !!id,
    refetchInterval: 20_000,
  });
}

export function useCreateCriticalFlow(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCriticalFlowRequest) => api.createCriticalFlow(projectId, body),
    onSuccess: (flow) => {
      qc.setQueryData<CriticalFlow>(qk.criticalFlow(flow.id), flow);
      qc.invalidateQueries({ queryKey: qk.criticalFlows(projectId) });
      toast.success("Fluxo crítico criado");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha ao criar fluxo crítico"),
  });
}

export function useUpdateCriticalFlow(id: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCriticalFlowRequest) => api.updateCriticalFlow(id, body),
    onSuccess: (flow) => {
      qc.setQueryData<CriticalFlow>(qk.criticalFlow(id), flow);
      qc.invalidateQueries({ queryKey: qk.criticalFlows(projectId) });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha ao atualizar fluxo crítico"),
  });
}

export function useDeleteCriticalFlow(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCriticalFlow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.criticalFlows(projectId) }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha ao apagar fluxo crítico"),
  });
}

export function useRunCriticalFlowNow(id: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.runCriticalFlowNow(id),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: qk.flowRuns(id) });
      qc.invalidateQueries({ queryKey: qk.criticalFlow(id) });
      qc.invalidateQueries({ queryKey: qk.criticalFlows(projectId) });
      toast[run.status === "PASSED" ? "success" : "error"](
        run.status === "PASSED" ? "Fluxo passou" : `Fluxo falhou: ${run.errorMessage ?? "erro desconhecido"}`,
      );
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha ao rodar fluxo"),
  });
}

// ---------- Aplicação (RemediationPlan) ----------

/**
 * Detalhe da Aplicação.
 * - PENDING: polling a cada 2.5s até virar READY/FAILED (geração da IA).
 * - READY com itens pendentes: polling a cada 4s — é assim que os "Feito"
 *   marcados pela IA do ambiente de dev (ponte universal) aparecem em tempo
 *   real na tela, sem o usuário recarregar.
 */
export function useRemediationPlan(id: string) {
  return useQuery({
    queryKey: qk.remediationPlan(id),
    queryFn: () => api.getRemediationPlan(id),
    refetchInterval: (query) => {
      const plan = query.state.data;
      if (!plan) return false;
      if (plan.status === "PENDING") return 2500;
      const items = plan.result?.items ?? [];
      const allDone =
        items.length > 0 && items.every((i) => i.status === "done");
      return plan.status === "READY" && !allDone ? 4000 : false;
    },
  });
}

/** Lista geral de Aplicações (seção do menu). Atualiza enquanto houver geração em andamento. */
export function useRemediationPlans() {
  return useQuery({
    queryKey: qk.remediationPlans,
    queryFn: api.listRemediationPlans,
    refetchInterval: (query) =>
      query.state.data?.some((p) => p.status === "PENDING") ? 3000 : false,
  });
}

export function useProjectRemediationPlans(projectId: string) {
  return useQuery({
    queryKey: qk.projectRemediationPlans(projectId),
    queryFn: () => api.projectRemediationPlans(projectId),
    enabled: !!projectId,
  });
}

export function useCreateRemediationPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRemediationPlanRequest) =>
      api.createRemediationPlan(body),
    onSuccess: (plan) => {
      qc.setQueryData<RemediationPlan>(qk.remediationPlan(plan.id), plan);
      qc.invalidateQueries({ queryKey: qk.remediationPlans });
      if (plan.projectId) {
        qc.invalidateQueries({
          queryKey: qk.projectRemediationPlans(plan.projectId),
        });
      }
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Falha ao gerar a Aplicação",
      ),
  });
}

export function useUpdateRemediationItem(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      status,
    }: {
      itemId: string;
      status: RemediationItemStatus;
    }) => api.updateRemediationItem(planId, itemId, status),
    onSuccess: (plan) => {
      qc.setQueryData<RemediationPlan>(qk.remediationPlan(planId), plan);
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Falha ao atualizar item",
      ),
  });
}

export function useDeleteRemediationPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteRemediationPlan(id),
    onSuccess: (_result, id) => {
      // A API confirma a exclusão com 204. Removemos do cache imediatamente
      // para que o histórico não mantenha um item que já não existe.
      qc.setQueriesData<RemediationSummary[]>(
        { queryKey: qk.remediationPlans },
        (plans) => plans?.filter((plan) => plan.id !== id),
      );
      qc.removeQueries({ queryKey: qk.remediationPlan(id) });
      qc.invalidateQueries({ queryKey: qk.remediationPlans });
      toast.success("Aplicação apagada");
    },
    onError: () => toast.error("Falha ao apagar Aplicação"),
  });
}

// ---------- Atualizar (UpgradePlan) ----------

/**
 * Detalhe da Atualização.
 * - PENDING: polling a cada 2.5s até virar READY/FAILED (geração da IA).
 * - READY com itens pendentes: polling a cada 4s — mesma lógica da Aplicação,
 *   pra refletir em tempo real itens marcados como feitos pela ponte universal.
 */
export function useUpgradePlan(id: string) {
  return useQuery({
    queryKey: qk.upgradePlan(id),
    queryFn: () => api.getUpgradePlan(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const plan = query.state.data;
      if (!plan) return false;
      if (plan.status === "PENDING") return 2500;
      const items = plan.result?.items ?? [];
      const allDone =
        items.length > 0 && items.every((i) => i.status === "done");
      return plan.status === "READY" && !allDone ? 4000 : false;
    },
  });
}

export function useUpgradePlans() {
  return useQuery({
    queryKey: qk.upgradePlans,
    queryFn: api.listUpgradePlans,
    refetchInterval: (query) =>
      query.state.data?.some((p) => p.status === "PENDING") ? 3000 : false,
  });
}

export function useCreateUpgradePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUpgradePlanRequest) => api.createUpgradePlan(body),
    onSuccess: (plan) => {
      qc.setQueryData<UpgradePlan>(qk.upgradePlan(plan.id), plan);
      qc.invalidateQueries({ queryKey: qk.upgradePlans });
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Falha ao gerar a Atualização",
      ),
  });
}

export function useCreateUpgradePlanFromGithub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      api.createUpgradePlanFromGithub(projectId),
    onSuccess: (plan) => {
      qc.setQueryData<UpgradePlan>(qk.upgradePlan(plan.id), plan);
      qc.invalidateQueries({ queryKey: qk.upgradePlans });
    },
    onError: (err) =>
      toast.error(
        err instanceof Error
          ? err.message
          : "Falha ao investigar o repositório no GitHub",
      ),
  });
}

export function useUpdateUpgradeItem(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      status,
    }: {
      itemId: string;
      status: UpgradeItemStatus;
    }) => api.updateUpgradeItem(planId, itemId, status),
    onSuccess: (plan) => {
      qc.setQueryData<UpgradePlan>(qk.upgradePlan(planId), plan);
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Falha ao atualizar item",
      ),
  });
}

export function useDeleteUpgradePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteUpgradePlan(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.upgradePlans });
      const prev = qc.getQueryData<UpgradeSummary[]>(qk.upgradePlans);
      qc.setQueryData<UpgradeSummary[]>(qk.upgradePlans, (old) =>
        (old ?? []).filter((p) => p.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.upgradePlans, ctx.prev);
      toast.error("Falha ao apagar Atualização");
    },
    onSuccess: () => toast.success("Atualização apagada"),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.upgradePlans }),
  });
}

// ---------- Análise (hub, todos os projetos) ----------

export function useAnalysesList() {
  return useQuery({
    queryKey: ["analyses"],
    queryFn: api.listAnalyses,
    refetchInterval: (query) =>
      query.state.data?.some((a) =>
        ["QUEUED", "CRAWLING", "ANALYZING", "AI_REVIEW"].includes(a.status),
      )
        ? 4000
        : false,
  });
}

/** Detalhe de uma análise (inclui páginas descobertas no crawl) — usado
 * pelas sugestões automáticas de Fluxos Críticos. */
export function useAnalysis(id: string) {
  return useQuery({
    queryKey: ["analyses", id],
    queryFn: () => api.getAnalysis(id),
    enabled: !!id,
  });
}

// ---------- Projetos ----------

export function useProjects() {
  return useQuery({ queryKey: qk.projects, queryFn: api.listProjects });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectRequest) => api.createProject(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects });
      toast.success("Projeto criado");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Falha ao criar projeto",
      ),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.projects });
      const prev = qc.getQueryData<ProjectWithStats[]>(qk.projects);
      qc.setQueryData<ProjectWithStats[]>(qk.projects, (old) =>
        (old ?? []).filter((p) => p.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.projects, ctx.prev);
      toast.error("Falha ao apagar projeto");
    },
    onSuccess: () => toast.success("Projeto apagado"),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.projects }),
  });
}

// ---------- Adapter MCP (Fase 1) ----------

export function useMcpConnection(projectId: string) {
  return useQuery({
    queryKey: qk.mcpConnection(projectId),
    queryFn: () => api.getMcpConnection(projectId),
    enabled: !!projectId,
    retry: false,
  });
}

export function useConnectMcp(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.connectMcp(projectId),
    onSuccess: (connection) => {
      qc.setQueryData(qk.mcpConnection(projectId), connection);
    },
    onError: () => toast.error("Falha ao criar a conexão MCP"),
  });
}

export function useRegenerateMcpToken(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.regenerateMcpToken(projectId),
    onSuccess: (connection) => {
      qc.setQueryData(qk.mcpConnection(projectId), connection);
      toast.message("Novo token gerado — o anterior parou de funcionar.");
    },
    onError: () => toast.error("Falha ao gerar novo token"),
  });
}

export function useDisconnectMcp(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.disconnectMcp(projectId),
    onSuccess: () => {
      qc.setQueryData(qk.mcpConnection(projectId), { configured: false });
      toast.message("Conexão MCP desconectada.");
    },
    onError: () => toast.error("Falha ao desconectar o MCP"),
  });
}

export function useGithubConnection(projectId: string) {
  return useQuery({
    queryKey: qk.githubConnection(projectId),
    queryFn: () => api.getGithubConnection(projectId),
    enabled: !!projectId,
    retry: false,
  });
}

export function useConnectGithub(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { owner: string; repo: string; token: string }) =>
      api.connectGithub(projectId, body),
    onSuccess: (connection) => {
      qc.setQueryData(qk.githubConnection(projectId), connection);
      qc.invalidateQueries({ queryKey: qk.adapterConnections(projectId) });
      toast.success("Conexão GitHub criada");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Falha ao conectar o GitHub",
      ),
  });
}

export function useGitlabConnection(projectId: string) {
  return useQuery({
    queryKey: qk.gitlabConnection(projectId),
    queryFn: () => api.getGitlabConnection(projectId),
    enabled: !!projectId,
    retry: false,
  });
}

export function useConnectGitlab(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { projectPath: string; token: string }) =>
      api.connectGitlab(projectId, body),
    onSuccess: (connection) => {
      qc.setQueryData(qk.gitlabConnection(projectId), connection);
      qc.invalidateQueries({ queryKey: qk.adapterConnections(projectId) });
      toast.success("Conexão GitLab criada");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Falha ao conectar o GitLab",
      ),
  });
}

export function useAdapterConnections(projectId: string) {
  return useQuery({
    queryKey: qk.adapterConnections(projectId),
    queryFn: () => api.listAdapterConnections(projectId),
    enabled: !!projectId,
  });
}

// ---------- Reconciliação (substitui o antigo orquestrador — ver CLAUDE.md) ----------

export function useReconciliation(projectId: string) {
  return useQuery({
    queryKey: qk.reconciliation(projectId),
    queryFn: () => api.getReconciliation(projectId),
    enabled: !!projectId,
  });
}

// ---------- Agendamento de Análise de Segurança (Continuous Coverage passivo) ----------

export function useAnalysisSchedules(projectId: string) {
  return useQuery({
    queryKey: qk.analysisSchedules(projectId),
    queryFn: () => api.listAnalysisSchedules(projectId),
    enabled: !!projectId,
  });
}

export function useCreateAnalysisSchedule(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAnalysisScheduleRequest) =>
      api.createAnalysisSchedule(projectId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.analysisSchedules(projectId) });
      toast.success("Agendamento criado");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Falha ao criar agendamento"),
  });
}

export function useUpdateAnalysisSchedule(id: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAnalysisScheduleRequest) => api.updateAnalysisSchedule(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.analysisSchedules(projectId) });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar agendamento"),
  });
}

export function useDeleteAnalysisSchedule(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAnalysisSchedule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.analysisSchedules(projectId) });
      toast.success("Agendamento removido");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Falha ao remover agendamento"),
  });
}

export function useQualityGates(projectId: string) {
  return useQuery({
    queryKey: qk.qualityGates(projectId),
    queryFn: () => api.listQualityGates(projectId),
    enabled: !!projectId,
  });
}

export function useCreateQualityGate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      category?: string | null;
      minScore: number;
      label?: string;
    }) => api.createQualityGate(projectId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.qualityGates(projectId) });
      toast.success("Quality gate criado");
    },
    onError: () => toast.error("Falha ao criar quality gate"),
  });
}

export function useDeleteQualityGate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (gateId: string) => api.deleteQualityGate(projectId, gateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.qualityGates(projectId) });
    },
    onError: () => toast.error("Falha ao apagar quality gate"),
  });
}

// ---------- Dashboard ----------

export function useDashboard() {
  return useQuery({ queryKey: qk.dashboard, queryFn: api.dashboard });
}

// [09/08/2026] Guardian removido — hooks apagados junto (ver CLAUDE.md).
