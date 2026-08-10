import type {
  CreateProjectRequest,
  Project,
  ProjectWithStats,
} from "@qa-ai/shared";
import { prisma } from "../infrastructure/database/prisma.js";
import { assertPublicUrl } from "../infrastructure/security/url-guard.js";
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
    const url = normalizeUrl(input.url);
    // Bloqueia SSRF aqui pra dar feedback rápido no cadastro — a checagem
    // que realmente importa (barra o crawler de verdade) é a de
    // analysis.service.ts.start(), porque a URL efetiva de cada análise
    // pode ser sobrescrita por request (StartAnalysisRequest.url), sem
    // passar de novo por aqui.
    await assertPublicUrl(url);
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        url,
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

  /**
   * Registra (ou revoga) o consentimento de Teste Ativo Autorizado —
   * fica gravado com quem e quando confirmou, mesmo espírito de auditoria
   * das outras confirmações explícitas do produto (ex.: exclusão de conta).
   * Este é o único lugar que grava `activeTestingConsent = true`; o gate
   * de verdade que impede a categoria de rodar sem isso fica em
   * analysis.service.ts (ConsentRequiredError).
   */
  async updateActiveTestingConsent(
    organizationId: string,
    id: string,
    userId: string,
    consent: boolean,
  ): Promise<Project> {
    const project = await prisma.project.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("Projeto não encontrado");
    const updated = await prisma.project.update({
      where: { id },
      data: consent
        ? {
            activeTestingConsent: true,
            activeTestingConsentAt: new Date(),
            activeTestingConsentByUserId: userId,
          }
        : {
            activeTestingConsent: false,
            activeTestingConsentAt: null,
            activeTestingConsentByUserId: null,
          },
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
  createdAt: Date;
  updatedAt: Date;
  activeTestingConsent: boolean;
  activeTestingConsentAt: Date | null;
}): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    url: p.url,
    ownerId: p.organizationId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    activeTestingConsent: p.activeTestingConsent,
    activeTestingConsentAt: p.activeTestingConsentAt?.toISOString() ?? null,
  };
}
