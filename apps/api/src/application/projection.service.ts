import type { ProjectionTask, RemediationResult } from "@qa-ai/shared";
import { decryptSecret } from "../infrastructure/crypto/secret-box.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { NotFoundError } from "./analysis.service.js";

const API_BASE = "https://api.github.com";

export class NoGithubConnectionError extends Error {
  readonly statusCode = 400;
}

/**
 * Projeção — decompõe os itens de um plano de Aplicação (RemediationPlan,
 * vindo de Análise ou Atualizar) em tarefas rastreáveis (`ProjectionTask`),
 * cada uma virando uma Issue no GitHub. Sincroniza por polling (ver
 * `syncAllPending`, chamado de main.ts) — quando a Issue fecha no GitHub, a
 * tarefa vira DONE aqui sozinha, sem o usuário precisar marcar nada
 * manualmente.
 *
 * [06/08/2026] Antes operava sobre marcos de um Blueprint (arquitetura
 * gerada a partir de descrição solta, sem evidência real). Passou a operar
 * sobre os itens de um RemediationPlan de verdade — ver CLAUDE.md.
 */
export const projectionService = {
  async listByPlan(
    organizationId: string,
    remediationPlanId: string,
  ): Promise<ProjectionTask[]> {
    const plan = await prisma.remediationPlan.findFirst({
      where: { id: remediationPlanId, organizationId },
      select: { id: true },
    });
    if (!plan) throw new NotFoundError("Aplicação não encontrada");

    const rows = await prisma.projectionTask.findMany({
      where: { remediationPlanId },
      orderBy: { order: "asc" },
    });
    return rows.map(toDto);
  },

  /**
   * Gera tarefas a partir dos itens do resultado do plano de Aplicação —
   * sem nova chamada de IA, só mapeamento determinístico. Se o plano ainda
   * não tiver resultado (não gerado, ou falhou), recusa com uma mensagem
   * clara em vez de criar vazio.
   */
  async generateFromPlan(
    organizationId: string,
    userId: string,
    remediationPlanId: string,
    createIssuesNow: boolean,
  ): Promise<ProjectionTask[]> {
    const plan = await prisma.remediationPlan.findFirst({
      where: { id: remediationPlanId, organizationId },
    });
    if (!plan) throw new NotFoundError("Aplicação não encontrada");
    if (!plan.projectId) {
      throw new NotFoundError(
        "Esta Aplicação não está vinculada a um projeto — a Projeção precisa de um projeto para criar as tarefas.",
      );
    }
    const result = plan.result as unknown as RemediationResult | null;
    const items = result?.items ?? [];
    if (items.length === 0) {
      throw new NotFoundError(
        "Este plano de Aplicação não tem itens para transformar em tarefas.",
      );
    }

    const created = await prisma.$transaction(
      items.map((item, index) =>
        prisma.projectionTask.create({
          data: {
            remediationPlanId,
            projectId: plan.projectId!,
            organizationId,
            title: item.title,
            description: [
              `Severidade: ${item.severity}`,
              item.filePath ? `Arquivo: ${item.filePath}` : "",
              item.description,
              item.howTo ? `Como aplicar:\n${item.howTo}` : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
            order: index,
            createdById: userId,
          },
        }),
      ),
    );

    if (createIssuesNow) {
      for (const task of created) {
        await createIssueForTask(task.id).catch(() => {
          // Erro já fica registrado em task.error por createIssueForTask — não interrompe as demais.
        });
      }
      const refreshed = await prisma.projectionTask.findMany({
        where: { remediationPlanId },
        orderBy: { order: "asc" },
      });
      return refreshed.map(toDto);
    }

    return created.map(toDto);
  },

  async createTask(
    organizationId: string,
    userId: string,
    remediationPlanId: string,
    input: { title: string; description: string },
  ): Promise<ProjectionTask> {
    const plan = await prisma.remediationPlan.findFirst({
      where: { id: remediationPlanId, organizationId },
      select: { id: true, projectId: true },
    });
    if (!plan) throw new NotFoundError("Aplicação não encontrada");
    if (!plan.projectId) {
      throw new NotFoundError(
        "Esta Aplicação não está vinculada a um projeto — a Projeção precisa de um projeto para criar tarefas.",
      );
    }
    const count = await prisma.projectionTask.count({ where: { remediationPlanId } });
    const row = await prisma.projectionTask.create({
      data: {
        remediationPlanId,
        projectId: plan.projectId,
        organizationId,
        title: input.title,
        description: input.description,
        order: count,
        createdById: userId,
      },
    });
    return toDto(row);
  },

  /** Cria (ou recria, se falhou antes) a Issue no GitHub pra esta tarefa. */
  async createIssue(organizationId: string, taskId: string): Promise<ProjectionTask> {
    const task = await prisma.projectionTask.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new NotFoundError("Tarefa de Projeção não encontrada");
    await createIssueForTask(taskId);
    const refreshed = await prisma.projectionTask.findUniqueOrThrow({ where: { id: taskId } });
    return toDto(refreshed);
  },

  async deleteTask(organizationId: string, taskId: string): Promise<void> {
    const task = await prisma.projectionTask.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new NotFoundError("Tarefa de Projeção não encontrada");
    await prisma.projectionTask.delete({ where: { id: taskId } });
  },

  /**
   * Chamado por polling (main.ts) — verifica o estado de todas as Issues
   * ainda abertas no GitHub e marca DONE as que foram fechadas por lá.
   * Falha isolada por tarefa não derruba as demais.
   */
  async syncAllPending(): Promise<void> {
    const tasks = await prisma.projectionTask.findMany({
      where: { status: "IN_PROGRESS", githubIssueNumber: { not: null } },
    });
    for (const task of tasks) {
      await syncTask(task.id).catch(() => {});
    }
  },
};

async function createIssueForTask(taskId: string): Promise<void> {
  const task = await prisma.projectionTask.findUniqueOrThrow({ where: { id: taskId } });
  const connection = await prisma.adapterConnection.findUnique({
    where: { projectId_kind: { projectId: task.projectId, kind: "GITHUB" } },
  });
  if (!connection || !connection.credentialEncrypted) {
    await prisma.projectionTask.update({
      where: { id: taskId },
      data: { status: "FAILED", error: "Projeto sem conexão GitHub configurada em Aplicação." },
    });
    throw new NoGithubConnectionError("Projeto sem conexão GitHub configurada.");
  }
  const config = connection.config as { owner?: string; repo?: string } | null;
  if (!config?.owner || !config?.repo) {
    await prisma.projectionTask.update({
      where: { id: taskId },
      data: { status: "FAILED", error: "Conexão GitHub sem owner/repo configurados." },
    });
    throw new NoGithubConnectionError("Conexão GitHub sem owner/repo configurados.");
  }
  const token = decryptSecret(connection.credentialEncrypted);

  try {
    const res = await fetch(`${API_BASE}/repos/${config.owner}/${config.repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title: task.title,
        body: `${task.description}\n\n---\n_Criada automaticamente pelo MuriOps a partir de um plano de Aplicação (Projeção). Feche esta issue para marcar a tarefa como concluída no MuriOps._`,
        labels: ["muriops-projecao"],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      await prisma.projectionTask.update({
        where: { id: taskId },
        data: { status: "FAILED", error: `GitHub recusou a criação da issue (${res.status}): ${detail.slice(0, 300)}` },
      });
      throw new Error(`GitHub POST issues falhou: ${res.status}`);
    }
    const issue = (await res.json()) as { number: number; html_url: string };
    await prisma.projectionTask.update({
      where: { id: taskId },
      data: {
        status: "IN_PROGRESS",
        githubIssueNumber: issue.number,
        githubIssueUrl: issue.html_url,
        error: null,
        lastSyncedAt: new Date(),
      },
    });
  } catch (err) {
    if (err instanceof NoGithubConnectionError) throw err;
    await prisma.projectionTask.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : "Falha desconhecida ao criar a issue no GitHub.",
      },
    });
    throw err;
  }
}

async function syncTask(taskId: string): Promise<void> {
  const task = await prisma.projectionTask.findUniqueOrThrow({ where: { id: taskId } });
  if (!task.githubIssueNumber) return;
  const connection = await prisma.adapterConnection.findUnique({
    where: { projectId_kind: { projectId: task.projectId, kind: "GITHUB" } },
  });
  if (!connection?.credentialEncrypted) return;
  const config = connection.config as { owner?: string; repo?: string } | null;
  if (!config?.owner || !config?.repo) return;
  const token = decryptSecret(connection.credentialEncrypted);

  const res = await fetch(
    `${API_BASE}/repos/${config.owner}/${config.repo}/issues/${task.githubIssueNumber}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!res.ok) return;
  const issue = (await res.json()) as { state: "open" | "closed" };
  await prisma.projectionTask.update({
    where: { id: taskId },
    data: {
      status: issue.state === "closed" ? "DONE" : "IN_PROGRESS",
      lastSyncedAt: new Date(),
    },
  });
}

function toDto(row: {
  id: string;
  remediationPlanId: string;
  projectId: string;
  title: string;
  description: string;
  order: number;
  status: string;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
  error: string | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ProjectionTask {
  return {
    id: row.id,
    remediationPlanId: row.remediationPlanId,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    order: row.order,
    status: row.status as ProjectionTask["status"],
    githubIssueNumber: row.githubIssueNumber,
    githubIssueUrl: row.githubIssueUrl,
    error: row.error,
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
