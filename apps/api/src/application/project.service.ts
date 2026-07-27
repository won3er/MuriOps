import type {
  CreateProjectRequest,
  Project,
  ProjectWithStats,
} from "@qa-ai/shared";
import { prisma } from "../infrastructure/database/prisma.js";
import { NotFoundError } from "./analysis.service.js";

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export const projectService = {
  async create(
    organizationId: string,
    userId: string,
    input: CreateProjectRequest,
  ): Promise<Project> {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        url: normalizeUrl(input.url),
        organizationId,
        createdById: userId,
      },
    });
    return toDto(project);
  },

  async list(organizationId: string): Promise<ProjectWithStats[]> {
    const projects = await prisma.project.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      include: {
        analyses: {
          where: { status: "COMPLETED" },
          orderBy: { version: "desc" },
          take: 1,
        },
        _count: { select: { analyses: true } },
      },
    });

    return projects.map((p) => {
      const last = p.analyses[0];
      const score =
        (last?.score as unknown as { overall?: number } | null)?.overall ??
        null;
      return {
        ...toDto(p),
        analysisCount: p._count.analyses,
        lastScore: score,
        lastAnalysisAt: last?.finishedAt?.toISOString() ?? null,
      };
    });
  },

  /** Inclui métricas (analysisCount, lastScore, lastAnalysisAt) — a tela de Projetos é o painel administrativo/dashboard. */
  async getById(organizationId: string, id: string): Promise<ProjectWithStats | null> {
    const project = await prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        analyses: {
          where: { status: "COMPLETED" },
          orderBy: { version: "desc" },
          take: 1,
        },
        _count: { select: { analyses: true } },
      },
    });
    if (!project) return null;
    const last = project.analyses[0];
    const score =
      (last?.score as unknown as { overall?: number } | null)?.overall ?? null;
    return {
      ...toDto(project),
      analysisCount: project._count.analyses,
      lastScore: score,
      lastAnalysisAt: last?.finishedAt?.toISOString() ?? null,
    };
  },

  /** Remove o projeto e todas as análises/problemas/evidências em cascata. */
  async remove(organizationId: string, id: string): Promise<void> {
    const project = await prisma.project.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("Projeto não encontrado");
    await prisma.project.delete({ where: { id } });
  },

  /** Atualiza o nível de autonomia do orquestrador pra este projeto. */
  async updateAutonomyLevel(
    organizationId: string,
    id: string,
    autonomyLevel: Project["autonomyLevel"],
  ): Promise<Project> {
    const project = await prisma.project.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("Projeto não encontrado");
    const updated = await prisma.project.update({
      where: { id },
      data: { autonomyLevel },
    });
    return toDto(updated);
  },
};

function toDto(p: {
  id: string;
  name: string;
  description: string | null;
  url: string;
  organizationId: string;
  autonomyLevel: string;
  createdAt: Date;
  updatedAt: Date;
}): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    url: p.url,
    ownerId: p.organizationId,
    autonomyLevel: p.autonomyLevel as Project["autonomyLevel"],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
