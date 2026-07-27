import {
  ALL_CATEGORIES,
  type AnalysisCategory,
  type AnalysisComparison,
  type AnalysisDetail,
  type AnalysisSummary,
  type DashboardStats,
  type IssueFilters,
  type StartAnalysisRequest,
} from "@qa-ai/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../infrastructure/database/prisma.js";
import {
  cancelPendingAnalysis,
  enqueueAnalysis,
} from "../infrastructure/queue/runner.js";
import { toAnalysisDto, toIssueDto, toPageDto } from "./mappers.js";

export class NotFoundError extends Error {
  readonly statusCode = 404;
}

export const analysisService = {
  /**
   * Hub "Análise": todas as análises da organização, de qualquer projeto,
   * mais recentes primeiro — com o nome/URL do projeto já embutido para não
   * precisar de N+1 no front.
   */
  async listAll(organizationId: string): Promise<AnalysisSummary[]> {
    const rows = await prisma.analysis.findMany({
      where: { project: { organizationId } },
      include: { project: { select: { name: true, url: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((r) => ({
      ...toAnalysisDto(r),
      projectName: r.project.name,
      projectUrl: r.project.url,
    }));
  },

  /** Cria a análise (QUEUED) e coloca na fila para processamento assíncrono. */
  async start(
    organizationId: string,
    projectId: string,
    input: StartAnalysisRequest,
  ) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: { organization: { include: { subscription: true } } },
    });
    if (!project) throw new NotFoundError("Projeto não encontrado");

    const sub = project.organization.subscription;
    // Default menor = análise mais rápida na maioria dos sites; o usuário
    // pode pedir mais páginas explicitamente (até o limite do plano).
    const maxPages = Math.min(
      input.maxPages ?? 12,
      sub?.maxPagesPerAnalysis ?? 50,
    );

    const categories = normalizeCategories(input.categories);

    const last = await prisma.analysis.findFirst({
      where: { projectId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const analysis = await prisma.analysis.create({
      data: {
        projectId,
        version: (last?.version ?? 0) + 1,
        status: "QUEUED",
        config: {
          url: input.url ?? project.url,
          categories,
          maxDepth: input.maxDepth ?? 2,
          maxPages,
        },
      },
    });

    await enqueueAnalysis(analysis.id);
    return toAnalysisDto(analysis);
  },

  async listByProject(organizationId: string, projectId: string) {
    await assertProject(organizationId, projectId);
    const analyses = await prisma.analysis.findMany({
      where: { projectId },
      orderBy: { version: "desc" },
    });
    return analyses.map(toAnalysisDto);
  },

  async detail(
    organizationId: string,
    analysisId: string,
    filters: IssueFilters = {},
  ): Promise<AnalysisDetail> {
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, project: { organizationId } },
      include: { pages: true },
    });
    if (!analysis) throw new NotFoundError("Análise não encontrada");

    const where: Prisma.IssueWhereInput = { analysisId };
    if (filters.category) where.category = filters.category as never;
    if (filters.severity) where.severity = filters.severity as never;
    if (filters.status) {
      // "ALL" mostra tudo, incluindo problemas descartados pela IA.
      if (filters.status !== "ALL") where.status = filters.status as never;
    } else {
      // Por padrão esconde IGNORED (falsos positivos filtrados pela IA).
      where.status = { not: "IGNORED" } as never;
    }
    if (filters.pageUrl) where.pageUrl = filters.pageUrl;
    if (filters.search)
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];

    const issues = await prisma.issue.findMany({
      where,
      include: { evidence: true },
      orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
    });

    return {
      ...toAnalysisDto(analysis),
      pages: analysis.pages.map(toPageDto),
      issues: issues.map(toIssueDto),
    };
  },

  async updateIssueStatus(
    organizationId: string,
    issueId: string,
    status: string,
  ) {
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, analysis: { project: { organizationId } } },
    });
    if (!issue) throw new NotFoundError("Problema não encontrado");
    return prisma.issue.update({
      where: { id: issueId },
      data: { status: status as never },
    });
  },

  /** Compara duas versões: o que foi corrigido, o que surgiu, o que persiste. */
  async compare(
    organizationId: string,
    fromId: string,
    toId: string,
  ): Promise<AnalysisComparison> {
    const [from, to] = await Promise.all([
      prisma.analysis.findFirst({
        where: { id: fromId, project: { organizationId } },
        include: { issues: { include: { evidence: true } } },
      }),
      prisma.analysis.findFirst({
        where: { id: toId, project: { organizationId } },
        include: { issues: { include: { evidence: true } } },
      }),
    ]);
    if (!from || !to) throw new NotFoundError("Análise não encontrada");

    const fromFps = new Set(from.issues.map((i) => i.fingerprint));
    const toFps = new Set(to.issues.map((i) => i.fingerprint));

    const fixedIssues = from.issues
      .filter((i) => !toFps.has(i.fingerprint))
      .map(toIssueDto);
    const newIssues = to.issues
      .filter((i) => !fromFps.has(i.fingerprint))
      .map(toIssueDto);
    const persistingIssues = to.issues
      .filter((i) => fromFps.has(i.fingerprint))
      .map(toIssueDto);

    const fromScore =
      (from.score as unknown as { overall?: number } | null)?.overall ?? 0;
    const toScore =
      (to.score as unknown as { overall?: number } | null)?.overall ?? 0;

    return {
      from: toAnalysisDto(from),
      to: toAnalysisDto(to),
      scoreDelta: toScore - fromScore,
      fixedIssues,
      newIssues,
      persistingIssues,
    };
  },

  /** Remove uma análise (e problemas/evidências em cascata) e cancela o processamento se ainda pendente. */
  async remove(organizationId: string, analysisId: string): Promise<void> {
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, project: { organizationId } },
      select: { id: true },
    });
    if (!analysis) throw new NotFoundError("Análise não encontrada");

    // Se ainda não começou a processar, tira da fila em memória.
    cancelPendingAnalysis(analysisId);

    await prisma.analysis.delete({ where: { id: analysisId } });
  },

  async dashboard(organizationId: string): Promise<DashboardStats> {
    const [projectCount, analyses] = await Promise.all([
      prisma.project.count({ where: { organizationId } }),
      prisma.analysis.findMany({
        where: { project: { organizationId }, status: "COMPLETED" },
        select: { durationMs: true, issueCount: true, score: true },
      }),
    ]);

    const durations = analyses
      .map((a) => a.durationMs)
      .filter((d): d is number => d !== null);
    const scores = analyses
      .map((a) => (a.score as unknown as { overall?: number } | null)?.overall)
      .filter((s): s is number => typeof s === "number");

    return {
      totalAnalyses: analyses.length,
      totalProjects: projectCount,
      monitoredSites: projectCount,
      averageDurationMs: durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
      totalIssues: analyses.reduce((s, a) => s + a.issueCount, 0),
      averageScore: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null,
    };
  },
};

// A análise completa "padrão" não inclui DEEP_SECURITY por padrão — é uma
// auditoria mais pesada (DNS, TLS, varredura de caminhos) e opt-in.
const DEFAULT_CATEGORIES = ALL_CATEGORIES.filter((c) => c !== "DEEP_SECURITY");

function normalizeCategories(input?: string[]): AnalysisCategory[] {
  if (!input || input.length === 0) return [...DEFAULT_CATEGORIES];
  const valid = new Set<string>(ALL_CATEGORIES);
  const filtered = input.filter((c) => valid.has(c)) as AnalysisCategory[];
  return filtered.length ? filtered : [...DEFAULT_CATEGORIES];
}

async function assertProject(organizationId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  if (!project) throw new NotFoundError("Projeto não encontrado");
}
