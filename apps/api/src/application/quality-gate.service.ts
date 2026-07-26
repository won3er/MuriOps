import type { ProjectQualityGate } from "@qa-ai/shared";
import { prisma } from "../infrastructure/database/prisma.js";
import { NotFoundError } from "./analysis.service.js";

/**
 * CRUD simples de `ProjectQualityGate` — o critério numérico que o
 * orquestrador avalia a cada iteração (`modules/analysis/quality-gates.ts`).
 * Sem UI dedicada ainda; a tela de orquestração usa esses gates só pra exibir.
 */
export const qualityGateService = {
  async list(organizationId: string, projectId: string): Promise<ProjectQualityGate[]> {
    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) throw new NotFoundError("Projeto não encontrado");
    const rows = await prisma.projectQualityGate.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toDto);
  },

  async create(
    organizationId: string,
    projectId: string,
    input: { category: ProjectQualityGate["category"]; minScore: number; label?: string },
  ): Promise<ProjectQualityGate> {
    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) throw new NotFoundError("Projeto não encontrado");
    const row = await prisma.projectQualityGate.create({
      data: {
        projectId,
        category: (input.category ?? null) as never,
        minScore: input.minScore,
        label: input.label ?? null,
      },
    });
    return toDto(row);
  },

  async remove(organizationId: string, projectId: string, gateId: string): Promise<void> {
    const row = await prisma.projectQualityGate.findFirst({
      where: { id: gateId, projectId, project: { organizationId } },
      select: { id: true },
    });
    if (!row) throw new NotFoundError("Quality gate não encontrado");
    await prisma.projectQualityGate.delete({ where: { id: gateId } });
  },
};

function toDto(row: {
  id: string;
  projectId: string;
  category: string | null;
  minScore: number;
  label: string | null;
  sourceBlueprintId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProjectQualityGate {
  return {
    id: row.id,
    projectId: row.projectId,
    category: row.category,
    minScore: row.minScore,
    label: row.label,
    sourceBlueprintId: row.sourceBlueprintId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
