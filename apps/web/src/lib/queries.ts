"use client";

import type {
  Blueprint,
  BlueprintProviderName,
  BlueprintSummary,
  CreateBlueprintRequest,
  CreateProjectRequest,
  ProjectWithStats,
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
};

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

// ---------- Dashboard ----------

export function useDashboard() {
  return useQuery({ queryKey: qk.dashboard, queryFn: api.dashboard });
}
