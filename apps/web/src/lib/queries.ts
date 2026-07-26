"use client";

import type {
  AutonomyLevel,
  Blueprint,
  BlueprintProviderName,
  BlueprintSummary,
  CreateBlueprintRequest,
  CreateOrchestrationRunRequest,
  CreateProjectRequest,
  CreateRemediationPlanRequest,
  OrchestrationRun,
  Project,
  ProjectWithStats,
  RemediationItemStatus,
  RemediationPlan,
} from "@qa-ai/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./api";

/** Chaves de cache centralizadas — evita strings soltas e erros de digitação. */
export const qk = {
  blueprints: ["blueprints"] as const,
  blueprint: (id: string) => ["blueprint", id] as const,
  projects: ["projects"] as const,
  dashboard: ["dashboard"] as const,
  remediationPlan: (id: string) => ["remediation-plan", id] as const,
  remediationPlans: ["remediation-plans"] as const,
  projectRemediationPlans: (projectId: string) =>
    ["remediation-plans", "project", projectId] as const,
  mcpConnection: (projectId: string) => ["mcp-connection", projectId] as const,
  githubConnection: (projectId: string) => ["github-connection", projectId] as const,
  orchestrationRuns: (projectId: string) => ["orchestration-runs", projectId] as const,
  orchestrationRun: (id: string) => ["orchestration-run", id] as const,
  orchestrationEvents: (id: string) => ["orchestration-events", id] as const,
  qualityGates: (projectId: string) => ["quality-gates", projectId] as const,
};

/** Estados em que o loop ainda está em andamento — mantém o polling ligado. */
const ACTIVE_RUN_STATUSES = new Set([
  "QUEUED",
  "ANALYZING",
  "EVALUATING_GATES",
  "PLANNING",
  "APPLYING",
  "REANALYZING",
]);

// ---------- Blueprints ----------

export function useBlueprints() {
  return useQuery({ queryKey: qk.blueprints, queryFn: api.listBlueprints });
}

/**
 * Detalhe do blueprint. Enquanto está PENDING, faz polling a cada 2.5s até
 * virar READY/FAILED — é assim que a geração assíncrona aparece pronta na tela.
 */
export function useBlueprint(id: string) {
  return useQuery({
    queryKey: qk.blueprint(id),
    queryFn: () => api.getBlueprint(id),
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING" ? 2500 : false,
  });
}

export function useCreateBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBlueprintRequest) => api.createBlueprint(body),
    onSuccess: (bp) => {
      qc.setQueryData<Blueprint>(qk.blueprint(bp.id), bp);
      qc.invalidateQueries({ queryKey: qk.blueprints });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Falha ao gerar blueprint"),
  });
}

export function useRegenerateBlueprint(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider?: BlueprintProviderName) =>
      api.regenerateBlueprint(id, provider),
    onSuccess: (bp) => {
      qc.setQueryData<Blueprint>(qk.blueprint(id), bp);
      qc.invalidateQueries({ queryKey: qk.blueprints });
      toast.message("Regerando o plano com a IA…");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Falha ao regerar"),
  });
}

export function useDeleteBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBlueprint(id),
    // Optimistic: some da lista na hora; restaura se falhar.
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.blueprints });
      const prev = qc.getQueryData<BlueprintSummary[]>(qk.blueprints);
      qc.setQueryData<BlueprintSummary[]>(qk.blueprints, (old) =>
        (old ?? []).filter((b) => b.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.blueprints, ctx.prev);
      toast.error("Falha ao apagar blueprint");
    },
    onSuccess: () => toast.success("Blueprint apagado"),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.blueprints }),
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
      const allDone = items.length > 0 && items.every((i) => i.status === "done");
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
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar item"),
  });
}

export function useDeleteRemediationPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteRemediationPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["remediation-plans"] });
      toast.success("Aplicação apagada");
    },
    onError: () => toast.error("Falha ao apagar Aplicação"),
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
      toast.error(err instanceof Error ? err.message : "Falha ao criar projeto"),
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

export function useUpdateProjectAutonomy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, autonomyLevel }: { id: string; autonomyLevel: AutonomyLevel }) =>
      api.updateProjectAutonomy(id, autonomyLevel),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: qk.projects });
      qc.setQueryData<Project>(["project", project.id], project);
      toast.success("Nível de autonomia atualizado");
    },
    onError: () => toast.error("Falha ao atualizar o nível de autonomia"),
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
      toast.success("Conexão GitHub criada");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Falha ao conectar o GitHub"),
  });
}

// ---------- Orquestrador (Fase 3) ----------

export function useOrchestrationRuns(projectId: string) {
  return useQuery({
    queryKey: qk.orchestrationRuns(projectId),
    queryFn: () => api.listOrchestrationRuns(projectId),
    enabled: !!projectId,
  });
}

/** Polling ativo enquanto o run está em andamento; para quando parado esperando humano/adapter ou terminal. */
export function useOrchestrationRun(id: string) {
  return useQuery({
    queryKey: qk.orchestrationRun(id),
    queryFn: () => api.getOrchestrationRun(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return false;
      return ACTIVE_RUN_STATUSES.has(status) ? 2000 : status === "AWAITING_APPLY" ? 4000 : false;
    },
  });
}

export function useOrchestrationEvents(id: string) {
  return useQuery({
    queryKey: qk.orchestrationEvents(id),
    queryFn: () => api.listOrchestrationEvents(id),
    enabled: !!id,
    refetchInterval: 3000,
  });
}

export function useCreateOrchestrationRun(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrchestrationRunRequest = {}) =>
      api.createOrchestrationRun(projectId, body),
    onSuccess: (run) => {
      qc.setQueryData<OrchestrationRun>(qk.orchestrationRun(run.id), run);
      qc.invalidateQueries({ queryKey: qk.orchestrationRuns(projectId) });
      toast.success("Execução iniciada");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Falha ao iniciar a execução"),
  });
}

export function useApproveOrchestrationRun(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.approveOrchestrationRun(id),
    onSuccess: (run) => {
      qc.setQueryData(qk.orchestrationRun(id), run);
      qc.invalidateQueries({ queryKey: qk.orchestrationEvents(id) });
      toast.success("Aprovado — reanalisando");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Falha ao aprovar"),
  });
}

export function useCancelOrchestrationRun(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.cancelOrchestrationRun(id),
    onSuccess: (run) => {
      qc.setQueryData(qk.orchestrationRun(id), run);
      toast.message("Execução cancelada");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Falha ao cancelar"),
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
    mutationFn: (body: { category?: string | null; minScore: number; label?: string }) =>
      api.createQualityGate(projectId, body),
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
