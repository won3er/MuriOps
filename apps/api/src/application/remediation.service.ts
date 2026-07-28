import { randomBytes } from "node:crypto";
import type {
  CreateRemediationPlanRequest,
  RemediationItem,
  RemediationItemStatus,
  RemediationPlan,
  RemediationProviderName,
  RemediationResult,
  RemediationScope,
  RemediationSummary,
  UpgradeResult,
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
    // "Atualizar" (UpgradePlan) já vem com o resultado pronto — sem passar
    // por loadSource/geração de IA, só mapeia os itens e envia direto pra
    // Aplicação, que é o executor final.
    if (input.sourceType === "upgrade") {
      return createFromUpgrade(organizationId, userId, input.sourceId);
    }

    const source = await loadSource(
      organizationId,
      input.sourceType,
      input.sourceId,
      input.scope,
    );
    const providerName = await resolveProviderName(organizationId, input.provider);

    const created = await prisma.remediationPlan.create({
      data: {
        organizationId,
        projectId: source.projectId,
        createdById: userId,
        sourceType:
          input.sourceType === "analysis"
            ? "ANALYSIS"
            : input.sourceType === "blueprint"
              ? "BLUEPRINT"
              : "PROJECT",
        sourceId: input.sourceId,
        scope: input.sourceType === "project" ? (input.scope ?? "full") : null,
        title: source.title,
        provider: providerName,
        status: "PENDING",
        // Token da ponte universal (URL-safe): identifica o plano na API
        // pública para a IA do ambiente de dev marcar itens como feitos.
        apiToken: randomBytes(24).toString("base64url"),
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
    await notifyOrchestrationOfPlanUpdate(updated.id);
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

  // ---------- ponte universal (API pública por token) ----------

  /** Busca o plano pelo token da ponte — usado pela IA do ambiente de dev. */
  async getByToken(token: string): Promise<RemediationPlan | null> {
    const row = await prisma.remediationPlan.findUnique({
      where: { apiToken: token },
    });
    return row ? toDto(row) : null;
  },

  /** Marca item como feito/pendente via token — sem login, um token por plano. */
  async updateItemStatusByToken(
    token: string,
    itemId: string,
    status: RemediationItemStatus,
  ): Promise<RemediationPlan> {
    const row = await prisma.remediationPlan.findUnique({
      where: { apiToken: token },
    });
    if (!row) throw new NotFoundError("Aplicação não encontrada");
    const result = row.result as unknown as RemediationResult | null;
    if (!result) throw new NotFoundError("O plano ainda não foi gerado");
    if (!result.items.some((it) => it.id === itemId))
      throw new NotFoundError(`Item "${itemId}" não existe neste plano`);

    const items = result.items.map((it) =>
      it.id === itemId ? { ...it, status } : it,
    );
    const updated = await prisma.remediationPlan.update({
      where: { id: row.id },
      data: {
        result: { ...result, items } as unknown as Prisma.InputJsonValue,
      },
    });
    await notifyOrchestrationOfPlanUpdate(updated.id);
    return toDto(updated);
  },
};

/**
 * Import dinâmico pra evitar ciclo de import em tempo de módulo —
 * `orchestration.service.ts` já importa `remediationService` no topo do
 * arquivo. Avisa a Orquestração toda vez que um item muda de status (via
 * checklist manual, ponte universal ou MCP), pra ela poder retomar sozinha
 * um run parado em AWAITING_APPLY quando o plano inteiro já estiver feito.
 */
async function notifyOrchestrationOfPlanUpdate(planId: string): Promise<void> {
  try {
    const { maybeAutoResumeFromPlan } = await import("./orchestration.service.js");
    await maybeAutoResumeFromPlan(planId);
  } catch {
    /* nunca deixa isso quebrar a atualização do item em si */
  }
}

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

/**
 * Cria uma Aplicação a partir de um plano de "Atualizar" (UpgradePlan) já
 * pronto — sem loadSource nem chamada de IA, é só reaproveitar o resultado
 * do upgrade (os itens já vêm com título, risco e passo a passo prontos).
 */
async function createFromUpgrade(
  organizationId: string,
  userId: string,
  upgradePlanId: string,
): Promise<RemediationPlan> {
  const upgrade = await prisma.upgradePlan.findFirst({
    where: { id: upgradePlanId, organizationId },
  });
  if (!upgrade) throw new NotFoundError("Plano de atualização não encontrado");
  if (upgrade.status !== "READY" || !upgrade.result)
    throw new NotFoundError(
      "O plano de atualização ainda não foi gerado — aguarde para enviar pra Aplicação",
    );

  const upgradeResult = upgrade.result as unknown as UpgradeResult;
  const result: RemediationResult = {
    summary: upgradeResult.summary,
    items: upgradeResult.items.map(upgradeItemToRemediationItem),
  };

  const created = await prisma.remediationPlan.create({
    data: {
      organizationId,
      projectId: upgrade.projectId,
      createdById: userId,
      sourceType: "UPGRADE",
      sourceId: upgradePlanId,
      scope: null,
      title: `Aplicação — ${upgrade.title}`,
      provider: "claude",
      status: "READY",
      result: result as unknown as Prisma.InputJsonValue,
      apiToken: randomBytes(24).toString("base64url"),
    },
  });
  return toDto(created);
}

const RISK_LABEL: Record<string, string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  critical: "Crítico",
};

function upgradeItemToRemediationItem(
  item: UpgradeResult["items"][number],
): RemediationItem {
  const howToParts = [item.migrationSteps];
  if (item.breakingChanges.length > 0) {
    howToParts.push(
      `Mudanças que quebram compatibilidade:\n${item.breakingChanges.map((b) => `- ${b}`).join("\n")}`,
    );
  }
  return {
    id: item.id,
    title: `Atualizar ${item.packageName} de ${item.currentVersion} para ${item.targetVersion}`,
    category: "DEPENDENCY_UPGRADE",
    severity: RISK_LABEL[item.riskLevel] ?? item.riskLevel,
    filePath: item.filePath ?? "package.json",
    description: `Risco: ${RISK_LABEL[item.riskLevel] ?? item.riskLevel}. ${
      item.breakingChanges.length > 0
        ? `${item.breakingChanges.length} mudança(s) que quebram compatibilidade.`
        : "Sem mudanças que quebram compatibilidade conhecidas."
    }`,
    howTo: howToParts.join("\n\n"),
    status: item.status,
  };
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

type AnalysisWithIssues = Prisma.AnalysisGetPayload<{
  include: { project: true; issues: true };
}>;

/** Categorias rodadas ficam em config.categories (Json) na Analysis. */
function analysisCategories(a: { config: unknown }): string[] {
  const cfg = a.config as { categories?: unknown } | null;
  return Array.isArray(cfg?.categories) ? (cfg.categories as string[]) : [];
}

/** Análise de Segurança = rodou só a categoria DEEP_SECURITY. */
function isSecurityAnalysis(a: { config: unknown }): boolean {
  const cats = analysisCategories(a);
  return cats.length === 1 && cats[0] === "DEEP_SECURITY";
}

/** Serializa os achados de uma análise em texto pra IA. */
function analysisContext(analysis: AnalysisWithIssues, label: string): string {
  const openIssues = analysis.issues.filter((i) => i.status !== "IGNORED");
  const lines = openIssues.map(
    (i) =>
      `- [${i.severity}/${i.category}] ${i.title}${i.pageUrl ? ` (${i.pageUrl})` : ""}: ${i.description}${
        i.suggestion ? ` Sugestão: ${i.suggestion}` : ""
      }`,
  );
  return [
    `## ${label} (v${analysis.version})`,
    `Score geral: ${(analysis.score as unknown as { overall?: number } | null)?.overall ?? "?"}/100`,
    `Problemas encontrados (${openIssues.length}):`,
    ...lines,
  ].join("\n");
}

const SCOPE_LABEL: Record<RemediationScope, string> = {
  qa: "Análise QA padrão",
  security: "Análise de Segurança",
  full: "Projeto completo",
};

/** Carrega a origem (Análise, Blueprint ou Projeto) e serializa em texto pra IA. */
async function loadSource(
  organizationId: string,
  sourceType: "analysis" | "blueprint" | "project",
  sourceId: string,
  scope?: RemediationScope,
): Promise<RemediationSource> {
  if (sourceType === "analysis") {
    const analysis = await prisma.analysis.findFirst({
      where: { id: sourceId, project: { organizationId } },
      include: { project: true, issues: true },
    });
    if (!analysis) throw new NotFoundError("Análise não encontrada");
    if (analysis.status !== "COMPLETED")
      throw new NotFoundError("A análise ainda não terminou — aguarde para gerar a Aplicação");

    const label = isSecurityAnalysis(analysis)
      ? "Análise de Segurança"
      : "Análise QA padrão";
    return {
      title: `Aplicação — ${analysis.project.name} (${label} v${analysis.version})`,
      projectId: analysis.projectId,
      siteUrl: analysis.project.url,
      context: `Site: ${analysis.project.url}\n${analysisContext(analysis, label)}`,
    };
  }

  if (sourceType === "project") {
    const effectiveScope: RemediationScope = scope ?? "full";
    const project = await prisma.project.findFirst({
      where: { id: sourceId, organizationId },
    });
    if (!project) throw new NotFoundError("Projeto não encontrado");

    // Todas as análises concluídas do projeto, mais recentes primeiro.
    const completed = await prisma.analysis.findMany({
      where: { projectId: project.id, status: "COMPLETED" },
      include: { project: true, issues: true },
      orderBy: { createdAt: "desc" },
    });
    const latestQa = completed.find((a) => !isSecurityAnalysis(a)) ?? null;
    const latestSecurity = completed.find(isSecurityAnalysis) ?? null;

    const parts: string[] = [`Site: ${project.url}`];
    if (effectiveScope === "qa" || effectiveScope === "full") {
      if (latestQa) parts.push(analysisContext(latestQa, "Análise QA padrão"));
      else if (effectiveScope === "qa")
        throw new NotFoundError(
          "Este projeto ainda não tem uma Análise QA padrão concluída — rode uma antes de exportar",
        );
    }
    if (effectiveScope === "security" || effectiveScope === "full") {
      if (latestSecurity)
        parts.push(analysisContext(latestSecurity, "Análise de Segurança"));
      else if (effectiveScope === "security")
        throw new NotFoundError(
          "Este projeto ainda não tem uma Análise de Segurança concluída — rode uma antes de exportar",
        );
    }
    if (effectiveScope === "full" && !latestQa && !latestSecurity)
      throw new NotFoundError(
        "Este projeto ainda não tem nenhuma análise concluída — rode uma Análise QA padrão ou de Segurança antes de exportar",
      );
    if (effectiveScope === "full" && (!latestQa || !latestSecurity)) {
      parts.push(
        `Observação: o projeto ainda não tem uma ${
          latestQa ? "Análise de Segurança" : "Análise QA padrão"
        } concluída — o plano cobre apenas o que está disponível.`,
      );
    }

    return {
      title: `Aplicação — ${project.name} (${SCOPE_LABEL[effectiveScope]})`,
      projectId: project.id,
      siteUrl: project.url,
      context: parts.join("\n\n"),
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
  // Sem chave própria configurada na organização, o nome é só um rótulo —
  // createAiProviderFor degrada pro noop de qualquer forma sem a chave.
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

function toSourceType(dbValue: string): RemediationPlan["sourceType"] {
  if (dbValue === "ANALYSIS") return "analysis";
  if (dbValue === "BLUEPRINT") return "blueprint";
  if (dbValue === "UPGRADE") return "upgrade";
  return "project";
}

function toDto(row: {
  id: string;
  projectId: string | null;
  sourceType: string;
  sourceId: string;
  scope: string | null;
  title: string;
  provider: string;
  status: string;
  result: unknown;
  error: string | null;
  apiToken: string;
  createdAt: Date;
  updatedAt: Date;
}): RemediationPlan {
  return {
    id: row.id,
    projectId: row.projectId,
    sourceType: toSourceType(row.sourceType),
    sourceId: row.sourceId,
    scope: (row.scope as RemediationScope | null) ?? null,
    title: row.title,
    provider: row.provider,
    status: row.status as RemediationPlan["status"],
    result: (row.result as RemediationResult | null) ?? null,
    error: row.error,
    apiToken: row.apiToken,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSummary(row: {
  id: string;
  projectId: string | null;
  sourceType: string;
  sourceId: string;
  scope: string | null;
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
    sourceType: toSourceType(row.sourceType),
    sourceId: row.sourceId,
    scope: (row.scope as RemediationScope | null) ?? null,
    title: row.title,
    status: row.status as RemediationSummary["status"],
    itemCount: items.length,
    doneCount: items.filter((i) => i.status === "done").length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
