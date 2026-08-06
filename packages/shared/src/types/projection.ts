/**
 * Projeção — terceira função de Projetar: decompõe o roadmap de um Blueprint
 * em tarefas rastreáveis. Cada tarefa vira uma Issue no repositório GitHub
 * conectado do projeto (decisão de produto: Issue, não branch+PR — mais
 * simples e seguro, sem tocar em código). O status sincroniza por polling: se
 * a Issue fechar no GitHub, a tarefa vira DONE aqui automaticamente.
 */

export type ProjectionTaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "FAILED";

export interface ProjectionTask {
  id: string;
  blueprintId: string;
  projectId: string;
  title: string;
  description: string;
  order: number;
  status: ProjectionTaskStatus;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
  error: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectionTaskRequest {
  title: string;
  description: string;
}

/** Gera um conjunto de tarefas a partir dos marcos (milestones) do blueprint — sem nova chamada de IA, só mapeamento. */
export interface GenerateProjectionTasksFromMilestonesRequest {
  /** Quando true, cria as Issues no GitHub imediatamente após gerar as tarefas (exige conexão GITHUB no projeto). */
  createIssuesNow?: boolean;
}
