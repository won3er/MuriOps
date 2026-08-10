import type { ReconciliationResult, ScoreBreakdown } from "@qa-ai/shared";
import { prisma } from "../infrastructure/database/prisma.js";
import { evaluateQualityGates } from "../modules/analysis/quality-gates.js";
import { NotFoundError } from "./analysis.service.js";
import { remediationService } from "./remediation.service.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Reconciliação — substitui o antigo ciclo autônomo de Orquestração (ver
 * CLAUDE.md, 09/08/2026). Sem execução nem estado próprio: cada chamada
 * recalcula na hora, comparando a última Analysis concluída do projeto com
 * os RemediationPlans (Aplicações) gerados a partir dela, e avaliando os
 * quality gates do projeto contra o score dessa análise.
 */
export const reconciliationService = {
  async getForProject(
    organizationId: string,
    projectId: string,
  ): Promise<ReconciliationResult> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("Projeto não encontrado");

    const latestAnalysis = await prisma.analysis.findFirst({
      where: { projectId, status: "COMPLETED" },
      orderBy: { version: "desc" },
      select: { id: true, version: true, finishedAt: true, score: true },
    });

    if (!latestAnalysis) {
      return {
        projectId,
        status: "no_analysis",
        latestAnalysis: null,
        plans: [],
        totalItems: 0,
        totalDone: 0,
        totalPending: 0,
        gateEvaluation: null,
      };
    }

    const score = latestAnalysis.score as unknown as ScoreBreakdown | null;
    const overallScore = score?.overall ?? null;
    const daysSinceFinished = latestAnalysis.finishedAt
      ? Math.floor((Date.now() - latestAnalysis.finishedAt.getTime()) / MS_PER_DAY)
      : null;

    const allPlans = await remediationService.list(organizationId, projectId);
    const plans = allPlans.filter(
      (p) => p.sourceType === "analysis" && p.sourceId === latestAnalysis.id,
    );

    const totalItems = plans.reduce((sum, p) => sum + p.itemCount, 0);
    const totalDone = plans.reduce((sum, p) => sum + p.doneCount, 0);
    const totalPending = totalItems - totalDone;

    const gates = await prisma.projectQualityGate.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    const gateEvaluation =
      gates.length > 0 && score
        ? evaluateQualityGates(score, gates.map(toGateDto))
        : null;

    let status: ReconciliationResult["status"];
    if (plans.length === 0) {
      status = "no_plan";
    } else if (totalPending > 0) {
      status = "pending_items";
    } else if (gateEvaluation && !gateEvaluation.passed) {
      status = "applied_gate_failing";
    } else {
      status = "all_applied";
    }

    return {
      projectId,
      status,
      latestAnalysis: {
        id: latestAnalysis.id,
        version: latestAnalysis.version,
        finishedAt: latestAnalysis.finishedAt?.toISOString() ?? null,
        overallScore,
        daysSinceFinished,
      },
      plans,
      totalItems,
      totalDone,
      totalPending,
      gateEvaluation,
    };
  },
};

function toGateDto(row: {
  id: string;
  projectId: string;
  category: string | null;
  minScore: number;
  label: string | null;
  sourceBlueprintId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
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
