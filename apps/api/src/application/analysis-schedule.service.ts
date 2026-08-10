import type {
  AnalysisCategory,
  AnalysisSchedule,
  AnalysisScheduleFrequency,
  CreateAnalysisScheduleRequest,
  UpdateAnalysisScheduleRequest,
} from "@qa-ai/shared";
import { SCHEDULABLE_CATEGORIES } from "@qa-ai/shared";
import { prisma } from "../infrastructure/database/prisma.js";
import { analysisService, NotFoundError } from "./analysis.service.js";

/**
 * Agendamento de Análise de Segurança — "Continuous Coverage" passivo (ver
 * comentário em schema.prisma). Mesma filosofia leve de CriticalFlow: sem
 * fila/cron externo, um polling em main.ts chama `runDueSchedules()`
 * periodicamente.
 */

export class InvalidScheduleInputError extends Error {
  readonly statusCode = 400;
}

const FREQUENCY_HOURS: Record<AnalysisScheduleFrequency, number> = {
  DAILY: 24,
  WEEKLY: 24 * 7,
};

export const analysisScheduleService = {
  async list(organizationId: string, projectId: string): Promise<AnalysisSchedule[]> {
    await requireProject(organizationId, projectId);
    const rows = await prisma.analysisSchedule.findMany({
      where: { projectId, organizationId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDto);
  },

  async create(
    organizationId: string,
    userId: string,
    projectId: string,
    input: CreateAnalysisScheduleRequest,
  ): Promise<AnalysisSchedule> {
    await requireProject(organizationId, projectId);
    const categories = validateCategories(input.categories);

    const created = await prisma.analysisSchedule.create({
      data: {
        projectId,
        organizationId,
        createdById: userId,
        categories: categories as unknown as object,
        frequency: input.frequency,
      },
    });
    return toDto(created);
  },

  async update(
    organizationId: string,
    id: string,
    input: UpdateAnalysisScheduleRequest,
  ): Promise<AnalysisSchedule> {
    const row = await prisma.analysisSchedule.findFirst({ where: { id, organizationId } });
    if (!row) throw new NotFoundError("Agendamento não encontrado");
    const categories = input.categories ? validateCategories(input.categories) : undefined;

    const updated = await prisma.analysisSchedule.update({
      where: { id },
      data: {
        categories: categories ? (categories as unknown as object) : undefined,
        frequency: input.frequency,
        active: input.active,
      },
    });
    return toDto(updated);
  },

  async remove(organizationId: string, id: string): Promise<void> {
    const row = await prisma.analysisSchedule.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!row) throw new NotFoundError("Agendamento não encontrado");
    await prisma.analysisSchedule.delete({ where: { id } });
  },

  /**
   * Chamado periodicamente (ver main.ts). Dispara `analysisService.start`
   * pra cada agendamento ativo cujo intervalo já passou. Uma análise já em
   * andamento no projeto (`AnalysisConflictError`) ou uma conexão que foi
   * removida depois de o agendamento ter sido criado
   * (`RepoConnectionRequiredError`/`GithubConnectionRequiredError`) só
   * pulam esta rodada — não desativam o agendamento sozinhas, porque ambas
   * podem ser situações passageiras.
   */
  async runDueSchedules(): Promise<void> {
    const schedules = await prisma.analysisSchedule.findMany({ where: { active: true } });
    const now = Date.now();
    const due = schedules.filter((s) => {
      if (!s.lastRunAt) return true;
      const intervalMs = FREQUENCY_HOURS[s.frequency as AnalysisScheduleFrequency] * 60 * 60_000;
      return now - s.lastRunAt.getTime() >= intervalMs;
    });

    for (const schedule of due) {
      try {
        const analysis = await analysisService.start(schedule.organizationId, schedule.projectId, {
          categories: schedule.categories as AnalysisCategory[],
        });
        await prisma.analysisSchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: new Date(), lastRunAnalysisId: analysis.id },
        });
      } catch (err) {
        console.error(
          `⚠️  Agendamento de análise ${schedule.id} (projeto ${schedule.projectId}) não rodou nesta janela:`,
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

/** Nunca confia só na validação do frontend — mesmo um request direto à API
 * não consegue agendar ACTIVE_SECURITY_TEST ou qualquer categoria fora da
 * lista passiva. */
function validateCategories(categories: AnalysisCategory[]): AnalysisCategory[] {
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new InvalidScheduleInputError("Selecione ao menos uma categoria para agendar.");
  }
  const invalid = categories.filter((c) => !SCHEDULABLE_CATEGORIES.includes(c));
  if (invalid.length > 0) {
    throw new InvalidScheduleInputError(
      `Categoria(s) não agendável(is): ${invalid.join(", ")}. Só DEEP_SECURITY e SOURCE_SECURITY_SCAN podem ser reexecutadas automaticamente.`,
    );
  }
  return categories;
}

function toDto(row: {
  id: string;
  projectId: string;
  categories: unknown;
  frequency: string;
  active: boolean;
  lastRunAt: Date | null;
  lastRunAnalysisId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AnalysisSchedule {
  return {
    id: row.id,
    projectId: row.projectId,
    categories: row.categories as AnalysisCategory[],
    frequency: row.frequency as AnalysisScheduleFrequency,
    active: row.active,
    lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
    lastRunAnalysisId: row.lastRunAnalysisId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
