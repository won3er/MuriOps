import type {
  CreateCriticalFlowRequest,
  CriticalFlow,
  CriticalFlowFrequency,
  CriticalFlowStep,
  FlowRun,
  UpdateCriticalFlowRequest,
} from "@qa-ai/shared";
import { decryptSecret } from "../infrastructure/crypto/secret-box.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { sendEmailViaResend } from "../infrastructure/email/email-provider.js";
import { runCriticalFlow } from "../modules/critical-flow/flow-runner.js";
import { NotFoundError } from "./analysis.service.js";

/**
 * Fluxos Críticos — monitoramento sintético de jornadas de negócio. Cada
 * `CriticalFlow` é uma sequência de passos que roda periodicamente contra o
 * site do projeto, simulando um usuário real (login, checkout, formulário
 * de lead etc.). Diferente de Análise (scan sob demanda), aqui o valor está
 * na repetição — pegar uma quebra de jornada minutos depois dela acontecer,
 * não só quando alguém lembrar de rodar uma análise manual.
 */

export class InvalidFlowInputError extends Error {
  readonly statusCode = 400;
}

const FREQUENCY_MINUTES: Record<CriticalFlowFrequency, number> = {
  EVERY_15_MIN: 15,
  EVERY_HOUR: 60,
  DAILY: 24 * 60,
};

