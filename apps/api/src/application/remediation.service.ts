import type {
  CreateRemediationPlanRequest,
  RemediationItemStatus,
  RemediationPlan,
  RemediationProviderName,
  RemediationResult,
  RemediationSummary,
} from "@qa-ai/shared";
import type { Prisma } from "@prisma/client";
import {
  AI_PROVIDER_NAMES,
  createAiProviderFor,
  type AiOverride,
  type AiProviderName,
} from "../infrastructure/ai/index.js";
import type { RemediationDesignInput } from "../infrastructure/ai/remediation-prompt.js";
import { decryptSecret } from "../infrastructure/crypto/secret-box.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { NotFoundError } from "./analysis.service.js";

export const remediationService = {
  /**
   * Cria a Aplicação em `PENDING` e dispara a geração em background — a
   * resposta HTTP volta na hora, o front acompanha por polling (mesmo padrão
   * do Blueprint). A origem (Análise ou Blueprint) já precisa existir e ter
   * um resultado pronto.
   */
  async create(
    organizationId: string,
    userId: string,
    input: CreateRemediationPlanRequest,
  ): Promise<RemediationPlan> {
    const source = await loadSource(organizationId, input.sourceType, input.sourceId);
    const providerName = await resolveProviderName(organizationId, input.provider);

    const created = await prisma.remediationPlan.create({
      data: {
        organizationId,
        projectId: source.projectId,
        createdById: userId,
        sourceType: input.sourceType === "analysis" ? "ANALYSIS" : "BLUEPRINT",
        sourceId: input.sourceId,
        title: source.title,
        provider: providerName,
        status: "PENDING",
      },
    });

    void generate(created.id, organizationId, {
      title: source.title,
      siteUrl: source.siteUrl,
      context: source.context,
    });
    return toDto(created);
  },

  /** Lista as Aplicações da organização, opcionalmente filtradas por projeto. */
  async list(
    organizationId: string,
    projectId?: string,
  ): Promise<RemediationSummary[]> {
    const rows = await prisma.remediationPlan.findMany({
      where: { organizationId, ...(projectId ? { projectId } : {}) },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toSummary);
  },

  async getById(
    organizationId: string,
    id: string,
  ): Promise<RemediationPlan | null> {
    const row = await prisma.remediationPlan.findFirst({
      where: { id, organizationId },
    });
    return row ? toDto(row) : null;
  },

  /** Marca um item do checklist como feito/pendente (aplicação manual). */
  async updateItemStatus(
    organizationId: string,
    id: string,
    itemId: string,
    status: RemediationItemStatus,
  ): Promise<RemediationPlan> {
    const row = await prisma.remediationPlan.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundError("Aplicação não encontrada");
    const result = row.result as unknown as RemediationResult | null;
    if (!result) throw new NotFoundError("O plano ainda não foi gerado");

    const items = result.items.map((it) =>
      it.id === itemId ? { ...it, status } : it,
    );
    const updated = await prisma.remediationPlan.update({
      where: { id },
      data: {
        result: { ...result, items } as unknown as Prisma.InputJsonValue,
      },
    });
    return toDto(updated);
  },

  async remove(organizationId: string, id: string): Promise<void> {
    const row = await prisma.remediationPlan.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!row) throw new NotFoundError("Aplicação não encontrada");
    await prisma.remediationPlan.delete({ where: { id } });
  },
};

// ---------- geração em background ----------

