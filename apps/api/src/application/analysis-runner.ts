import {
  AnalysisStatus,
  ALL_CATEGORIES,
  type AnalysisCategory,
} from "@qa-ai/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../infrastructure/database/prisma.js";
import { decryptSecret } from "../infrastructure/crypto/secret-box.js";
import {
  AI_PROVIDER_NAMES,
  type AiOverride,
} from "../infrastructure/ai/index.js";
import { runEngine, type EngineResult } from "../modules/analysis/engine.js";

interface AnalysisConfig {
  url: string;
  categories: AnalysisCategory[];
  maxDepth: number;
  maxPages: number;
}

/**
 * Caso de uso executado pelo worker: carrega a análise enfileirada,
 * roda o engine e persiste páginas, problemas, evidências e scores.
 */
export async function runAnalysis(analysisId: string): Promise<void> {
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { project: true },
  });
  if (!analysis) throw new Error(`Análise ${analysisId} não encontrada`);

  const config = normalizeConfig(analysis.config, analysis.project.url);
  const aiOverride = await loadAiOverride(analysis.project.organizationId);

  await prisma.analysis.update({
    where: { id: analysisId },
    data: { status: AnalysisStatus.CRAWLING, startedAt: new Date() },
  });

  try {
    const result = await runEngine({
      analysisId,
      siteUrl: config.url,
      categories: config.categories,
      maxDepth: config.maxDepth,
      maxPages: config.maxPages,
      aiOverride,
      organizationId: analysis.project.organizationId,
      projectId: analysis.projectId,
      onStatus: async (status) => {
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status },
        });
      },
    });

    await persist(analysisId, result);
  } catch (err) {
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: AnalysisStatus.FAILED,
        error: err instanceof Error ? err.message : String(err),
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}

/**
 * Persiste sequencialmente, sem `prisma.$transaction` interativo: o pooler
 * do Supabase (PgBouncer em modo transaction, usado em `DATABASE_URL`) não
 * suporta transações interativas do Prisma — a conexão de sessão implícita
 * que o `$transaction(async (tx) => ...)` espera manter entre as várias
 * queries do callback pode ser reciclada pelo pooler no meio do caminho,
 * derrubando com "Transaction not found... obtained before disconnecting".
 * Sem atomicidade entre os inserts (aceito: uma falha no meio deixa dados
 * parciais, mas a análise já fica marcada como erro nesse caso).
 */
async function persist(analysisId: string, result: EngineResult): Promise<void> {
  {
    const tx = prisma;
    // Páginas descobertas.
    if (result.pages.length) {
      await tx.crawledPage.createMany({
        data: result.pages.map((p) => ({
          analysisId,
          url: p.url,
          title: p.title,
          depth: p.depth,
          linkedFrom: p.linkedFrom,
          statusCode: p.statusCode,
        })),
      });
    }

    // Evidências gerais da análise (screenshot/console/network por página),
    // sem vínculo a um problema específico — servem de índice pra achar o
    // arquivo/metadados originais na hora de vincular abaixo.
    const evidenceIndex = new Map<string, (typeof result.evidence)[number]>();
    for (const ev of result.evidence) {
      await tx.evidence.create({
        data: {
          analysisId,
          type: ev.type,
          path: ev.path,
          pageUrl: ev.pageUrl,
          viewport: ev.viewport,
          meta: ev.meta
            ? (ev.meta as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      });
      evidenceIndex.set(ev.path, ev);
    }

    // Problemas + evidência própria por problema. Cria uma linha de Evidence
    // DEDICADA por vínculo problema↔arquivo (mesmo que vários problemas
    // apontem pro mesmo screenshot) — Evidence.issueId é 1:1, então reusar a
    // mesma linha entre problemas diferentes faria cada INSERT roubar o
    // vínculo do problema anterior, deixando só o último com evidência.
    for (const issue of result.issues) {
      const created = await tx.issue.create({
        data: {
          analysisId,
          title: issue.title,
          description: issue.description,
          category: issue.category,
          severity: issue.severity,
          status: issue.status,
          pageUrl: issue.pageUrl,
          selector: issue.selector,
          stepsToReproduce: issue.stepsToReproduce,
          impact: issue.impact,
          suggestion: issue.suggestion,
          raw: issue.raw,
          fingerprint: issue.fingerprint,
        },
      });
      for (const path of issue.evidencePaths) {
        const original = evidenceIndex.get(path);
        await tx.evidence.create({
          data: {
            analysisId,
            issueId: created.id,
            type: original?.type ?? "SCREENSHOT",
            path,
            pageUrl: original?.pageUrl ?? issue.pageUrl,
            viewport: original?.viewport ?? null,
            meta: original?.meta
              ? (original.meta as unknown as Prisma.InputJsonValue)
              : undefined,
          },
        });
      }
    }

    // Fecha a análise com score e resumo.
    await tx.analysis.update({
      where: { id: analysisId },
      data: {
        status: AnalysisStatus.COMPLETED,
        score: result.score as unknown as Prisma.InputJsonValue,
        aiSummary: result.aiSummary,
        pagesDiscovered: result.pages.length,
        issueCount: result.issues.filter((i) => i.status !== "IGNORED").length,
        durationMs: result.durationMs,
        finishedAt: new Date(),
      },
    });
  }
}

/** Busca a chave de IA própria da organização, se configurada. */
async function loadAiOverride(organizationId: string): Promise<AiOverride | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { aiProvider: true, aiApiKeyEncrypted: true },
  });
  if (!org?.aiProvider || !org.aiApiKeyEncrypted) return null;
  if (!AI_PROVIDER_NAMES.includes(org.aiProvider as never)) return null;

  try {
    return {
      provider: org.aiProvider as AiOverride["provider"],
      apiKey: decryptSecret(org.aiApiKeyEncrypted),
    };
  } catch {
    return null;
  }
}

function normalizeConfig(raw: unknown, fallbackUrl: string): AnalysisConfig {
  const c = (raw ?? {}) as Partial<AnalysisConfig>;
  return {
    url: c.url ?? fallbackUrl,
    categories:
      Array.isArray(c.categories) && c.categories.length
        ? (c.categories as AnalysisCategory[])
        : [...ALL_CATEGORIES],
    maxDepth: typeof c.maxDepth === "number" ? c.maxDepth : 2,
    maxPages: typeof c.maxPages === "number" ? c.maxPages : 20,
  };
}