export const criticalFlowService = {
  async list(organizationId: string, projectId: string): Promise<CriticalFlow[]> {
    await requireProject(organizationId, projectId);
    const rows = await prisma.criticalFlow.findMany({
      where: { projectId, organizationId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toCriticalFlow);
  },

  async get(organizationId: string, id: string): Promise<CriticalFlow> {
    const row = await prisma.criticalFlow.findFirst({ where: { id, organizationId } });
    if (!row) throw new NotFoundError("Fluxo crítico não encontrado");
    return toCriticalFlow(row);
  },

  async create(
    organizationId: string,
    userId: string,
    projectId: string,
    input: CreateCriticalFlowRequest,
  ): Promise<CriticalFlow> {
    await requireProject(organizationId, projectId);
    validateSteps(input.steps);

    const created = await prisma.criticalFlow.create({
      data: {
        projectId,
        organizationId,
        createdById: userId,
        name: input.name.trim(),
        startUrl: input.startUrl.trim(),
        steps: input.steps as unknown as object,
        frequency: input.frequency,
        alertEmail: input.alertEmail?.trim() || null,
        alertAfterConsecutiveFailures: Math.max(1, input.alertAfterConsecutiveFailures ?? 1),
      },
    });
    return toCriticalFlow(created);
  },

  async update(
    organizationId: string,
    id: string,
    input: UpdateCriticalFlowRequest,
  ): Promise<CriticalFlow> {
    const row = await prisma.criticalFlow.findFirst({ where: { id, organizationId } });
    if (!row) throw new NotFoundError("Fluxo crítico não encontrado");
    if (input.steps) validateSteps(input.steps);

    const updated = await prisma.criticalFlow.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        startUrl: input.startUrl?.trim(),
        steps: input.steps ? (input.steps as unknown as object) : undefined,
        frequency: input.frequency,
        active: input.active,
        alertEmail: input.alertEmail !== undefined ? input.alertEmail?.trim() || null : undefined,
        alertAfterConsecutiveFailures:
          input.alertAfterConsecutiveFailures !== undefined
            ? Math.max(1, input.alertAfterConsecutiveFailures)
            : undefined,
      },
    });
    return toCriticalFlow(updated);
  },

  async remove(organizationId: string, id: string): Promise<void> {
    const row = await prisma.criticalFlow.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!row) throw new NotFoundError("Fluxo crítico não encontrado");
    await prisma.criticalFlow.delete({ where: { id } });
  },

  async listRuns(organizationId: string, id: string, limit = 30): Promise<FlowRun[]> {
    const flow = await prisma.criticalFlow.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!flow) throw new NotFoundError("Fluxo crítico não encontrado");
    const rows = await prisma.flowRun.findMany({
      where: { criticalFlowId: id },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
    return rows.map(toFlowRun);
  },

  /** Roda um fluxo agora (manual, fora do agendamento) e devolve o resultado. */
  async runNow(organizationId: string, id: string): Promise<FlowRun> {
    const flow = await prisma.criticalFlow.findFirst({ where: { id, organizationId } });
    if (!flow) throw new NotFoundError("Fluxo crítico não encontrado");
    return executeAndPersist(flow);
  },

  /**
   * Chamado periodicamente (ver scheduler em main.ts) — roda todo fluxo
   * ativo cujo intervalo já passou desde a última execução. Falha em um
   * fluxo não interrompe os outros.
   */
  async runDueFlows(): Promise<void> {
    const flows = await prisma.criticalFlow.findMany({ where: { active: true } });
    const now = Date.now();
    const due = flows.filter((f) => {
      if (!f.lastRunAt) return true;
      const intervalMs = FREQUENCY_MINUTES[f.frequency as CriticalFlowFrequency] * 60_000;
      return now - f.lastRunAt.getTime() >= intervalMs;
    });

    for (const flow of due) {
      try {
        await executeAndPersist(flow);
      } catch (err) {
        console.error(
          `❌ Fluxo crítico ${flow.id} (${flow.name}) falhou ao rodar:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  },
};

async function requireProject(organizationId: string, projectId: string): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  if (!project) throw new NotFoundError("Projeto não encontrado");
}

function validateSteps(steps: CriticalFlowStep[]): void {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new InvalidFlowInputError("O fluxo precisa ter ao menos um passo.");
  }
  for (const step of steps) {
    const needsSelector = ["CLICK", "FILL", "SELECT", "WAIT_FOR_SELECTOR", "ASSERT_TEXT"].includes(
      step.action,
    );
    if (needsSelector && !step.selector) {
      throw new InvalidFlowInputError(`Passo "${step.action}" precisa de um seletor.`);
    }
    if (step.action === "NAVIGATE" && !step.value) {
      throw new InvalidFlowInputError('Passo "NAVIGATE" precisa de um valor (URL de destino).');
    }
  }
}

async function executeAndPersist(flow: {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  startUrl: string;
  steps: unknown;
  alertEmail: string | null;
  alertAfterConsecutiveFailures: number;
  consecutiveFailures: number;
}): Promise<FlowRun> {
  const run = await prisma.flowRun.create({
    data: { criticalFlowId: flow.id, status: "RUNNING" },
  });

  const result = await runCriticalFlow(flow.startUrl, flow.steps as CriticalFlowStep[]);

  const updatedRun = await prisma.flowRun.update({
    where: { id: run.id },
    data: {
      status: result.status,
      failedStepIndex: result.failedStepIndex,
      errorMessage: result.errorMessage,
      screenshotBase64: result.screenshotBase64,
      durationMs: result.durationMs,
      finishedAt: new Date(),
    },
  });

  const consecutiveFailures = result.status === "FAILED" ? flow.consecutiveFailures + 1 : 0;

  await prisma.criticalFlow.update({
    where: { id: flow.id },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: result.status,
      consecutiveFailures,
    },
  });

  if (
    result.status === "FAILED" &&
    flow.alertEmail &&
    consecutiveFailures >= flow.alertAfterConsecutiveFailures
  ) {
    await maybeSendAlert(flow.organizationId, flow.alertEmail, flow.name, result.errorMessage);
  }

  return toFlowRun(updatedRun);
}

async function maybeSendAlert(
  organizationId: string,
  toEmail: string,
  flowName: string,
  errorMessage: string | null,
): Promise<void> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { emailProvider: true, emailApiKeyEncrypted: true, emailFromAddress: true },
    });
    if (!org?.emailProvider || !org.emailApiKeyEncrypted || !org.emailFromAddress) return;

    const apiKey = decryptSecret(org.emailApiKeyEncrypted);
    await sendEmailViaResend(apiKey, org.emailFromAddress, {
      to: toEmail,
      subject: `[MuriOps] Fluxo crítico com falha: ${flowName}`,
      html: `<h2>${escapeHtml(flowName)} falhou</h2><p>${escapeHtml(errorMessage ?? "Erro desconhecido.")}</p><p><small>Enviado automaticamente pelo monitoramento de Fluxos Críticos do MuriOps.</small></p>`,
    });
  } catch (err) {
    console.error(
      `⚠️  Fluxo crítico: alerta por e-mail não enviado (org ${organizationId}):`,
      err instanceof Error ? err.message : err,
    );
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toCriticalFlow(row: {
  id: string;
  projectId: string;
  name: string;
  startUrl: string;
  steps: unknown;
  frequency: string;
  active: boolean;
  alertEmail: string | null;
  alertAfterConsecutiveFailures: number;
  consecutiveFailures: number;
  lastRunAt: Date | null;
  lastRunStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CriticalFlow {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    startUrl: row.startUrl,
    steps: row.steps as CriticalFlowStep[],
    frequency: row.frequency as CriticalFlowFrequency,
    active: row.active,
    alertEmail: row.alertEmail,
    alertAfterConsecutiveFailures: row.alertAfterConsecutiveFailures,
    consecutiveFailures: row.consecutiveFailures,
    lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
    lastRunStatus: row.lastRunStatus as CriticalFlow["lastRunStatus"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toFlowRun(row: {
  id: string;
  criticalFlowId: string;
  status: string;
  failedStepIndex: number | null;
  errorMessage: string | null;
  screenshotBase64: string | null;
  durationMs: number | null;
  startedAt: Date;
  finishedAt: Date | null;
}): FlowRun {
  return {
    id: row.id,
    criticalFlowId: row.criticalFlowId,
    status: row.status as FlowRun["status"],
    failedStepIndex: row.failedStepIndex,
    errorMessage: row.errorMessage,
    screenshotBase64: row.screenshotBase64,
    durationMs: row.durationMs,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
  };
}
