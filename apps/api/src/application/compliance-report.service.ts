import type { ComplianceReport } from "@qa-ai/shared";
import { prisma } from "../infrastructure/database/prisma.js";
import { NotFoundError } from "./analysis.service.js";

/**
 * Relatório de compliance — AUTOAVALIAÇÃO, nunca certificação. Monta um
 * documento estruturado a partir de achados reais (Análise mais recente,
 * Fluxos Críticos, Continuous Coverage) para o usuário levar a um auditor
 * ou cliente que peça evidência de postura de segurança. Deliberadamente
 * NÃO reivindica conformidade com nenhum framework (SOC2/ISO27001/PCI) —
 * o MuriOps não passou por nenhuma auditoria formal. Ver CLAUDE.md,
 * decisão de 10/08/2026 sobre selos de certificação.
 */
export const complianceReportService = {
  async generate(organizationId: string, projectId: string): Promise<ComplianceReport> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true, name: true, url: true },
    });
    if (!project) throw new NotFoundError("Projeto não encontrado");

    const analysis = await prisma.analysis.findFirst({
      where: { projectId, status: "COMPLETED" },
      orderBy: { version: "desc" },
      include: { issues: { select: { severity: true, category: true, status: true } } },
    });

    const openIssues = (analysis?.issues ?? []).filter((i) => i.status !== "IGNORED");
    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const issue of openIssues) {
      bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
      byCategory[issue.category] = (byCategory[issue.category] ?? 0) + 1;
    }

    const flows = await prisma.criticalFlow.findMany({
      where: { projectId, organizationId },
      select: { name: true, active: true, lastRunStatus: true, lastRunAt: true },
    });

    const schedules = await prisma.analysisSchedule.findMany({
      where: { projectId, organizationId },
      select: { categories: true, frequency: true, active: true, lastRunAt: true },
    });

    const connections = await prisma.adapterConnection.findMany({
      where: { projectId, organizationId, kind: { in: ["GITHUB", "GITLAB"] } },
      select: { kind: true },
    });

    return {
      projectId: project.id,
      projectName: project.name,
      projectUrl: project.url,
      generatedAt: new Date().toISOString(),
      repoConnected: connections.length > 0,
      latestAnalysis: analysis
        ? {
            id: analysis.id,
            version: analysis.version,
            finishedAt: analysis.finishedAt?.toISOString() ?? null,
            overallScore: (analysis.score as { overall?: number } | null)?.overall ?? null,
            openIssueCount: openIssues.length,
            issuesBySeverity: bySeverity,
            issuesByCategory: byCategory,
          }
        : null,
      continuousMonitoring: {
        criticalFlowCount: flows.length,
        criticalFlowActiveCount: flows.filter((f) => f.active).length,
        criticalFlowFailingCount: flows.filter((f) => f.lastRunStatus === "FAILED").length,
        securityScheduleCount: schedules.length,
        securityScheduleActiveCount: schedules.filter((s) => s.active).length,
      },
    };
  },
};
