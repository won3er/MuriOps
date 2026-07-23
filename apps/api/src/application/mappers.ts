import type {
  Analysis,
  AnalysisCategory,
  CrawledPage,
  Evidence,
  Issue,
  ScoreBreakdown,
} from "@qa-ai/shared";
import type {
  Analysis as PrismaAnalysis,
  CrawledPage as PrismaPage,
  Evidence as PrismaEvidence,
  Issue as PrismaIssue,
} from "@prisma/client";

export function toAnalysisDto(a: PrismaAnalysis): Analysis {
  return {
    id: a.id,
    projectId: a.projectId,
    status: a.status,
    version: a.version,
    categories:
      (a.config as unknown as { categories?: AnalysisCategory[] } | null)
        ?.categories ?? [],
    score: (a.score as unknown as ScoreBreakdown | null) ?? null,
    pagesDiscovered: a.pagesDiscovered,
    issueCount: a.issueCount,
    durationMs: a.durationMs,
    error: a.error,
    aiSummary: a.aiSummary,
    startedAt: a.startedAt?.toISOString() ?? null,
    finishedAt: a.finishedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

export function toPageDto(p: PrismaPage): CrawledPage {
  return {
    url: p.url,
    title: p.title,
    depth: p.depth,
    linkedFrom: p.linkedFrom,
    statusCode: p.statusCode,
  };
}

export function toEvidenceDto(e: PrismaEvidence): Evidence {
  return {
    id: e.id,
    type: e.type,
    url: `/evidence/${e.path}`,
    pageUrl: e.pageUrl,
    viewport: e.viewport,
    capturedAt: e.capturedAt.toISOString(),
    meta: (e.meta as unknown as Record<string, unknown> | null) ?? null,
  };
}

export function toIssueDto(
  i: PrismaIssue & { evidence?: PrismaEvidence[] },
): Issue {
  return {
    id: i.id,
    analysisId: i.analysisId,
    title: i.title,
    description: i.description,
    category: i.category,
    severity: i.severity,
    status: i.status,
    pageUrl: i.pageUrl,
    selector: i.selector,
    stepsToReproduce: i.stepsToReproduce,
    impact: i.impact,
    suggestion: i.suggestion,
    raw: i.raw,
    evidence: (i.evidence ?? []).map(toEvidenceDto),
    fingerprint: i.fingerprint,
    createdAt: i.createdAt.toISOString(),
  };
}
