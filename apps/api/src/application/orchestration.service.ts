import type {
  CreateOrchestrationRunRequest,
  OrchestrationEvent,
  OrchestrationRun,
  QualityGateEvaluation,
  RemediationItem,
  ScoreBreakdown,
} from "@qa-ai/shared";
import type { Prisma } from "@prisma/client";
import { createAdapterFor } from "../infrastructure/adapters/index.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { enqueueOrchestrationRun } from "../infrastructure/queue/orchestration-runner.js";
import { evaluateQualityGates } from "../modules/analysis/quality-gates.js";
import { NotFoundError } from "./analysis.service.js";
import { remediationService } from "./remediation.service.js";

/** Sentinela de autoria — RemediationPlan.createdById é campo solto (sem FK), mesmo padrão de prisma/seed.ts ("seed"). */
const ORCHESTRATOR_ACTOR_ID = "orchestrator";

/** Estados em que não há nada rodando — seguro cancelar direto. */
const CANCELABLE_STATUSES = ["QUEUED", "AWAITING_APPLY", "AWAITING_OBSERVATION"] as const;

export const orchestrationService = {
  /**
   * Cria um run em QUEUED e dispara o avanço em background (mesmo padrão de
   * `analysisService.start`/`remediationService.create`: a resposta HTTP
   * volta na hora, o front acompanha por polling).
   */
  async create(
    organizationId: string,
    projectId: string,
    input: CreateOrchestrationRunRequest,
  ): Promise<OrchestrationRun> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundError("Projeto não encontrado");

    const run = await prisma.orchestrationRun.create({
      data: {
        projectId,
        organizationId,
        status: "QUEUED",
        maxIterations: input.maxIterations ?? 3,
        // Snapshot do nível de autonomia do projeto no início do run.
        autonomyLevel: project.autonomyLevel,
        adapterConnectionId: input.adapterConnectionId ?? null,
      },
    });
    await logEvent(run.id, "RUN_STARTED", "Execução criada, aguardando análise mais recente.");

    await enqueueOrchestrationRun(run.id);
    return toDto(run);
  },

  async list(organizationId: string, projectId: string): Promise<OrchestrationRun[]> {
    const rows = await prisma.orchestrationRun.findMany({
      where: { organizationId, projectId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDto);
  },

  async getById(organizationId: string, id: string): Promise<OrchestrationRun | null> {
    const row = await prisma.orchestrationRun.findFirst({
      where: { id, organizationId },
    });
    return row ? toDto(row) : null;
  },

  /** Timeline de eventos do run — o que a UI mostra pra explicar o progresso do loop. */
  async listEvents(organizationId: string, runId: string): Promise<OrchestrationEvent[]> {
    const run = await prisma.orchestrationRun.findFirst({
      where: { id: runId, organizationId },
      select: { id: true },
    });
    if (!run) throw new NotFoundError("Execução não encontrada");
    const rows = await prisma.orchestrationEvent.findMany({
      where: { runId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      runId: r.runId,
      type: r.type as OrchestrationEvent["type"],
      message: r.message,
      data: (r.data as Record<string, unknown> | null) ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  },

  /**
   * Aprovação humana (autonomia MANUAL): retoma um run parado em
   * `AWAITING_APPLY`, independente de todos os itens do plano estarem
   * marcados como feitos — clicar em "Aprovar" É a autorização humana pra
   * continuar, o núcleo não impõe checagem adicional sobre isso.
   */
  async approve(organizationId: string, id: string): Promise<OrchestrationRun> {
    const run = await prisma.orchestrationRun.findFirst({ where: { id, organizationId } });
    if (!run) throw new NotFoundError("Execução não encontrada");
    if (run.status !== "AWAITING_APPLY") {
      throw new ConflictError(`Execução não está aguardando aprovação (status atual: ${run.status}).`);
    }
    const nextIteration = run.iteration + 1;
    await prisma.orchestrationRun.update({
      where: { id },
      data: { status: "REANALYZING", iteration: nextIteration },
    });
    await logEvent(id, "APPLY_APPROVED", "Aprovado manualmente — retomando a execução.");
    await logEvent(id, "ITERATION_ADVANCED", `Iniciando iteração ${nextIteration}.`);
    await enqueueOrchestrationRun(id);
    return toDto((await prisma.orchestrationRun.findUniqueOrThrow({ where: { id } })));
  },

  /**
   * Cancela um run. Só é seguro cancelar direto em estados parados (nada
   * rodando); em estados ativos, um passo do loop pode estar em andamento
   * (sem interrupção real na fila em memória, mesma limitação aceita em
   * `cancelPendingAnalysis`), então devolve 409 — tenta de novo em instantes.
   */
  async cancel(organizationId: string, id: string): Promise<OrchestrationRun> {
    const run = await prisma.orchestrationRun.findFirst({ where: { id, organizationId } });
    if (!run) throw new NotFoundError("Execução não encontrada");
    if (!CANCELABLE_STATUSES.includes(run.status as (typeof CANCELABLE_STATUSES)[number])) {
      throw new ConflictError(
        `Execução em andamento (status: ${run.status}) — tente cancelar novamente em instantes.`,
      );
    }
    const updated = await prisma.orchestrationRun.update({
      where: { id },
      data: { status: "STOPPED", error: "Cancelado pelo usuário.", finishedAt: new Date() },
    });
    await logEvent(id, "RUN_STOPPED", "Cancelado pelo usuário.");
    return toDto(updated);
  },
};

export class ConflictError extends Error {
  readonly statusCode = 409;
}

/**
 * Chamado por um webhook de adapter *observe* (Fase 2: GitHub) quando o
 * projeto muda no mundo real. Retoma o run mais recente deste projeto que
 * estiver parado em `AWAITING_OBSERVATION`.
 */
export async function onObservation(
  projectId: string,
  event: Record<string, unknown>,
): Promise<void> {
  const run = await prisma.orchestrationRun.findFirst({
    where: { projectId, status: "AWAITING_OBSERVATION" },
    orderBy: { createdAt: "desc" },
  });
  if (!run) return;

  await logEvent(
    run.id,
    "OBSERVATION_RECEIVED",
    "Mudança observada pelo adapter — retomando a execução.",
    event,
  );
  const nextIteration = run.iteration + 1;
  await prisma.orchestrationRun.update({
    where: { id: run.id },
    data: { status: "REANALYZING", iteration: nextIteration },
  });
  await logEvent(run.id, "ITERATION_ADVANCED", `Iniciando iteração ${nextIteration}.`);
  await enqueueOrchestrationRun(run.id);
}

/**
 * Chamado sempre que um item de um `RemediationPlan` muda de status — pelo
 * checklist manual, pela ponte universal (`PATCH /apply/:token/items/:id`)
 * ou pelo tool MCP `mark_item_done`. Se esse plano é o `currentPlanId` de um
 * run parado em `AWAITING_APPLY` e todos os itens já estão fora de
 * "pending", retoma sozinho — é o equivalente automático de clicar em
 * "Aprovar e reanalisar", pra quem está aplicando via MCP/ponte com a
 * própria IA de dev (Claude Code, Cursor...) em vez de um adapter *push*.
 */
export async function maybeAutoResumeFromPlan(planId: string): Promise<void> {
  const run = await prisma.orchestrationRun.findFirst({
    where: { currentPlanId: planId, status: "AWAITING_APPLY" },
    orderBy: { createdAt: "desc" },
  });
  if (!run) return;

  const plan = await prisma.remediationPlan.findUnique({ where: { id: planId } });
  const items =
    (plan?.result as unknown as { items?: RemediationItem[] } | null)?.items ?? [];
  if (items.length === 0 || items.some((i) => i.status === "pending")) return;

  const nextIteration = run.iteration + 1;
  await prisma.orchestrationRun.update({
    where: { id: run.id },
    data: { status: "REANALYZING", iteration: nextIteration },
  });
  await logEvent(
    run.id,
    "APPLY_APPROVED",
    "Todos os itens marcados como feitos via MCP/ponte — retomando automaticamente.",
  );
  await logEvent(run.id, "ITERATION_ADVANCED", `Iniciando iteração ${nextIteration}.`);
  await enqueueOrchestrationRun(run.id);
}

/**
 * Avança o loop de reconciliação: analisa → avalia quality gates → (se não
 * passou) gera plano de remediação → aplica pelo adapter da conexão (se
 * houver) → para em `AWAITING_APPLY` esperando aprovação humana (autonomia
 * MANUAL, a única que funciona de fato — Fase 4 trata Supervisionado/Autônomo).
 * Cada chamada avança só até o próximo ponto de espera; retomar (aprovar ou
 * receber uma observação do adapter) chama de novo via a fila.
 */
export async function advance(runId: string): Promise<void> {
  const run = await prisma.orchestrationRun.findUnique({ where: { id: runId } });
  if (!run) return;

  if (run.autonomyLevel !== "MANUAL") {
    await failRun(
      runId,
      `Nível de autonomia "${run.autonomyLevel}" ainda não tem execução automática implementada (Fase 4). Use MANUAL.`,
    );
    return;
  }

  try {
    await prisma.orchestrationRun.update({
      where: { id: runId },
      data: { status: "ANALYZING", startedAt: run.startedAt ?? new Date() },
    });
    await logEvent(runId, "ANALYSIS_STARTED", "Buscando a análise mais recente do projeto.");

    const analysis = await prisma.analysis.findFirst({
      where: { projectId: run.projectId, status: "COMPLETED" },
      orderBy: { version: "desc" },
    });
    if (!analysis || !analysis.score) {
      await stop(
        runId,
        "Nenhuma análise concluída encontrada para este projeto — rode uma análise antes de iniciar a execução.",
      );
      return;
    }
    await logEvent(runId, "ANALYSIS_COMPLETED", `Usando a análise v${analysis.version}.`, {
      analysisId: analysis.id,
    });

    await prisma.orchestrationRun.update({
      where: { id: runId },
      data: { status: "EVALUATING_GATES", currentAnalysisId: analysis.id },
    });

    const gateRows = await prisma.projectQualityGate.findMany({
      where: { projectId: run.projectId },
    });
    const evaluation = evaluateQualityGates(
      analysis.score as unknown as ScoreBreakdown,
      gateRows.map((g) => ({
        id: g.id,
        projectId: g.projectId,
        category: g.category,
        minScore: g.minScore,
        label: g.label,
        sourceBlueprintId: g.sourceBlueprintId,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
      })),
    );
    await logEvent(runId, "GATE_EVALUATED", describeEvaluation(evaluation), { evaluation });

    if (evaluation.passed) {
      await finish(runId, evaluation);
      return;
    }

    if (run.iteration >= run.maxIterations) {
      await stop(
        runId,
        `Limite de ${run.maxIterations} iteração(ões) atingido sem bater os quality gates.`,
        evaluation,
      );
      return;
    }

    // ---- PLANNING ----
    await prisma.orchestrationRun.update({ where: { id: runId }, data: { status: "PLANNING" } });
    await logEvent(runId, "APPLY_REQUESTED", "Gerando plano de remediação a partir da análise.");

    const plan = await remediationService.create(run.organizationId, ORCHESTRATOR_ACTOR_ID, {
      sourceType: "analysis",
      sourceId: analysis.id,
    });
    const readyPlan = await waitForPlanReady(plan.id);
    await logEvent(runId, "PLAN_GENERATED", `Plano "${readyPlan.title}" gerado.`, {
      planId: readyPlan.id,
    });
    await prisma.orchestrationRun.update({
      where: { id: runId },
      data: { status: "APPLYING", currentPlanId: readyPlan.id },
    });

    // ---- APPLYING ----
    if (run.adapterConnectionId) {
      await applyViaAdapter(runId, run.adapterConnectionId, readyPlan.result?.items ?? []);
    } else {
      await logEvent(
        runId,
        "APPLY_REQUESTED",
        "Nenhum adapter conectado — aplicação manual via tela de Aplicação ou ponte/MCP.",
      );
    }

    await prisma.orchestrationRun.update({ where: { id: runId }, data: { status: "AWAITING_APPLY" } });
    await logEvent(
      runId,
      "APPLY_REQUESTED",
      "Aguardando aprovação humana pra reanalisar (aprove manualmente, ou o adapter observa e retoma sozinho).",
    );
  } catch (err) {
    await failRun(runId, err instanceof Error ? err.message : String(err));
  }
}

/** Chama `adapter.apply()` por item pendente — best-effort, um item falhar não impede os demais. */
async function applyViaAdapter(
  runId: string,
  adapterConnectionId: string,
  items: RemediationItem[],
): Promise<void> {
  const connection = await prisma.adapterConnection.findUnique({ where: { id: adapterConnectionId } });
  if (!connection) {
    await logEvent(runId, "APPLY_REQUESTED", "Conexão de adapter não encontrada — pulando aplicação automática.");
    return;
  }

  // MCP é *pull*: quem aplica é a ferramenta externa (ex.: Claude Code) do
  // outro lado da conexão, não o núcleo orquestrador — não tenta "empurrar"
  // nada aqui. A execução fica esperando em AWAITING_APPLY e retoma sozinha
  // via `maybeAutoResumeFromPlan` quando todos os itens forem marcados como
  // feitos (pela ferramenta externa, usando o MCP ou a ponte manual).
  if (connection.kind === "MCP") {
    await logEvent(
      runId,
      "APPLY_REQUESTED",
      "Plano exposto via MCP — aguardando a ferramenta externa (ex.: Claude Code) aplicar e marcar os itens. A execução retoma sozinha quando todos estiverem feitos.",
    );
    return;
  }

  const adapter = createAdapterFor(connection);
  if (!adapter.apply) {
    await logEvent(runId, "APPLY_REQUESTED", `Adapter ${connection.kind} não implementa apply() — pulando.`);
    return;
  }

  for (const item of items.filter((i) => i.status === "pending")) {
    try {
      const result = await adapter.apply(item);
      await logEvent(runId, "APPLY_REQUESTED", `[${connection.kind}] ${result.message}`, {
        itemId: item.id,
        reference: result.reference,
      });
    } catch (err) {
      await logEvent(
        runId,
        "APPLY_REQUESTED",
        `[${connection.kind}] Falha ao aplicar item "${item.title}": ${err instanceof Error ? err.message : String(err)}`,
        { itemId: item.id },
      );
    }
  }
}

/** Espera o plano de remediação sair de PENDING (poll simples — geração roda em background no mesmo processo). */
async function waitForPlanReady(
  planId: string,
  timeoutMs = 180_000,
  intervalMs = 2500,
): Promise<{ id: string; title: string; result: { items: RemediationItem[]; summary: string } | null }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await prisma.remediationPlan.findUnique({ where: { id: planId } });
    if (!row) throw new Error("Plano de remediação sumiu durante a geração.");
    if (row.status === "READY") {
      return { id: row.id, title: row.title, result: row.result as unknown as { items: RemediationItem[]; summary: string } };
    }
    if (row.status === "FAILED") throw new Error(row.error ?? "Falha ao gerar o plano de remediação.");
    await sleep(intervalMs);
  }
  throw new Error("Tempo esgotado esperando o plano de remediação ficar pronto.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function finish(runId: string, evaluation: QualityGateEvaluation): Promise<void> {
  await prisma.orchestrationRun.update({
    where: { id: runId },
    data: {
      status: "PASSED",
      gateResult: evaluation as unknown as Prisma.InputJsonValue,
      finishedAt: new Date(),
    },
  });
  await logEvent(runId, "RUN_PASSED", "Todos os quality gates foram atingidos.");
}

async function stop(runId: string, message: string, evaluation?: QualityGateEvaluation): Promise<void> {
  await prisma.orchestrationRun.update({
    where: { id: runId },
    data: {
      status: "STOPPED",
      gateResult: evaluation ? (evaluation as unknown as Prisma.InputJsonValue) : undefined,
      error: message,
      finishedAt: new Date(),
    },
  });
  await logEvent(runId, "RUN_STOPPED", message);
}

async function failRun(runId: string, message: string): Promise<void> {
  await prisma.orchestrationRun
    .update({
      where: { id: runId },
      data: { status: "FAILED", error: message, finishedAt: new Date() },
    })
    .catch(() => {});
  await logEvent(runId, "RUN_FAILED", message).catch(() => {});
}

function describeEvaluation(evaluation: QualityGateEvaluation): string {
  if (evaluation.details.length === 0) return "Nenhum quality gate configurado — considerado aprovado.";
  const failed = evaluation.details.filter((d) => !d.passed);
  if (failed.length === 0) return "Todos os quality gates passaram.";
  return `${failed.length} gate(s) não atingido(s): ${failed
    .map((d) => `${d.label ?? d.category ?? "geral"} (${d.actual}/${d.minScore})`)
    .join(", ")}`;
}

async function logEvent(
  runId: string,
  type: Parameters<typeof prisma.orchestrationEvent.create>[0]["data"]["type"],
  message: string,
  data?: Record<string, unknown>,
): Promise<void> {
  await prisma.orchestrationEvent.create({
    data: {
      runId,
      type,
      message,
      data: data ? (data as unknown as Prisma.InputJsonValue) : undefined,
    },
  });
}

function toDto(row: {
  id: string;
  projectId: string;
  status: string;
  iteration: number;
  maxIterations: number;
  autonomyLevel: string;
  currentAnalysisId: string | null;
  currentPlanId: string | null;
  adapterConnectionId: string | null;
  gateResult: unknown;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): OrchestrationRun {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status as OrchestrationRun["status"],
    iteration: row.iteration,
    maxIterations: row.maxIterations,
    autonomyLevel: row.autonomyLevel as OrchestrationRun["autonomyLevel"],
    currentAnalysisId: row.currentAnalysisId,
    currentPlanId: row.currentPlanId,
    adapterConnectionId: row.adapterConnectionId,
    gateResult: (row.gateResult as QualityGateEvaluation | null) ?? null,
    error: row.error,
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