async function generate(
  id: string,
  organizationId: string,
  input: RemediationDesignInput,
): Promise<void> {
  try {
    const plan = await prisma.remediationPlan.findUnique({ where: { id } });
    if (!plan) return;

    const providerName = (
      AI_PROVIDER_NAMES.includes(plan.provider as never) ? plan.provider : "claude"
    ) as AiProviderName;
    const override = await loadAiOverride(organizationId);

    const ai = createAiProviderFor(providerName, override);
    const result = await ai.buildRemediationPlan(input);

    await prisma.remediationPlan.update({
      where: { id },
      data: {
        status: "READY",
        provider: ai.name,
        result: result as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(`✅ Aplicação ${id} gerada (${ai.name})`);
  } catch (err) {
    await prisma.remediationPlan
      .update({
        where: { id },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : String(err),
        },
      })
      .catch(() => {});
    console.error(
      `❌ Aplicação ${id} falhou:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/** No boot, aplicações presas em PENDING (processo caiu) viram FAILED. */
export async function recoverStaleRemediationPlans(): Promise<void> {
  const stale = await prisma.remediationPlan.updateMany({
    where: { status: "PENDING" },
    data: {
      status: "FAILED",
      error: "Geração interrompida (API reiniciada). Tente gerar de novo.",
    },
  });
  if (stale.count > 0) {
    console.log(
      `♻️  ${stale.count} aplicação(ões) presa(s) marcada(s) como FAILED no boot.`,
    );
  }
}

// ---------- helpers ----------

interface RemediationSource {
  title: string;
  projectId: string | null;
  siteUrl: string | null;
  context: string;
}

/** Carrega a Análise ou o Blueprint de origem e serializa em texto pra IA. */
async function loadSource(
  organizationId: string,
  sourceType: "analysis" | "blueprint",
  sourceId: string,
): Promise<RemediationSource> {
  if (sourceType === "analysis") {
    const analysis = await prisma.analysis.findFirst({
      where: { id: sourceId, project: { organizationId } },
      include: { project: true, issues: true },
    });
    if (!analysis) throw new NotFoundError("Análise não encontrada");
    if (analysis.status !== "COMPLETED")
      throw new NotFoundError("A análise ainda não terminou — aguarde para gerar a Aplicação");

    const openIssues = analysis.issues.filter((i) => i.status !== "IGNORED");
    const lines = openIssues.map(
      (i) =>
        `- [${i.severity}/${i.category}] ${i.title}${i.pageUrl ? ` (${i.pageUrl})` : ""}: ${i.description}${
          i.suggestion ? ` Sugestão: ${i.suggestion}` : ""
        }`,
    );
    const context = [
      `Site: ${analysis.project.url}`,
      `Score geral: ${(analysis.score as unknown as { overall?: number } | null)?.overall ?? "?"}/100`,
      `Problemas encontrados (${openIssues.length}):`,
      ...lines,
    ].join("\n");

    return {
      title: `Aplicação — ${analysis.project.name} (análise v${analysis.version})`,
      projectId: analysis.projectId,
      siteUrl: analysis.project.url,
      context,
    };
  }

  const blueprint = await prisma.blueprint.findFirst({
    where: { id: sourceId, organizationId },
  });
  if (!blueprint) throw new NotFoundError("Blueprint não encontrado");
  if (blueprint.status !== "READY" || !blueprint.result)
    throw new NotFoundError("O blueprint ainda não foi gerado — aguarde para gerar a Aplicação");

  const r = blueprint.result as unknown as {
    summary?: string;
    objectives?: { goal?: string; scope?: string };
    techStack?: { category?: string; choice?: string; rationale?: string }[];
    milestones?: { name?: string; deliverables?: string[]; qaFocus?: string }[];
    qualityGates?: { stage?: string; criteria?: string[] }[];
    riskMatrix?: { risk?: string; mitigation?: string }[];
  };
  const parts = [
    `Resumo do plano: ${r.summary ?? ""}`,
    r.objectives?.goal ? `Meta: ${r.objectives.goal}` : "",
    r.techStack?.length
      ? `Stack: ${r.techStack.map((t) => `${t.category}: ${t.choice} (${t.rationale ?? ""})`).join("; ")}`
      : "",
    r.milestones?.length
      ? `Marcos: ${r.milestones.map((m) => `${m.name} — ${(m.deliverables ?? []).join(", ")}`).join(" | ")}`
      : "",
    r.qualityGates?.length
      ? `Quality gates: ${r.qualityGates.map((g) => `${g.stage}: ${(g.criteria ?? []).join(", ")}`).join(" | ")}`
      : "",
    r.riskMatrix?.length
      ? `Riscos: ${r.riskMatrix.map((k) => `${k.risk} → ${k.mitigation}`).join(" | ")}`
      : "",
  ].filter(Boolean);

  return {
    title: `Aplicação — ${blueprint.title}`,
    projectId: blueprint.projectId,
    siteUrl: null,
    context: parts.join("\n"),
  };
}

/** Provider efetivo: o pedido no request, ou o configurado na org, ou 'claude'. */
async function resolveProviderName(
  organizationId: string,
  requested?: RemediationProviderName,
): Promise<AiProviderName> {
  if (requested && AI_PROVIDER_NAMES.includes(requested)) return requested;
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { aiProvider: true },
  });
  if (org?.aiProvider && AI_PROVIDER_NAMES.includes(org.aiProvider as never)) {
    return org.aiProvider as AiProviderName;
  }
  return "claude";
}

/** Chave de IA própria da organização, se configurada. */
async function loadAiOverride(
  organizationId: string,
): Promise<AiOverride | null> {
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

function toDto(row: {
  id: string;
  projectId: string | null;
  sourceType: string;
  sourceId: string;
  title: string;
  provider: string;
  status: string;
  result: unknown;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}): RemediationPlan {
  return {
    id: row.id,
    projectId: row.projectId,
    sourceType: row.sourceType === "ANALYSIS" ? "analysis" : "blueprint",
    sourceId: row.sourceId,
    title: row.title,
    provider: row.provider,
    status: row.status as RemediationPlan["status"],
    result: (row.result as RemediationResult | null) ?? null,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSummary(row: {
  id: string;
  projectId: string | null;
  sourceType: string;
  sourceId: string;
  title: string;
  status: string;
  result: unknown;
  createdAt: Date;
  updatedAt: Date;
}): RemediationSummary {
  const result = row.result as unknown as RemediationResult | null;
  const items = result?.items ?? [];
  return {
    id: row.id,
    projectId: row.projectId,
    sourceType: row.sourceType === "ANALYSIS" ? "analysis" : "blueprint",
    sourceId: row.sourceId,
    title: row.title,
    status: row.status as RemediationSummary["status"],
    itemCount: items.length,
    doneCount: items.filter((i) => i.status === "done").length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
