import type {
  AnalysisCategory,
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
import { analysisService, NotFoundError } from "./analysis.service.js";
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

    // `adapterConnectionId` vem cru do request (z.string().optional() na
    // rota). Sem esta validação, dava pra criar um run no PRÓPRIO projeto
    // passando o id de uma conexão de OUTRA organização — e o
    // `applyViaAdapter()` usaria as credenciais dela (token do GitHub, senha
    // de aplicativo do WordPress, access token da Shopify, senha de FTP) pra
    // escrever de verdade no sistema de produção da vítima. Amarra a conexão
    // ao mesmo projeto e organização do run.
    let adapterConnectionId: string | null = null;
    if (input.adapterConnectionId) {
      const connection = await prisma.adapterConnection.findFirst({
        where: { id: input.adapterConnectionId, projectId, organizationId },
        select: { id: true },
      });
      if (!connection) throw new NotFoundError("Conexão não encontrada para este projeto");
      adapterConnectionId = connection.id;
    }

    const run = await prisma.orchestrationRun.create({
      data: {
        projectId,
        organizationId,
        status: "QUEUED",
        maxIterations: input.maxIterations ?? 3,
        // Snapshot do nível de autonomia do projeto no início do run.
        autonomyLevel: project.autonomyLevel,
        adapterConnectionId,
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
    // updateMany com status na condição (em vez de update por id direto):
    // torna a transição atômica. Duas chamadas de approve() quase
    // simultâneas (duplo clique) podiam ambas passar pela checagem acima
    // antes de qualquer uma escrever, e as duas incrementavam a iteração e
    // enfileiravam o run — processando o mesmo passo duas vezes em paralelo.
    // Com a condição de status no WHERE, só a primeira escrita afeta alguma
    // linha; a segunda afeta 0 linhas e vira ConflictError.
    const { count } = await prisma.orchestrationRun.updateMany({
      where: { id, status: "AWAITING_APPLY" },
      data: { status: "REANALYZING", iteration: nextIteration },
    });
    if (count === 0) {
      throw new ConflictError("Execução já foi aprovada (ou mudou de status) em outra requisição.");
    }
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

  const nextIteration = run.iteration + 1;
  // Guarda o status na condição do updateMany (mesmo motivo do approve()
  // acima) — dois webhooks quase simultâneos pro mesmo projeto não podem
  // ambos retomar o mesmo run.
  const { count } = await prisma.orchestrationRun.updateMany({
    where: { id: run.id, status: "AWAITING_OBSERVATION" },
    data: { status: "REANALYZING", iteration: nextIteration },
  });
  if (count === 0) return;

  await logEvent(
    run.id,
    "OBSERVATION_RECEIVED",
    "Mudança observada pelo adapter — retomando a execução.",
    event,
  );
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
  // Guarda o status na condição (mesmo motivo do approve()/onObservation
  // acima) — marcar vários itens em sequência rápida pela ponte/MCP dispara
  // este handler várias vezes; só a primeira pode de fato retomar o run.
  const { count } = await prisma.orchestrationRun.updateMany({
    where: { id: run.id, status: "AWAITING_APPLY" },
    data: { status: "REANALYZING", iteration: nextIteration },
  });
  if (count === 0) return;

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
 * houver) → decide se para pra aprovação humana ou segue sozinho, conforme o
 * nível de autonomia do projeto. Cada chamada avança só até o próximo ponto
 * de espera; retomar (aprovar ou receber uma observação do adapter) chama de
 * novo via a fila.
 *
 * Os três níveis diferem em UM ponto só — o que fazer depois de aplicar:
 * - MANUAL: sempre para e espera aprovação humana.
 * - SUPERVISED: segue sozinho quando a aplicação deu certo por completo e a
 *   nota não piorou; para pra revisão se algum item falhou ou se houve
 *   regressão (sinal de que a correção fez mal).
 * - AUTONOMOUS: segue sozinho enquanto houver o que aplicar, até bater os
 *   gates ou o limite de iterações.
 *
 * Regra comum aos três: só dá pra seguir sozinho quando existe um adapter
 * *push* que de fato aplicou algo. Sem isso (nenhuma conexão, ou conexão
 * *pull* como MCP/ponte), quem aplica é um ator externo — seguir automático
 * só reanalisaria um site inalterado, queimando a chave de IA do usuário à
 * toa. Nesse caso os três níveis esperam igual, e a execução retoma sozinha
 * via `maybeAutoResumeFromPlan` quando os itens forem marcados como feitos.
 */
export async function advance(runId: string): Promise<void> {
  const run = await prisma.orchestrationRun.findUnique({ where: { id: runId } });
  if (!run) return;

  try {
    await prisma.orchestrationRun.update({
      where: { id: runId },
      data: { status: "ANALYZING", startedAt: run.startedAt ?? new Date() },
    });

    // Iteração 1 reaproveita a análise mais recente do projeto (o usuário
    // acabou de rodar uma antes de iniciar a execução). Da 2ª em diante o
    // ciclo exige uma análise NOVA — é justamente o "reanalisar" do fluxo
    // analisar → gates → plano → aplicar → reanalisar. Sem isso a execução
    // reavaliava a mesma análise velha a cada iteração, gerando planos
    // duplicados e nunca refletindo as correções aplicadas.
    let analysis: Awaited<ReturnType<typeof prisma.analysis.findFirst>>;

    if (run.iteration > 1) {
      await logEvent(
        runId,
        "ANALYSIS_STARTED",
        `Reanalisando o site pra medir o efeito das correções (iteração ${run.iteration}).`,
      );
      const previous = run.currentAnalysisId
        ? await prisma.analysis.findUnique({ where: { id: run.currentAnalysisId } })
        : null;
      const previousConfig = (previous?.config ?? {}) as {
        categories?: AnalysisCategory[];
        maxDepth?: number;
        maxPages?: number;
      };

      // Reusa a mesma configuração (categorias/profundidade) da análise
      // anterior — comparar iterações só faz sentido medindo o mesmo escopo.
      const started = await analysisService.start(run.organizationId, run.projectId, {
        categories: previousConfig.categories,
        maxDepth: previousConfig.maxDepth,
        maxPages: previousConfig.maxPages,
      });
      analysis = await waitForAnalysisCompleted(started.id);
      if (!analysis) {
        await stop(
          runId,
          "A reanálise não concluiu a tempo — rode uma análise manualmente e inicie uma nova execução.",
        );
        return;
      }
    } else {
      await logEvent(runId, "ANALYSIS_STARTED", "Buscando a análise mais recente do projeto.");
      analysis = await prisma.analysis.findFirst({
        where: { projectId: run.projectId, status: "COMPLETED" },
        orderBy: { version: "desc" },
      });
    }

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

    // Nota da iteração anterior, capturada ANTES de `currentAnalysisId` ser
    // sobrescrito abaixo — é com ela que a autonomia SUPERVISED detecta
    // regressão (correção que piorou o site em vez de melhorar).
    const notaAnterior =
      run.currentAnalysisId && run.currentAnalysisId !== analysis.id
        ? (
            (
              await prisma.analysis.findUnique({
                where: { id: run.currentAnalysisId },
                select: { score: true },
              })
            )?.score as unknown as ScoreBreakdown | null
          )?.overall ?? null
        : null;
    const notaAtual = (analysis.score as unknown as ScoreBreakdown).overall;

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
    let outcome: ApplyOutcome = { mode: "none", applied: 0, failed: 0 };
    if (run.adapterConnectionId) {
      outcome = await applyViaAdapter(
        runId,
        run.adapterConnectionId,
        run.organizationId,
        run.projectId,
        readyPlan.result?.items ?? [],
      );
    } else {
      await logEvent(
        runId,
        "APPLY_REQUESTED",
        "Nenhum adapter conectado — aplicação manual via tela de Aplicação ou ponte/MCP.",
      );
    }

    // ---- DECISÃO DE AUTONOMIA ----
    const decisao = decidirProximoPasso(
      run.autonomyLevel,
      outcome,
      notaAnterior,
      notaAtual,
    );

    if (decisao.seguirSozinho) {
      const proximaIteracao = run.iteration + 1;
      // updateMany guardado por status (mesmo motivo do approve()): evita que
      // um trigger concorrente avance a mesma execução duas vezes.
      const { count } = await prisma.orchestrationRun.updateMany({
        where: { id: runId, status: "APPLYING" },
        data: { status: "REANALYZING", iteration: proximaIteracao },
      });
      if (count === 0) return;

      await logEvent(runId, "APPLY_APPROVED", decisao.motivo);
      await logEvent(
        runId,
        "ITERATION_ADVANCED",
        `Iniciando iteração ${proximaIteracao}.`,
      );
      await enqueueOrchestrationRun(runId);
      return;
    }

    await prisma.orchestrationRun.update({ where: { id: runId }, data: { status: "AWAITING_APPLY" } });
    await logEvent(runId, "APPLY_REQUESTED", decisao.motivo);
  } catch (err) {
    await failRun(runId, err instanceof Error ? err.message : String(err));
  }
}

/** Resultado da tentativa de aplicação — alimenta a decisão de autonomia. */
interface ApplyOutcome {
  /**
   * `push` = o orquestrador aplicou de verdade; `pull` = quem aplica é um
   * ator externo (MCP/ponte); `none` = não havia o que aplicar automaticamente.
   */
  mode: "push" | "pull" | "none";
  applied: number;
  failed: number;
}

interface Decisao {
  seguirSozinho: boolean;
  motivo: string;
}

/**
 * Decide, depois de aplicar, se a execução segue sozinha pra próxima
 * iteração ou para esperando um humano. É aqui — e só aqui — que os três
 * níveis de autonomia se diferenciam.
 *
 * Trava comum aos três: seguir sozinho exige `mode === "push"` com pelo menos
 * um item aplicado. Em `pull` (MCP/ponte) quem aplica é a ferramenta externa,
 * e em `none` não houve aplicação nenhuma — em ambos, avançar só produziria
 * uma reanálise de um site inalterado, gastando a chave de IA do usuário sem
 * mudar nada. Nesses casos a execução espera, e retoma sozinha via
 * `maybeAutoResumeFromPlan` quando os itens forem marcados como feitos.
 */
function decidirProximoPasso(
  autonomyLevel: string,
  outcome: ApplyOutcome,
  notaAnterior: number | null,
  notaAtual: number,
): Decisao {
  const esperaPadrao =
    "Aguardando aprovação humana pra reanalisar (aprove manualmente, ou o adapter observa e retoma sozinho).";

  if (autonomyLevel === "MANUAL") {
    return { seguirSozinho: false, motivo: esperaPadrao };
  }

  if (outcome.mode === "pull") {
    return {
      seguirSozinho: false,
      motivo:
        "Autonomia ativa, mas a aplicação depende da ferramenta externa (MCP/ponte). A execução retoma sozinha quando todos os itens forem marcados como feitos.",
    };
  }

  if (outcome.mode === "none" || outcome.applied === 0) {
    return {
      seguirSozinho: false,
      motivo:
        "Autonomia ativa, mas nenhum item foi aplicado automaticamente (sem adapter de aplicação disponível). Aguardando aplicação/aprovação humana — seguir agora só reanalisaria o site sem nenhuma mudança.",
    };
  }

  if (autonomyLevel === "SUPERVISED") {
    if (outcome.failed > 0) {
      return {
        seguirSozinho: false,
        motivo: `Supervisionado: ${outcome.failed} item(ns) falharam ao ser aplicados — parando pra revisão humana antes de reanalisar.`,
      };
    }
    // Regressão: a rodada anterior existia e a nota piorou. Sinal de que a
    // correção teve efeito colateral — é exatamente o caso em que o nível
    // "supervisionado" deve chamar um humano em vez de insistir sozinho.
    if (notaAnterior !== null && notaAtual < notaAnterior) {
      return {
        seguirSozinho: false,
        motivo: `Supervisionado: a nota caiu de ${notaAnterior} para ${notaAtual} desde a iteração anterior — parando pra revisão humana.`,
      };
    }
    return {
      seguirSozinho: true,
      motivo: `Supervisionado: ${outcome.applied} item(ns) aplicados sem falha e sem regressão — seguindo pra reanálise automaticamente.`,
    };
  }

  // AUTONOMOUS
  const nota = outcome.failed > 0 ? ` (${outcome.failed} item(ns) falharam e serão reavaliados na próxima análise)` : "";
  return {
    seguirSozinho: true,
    motivo: `Autônomo: ${outcome.applied} item(ns) aplicados${nota} — seguindo pra reanálise automaticamente.`,
  };
}

/**
 * Chama `adapter.apply()` por item pendente — best-effort, um item falhar não
 * impede os demais.
 *
 * A busca da conexão é filtrada por `organizationId`/`projectId` do run (não
 * só pelo id): esta função decripta credenciais reais e escreve no sistema de
 * produção do cliente, então é o último ponto onde dá pra impedir que um
 * `adapterConnectionId` de outra organização — persistido antes desta
 * correção, ou por qualquer caminho futuro que esqueça de validar na
 * entrada — seja usado aqui. Defesa em profundidade junto com a checagem em
 * `create()`.
 */
async function applyViaAdapter(
  runId: string,
  adapterConnectionId: string,
  organizationId: string,
  projectId: string,
  items: RemediationItem[],
): Promise<ApplyOutcome> {
  const connection = await prisma.adapterConnection.findFirst({
    where: { id: adapterConnectionId, organizationId, projectId },
  });
  if (!connection) {
    await logEvent(runId, "APPLY_REQUESTED", "Conexão de adapter não encontrada — pulando aplicação automática.");
    return { mode: "none", applied: 0, failed: 0 };
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
    return { mode: "pull", applied: 0, failed: 0 };
  }

  const adapter = createAdapterFor(connection);
  if (!adapter.apply) {
    await logEvent(runId, "APPLY_REQUESTED", `Adapter ${connection.kind} não implementa apply() — pulando.`);
    return { mode: "none", applied: 0, failed: 0 };
  }

  let applied = 0;
  let failed = 0;
  for (const item of items.filter((i) => i.status === "pending")) {
    try {
      const result = await adapter.apply(item);
      applied += 1;
      await logEvent(runId, "APPLY_REQUESTED", `[${connection.kind}] ${result.message}`, {
        itemId: item.id,
        reference: result.reference,
      });
    } catch (err) {
      failed += 1;
      await logEvent(
        runId,
        "APPLY_REQUESTED",
        `[${connection.kind}] Falha ao aplicar item "${item.title}": ${err instanceof Error ? err.message : String(err)}`,
        { itemId: item.id },
      );
    }
  }
  return { mode: "push", applied, failed };
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

/**
 * Espera uma análise disparada pelo orquestrador terminar. Timeout generoso
 * (10 min): um crawl completo de site grande é bem mais lento que a geração
 * de um plano por IA. Devolve `null` se estourar o tempo ou a análise falhar
 * — o chamador para a execução com mensagem amigável em vez de travar.
 */
async function waitForAnalysisCompleted(
  analysisId: string,
  timeoutMs = 600_000,
  intervalMs = 5000,
): Promise<Awaited<ReturnType<typeof prisma.analysis.findUnique>>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await prisma.analysis.findUnique({ where: { id: analysisId } });
    if (!row) return null;
    if (row.status === "COMPLETED") return row;
    if (row.status === "FAILED") return null;
    await sleep(intervalMs);
  }
  return null;
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
