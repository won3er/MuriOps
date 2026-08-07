/**
 * Projeção — decompõe um plano de Aplicação (Análise ou Atualizar) em
 * tarefas rastreáveis. Cada tarefa vira uma Issue no repositório GitHub
 * conectado do projeto (decisão de produto: Issue, não branch+PR — mais
 * simples e seguro, sem tocar em código). O status sincroniza por polling: se
 * a Issue fechar no GitHub, a tarefa vira DONE aqui automaticamente.
 *
 * [06/08/2026] Antes vivia dentro do pilar "Projetar"/Blueprint (gerava
 * tarefas a partir de marcos de uma arquitetura imaginada pela IA). Removido
 * o Blueprint (sem evidência real por trás, decisão de produto — ver
 * CLAUDE.md) e a Projeção passou a operar sobre os itens de um
 * RemediationPlan de verdade (Análise ou Atualizar), que já tem achado real
 * e ação concreta por trás de cada item.
 */

export type ProjectionTaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "FAILED";

export interface ProjectionTask {
  id: string;
  remediationPlanId: string;
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

/** Gera um conjunto de tarefas a partir dos itens do plano de Aplicação — sem nova chamada de IA, só mapeamento. */
export interface GenerateProjectionTasksFromPlanRequest {
  /** Quando true, cria as Issues no GitHub imediatamente após gerar as tarefas (exige conexão GITHUB no projeto). */
  createIssuesNow?: boolean;
}
