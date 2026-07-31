import type {
  CreateGuardianRulesetRequest,
  CreateGuardianRunRequest,
  GuardianDashboardStats,
  GuardianOverallStatus,
  GuardianProviderName,
  GuardianResult,
  GuardianRule,
  GuardianRuleset,
  GuardianRulesetSummary,
  GuardianRun,
  GuardianRunSummary,
  UpdateGuardianFindingRequest,
} from "@qa-ai/shared";
import type { Prisma } from "@prisma/client";
import {
  AI_PROVIDER_NAMES,
  createAiProviderFor,
  type AiOverride,
  type AiProviderName,
} from "../infrastructure/ai/index.js";
import type { GuardianCheckInput } from "../infrastructure/ai/guardian-prompt.js";
import { decryptSecret } from "../infrastructure/crypto/secret-box.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { NotFoundError } from "./analysis.service.js";

/**
 * Guardian pedido sem a organização ter uma chave de IA própria configurada.
 * Diferente do resto do produto, aqui não existe "coleta determinística" pra
 * cair de volta — o valor inteiro do Guardian é o julgamento de risco sobre
 * o documento, que só a IA de verdade entrega. Sem chave, bloqueia antes de
 * criar o run (mesma filosofia do gate do Blueprint).
 */
export class AiKeyRequiredError extends Error {
  readonly statusCode = 400;
}

export class InvalidGuardianInputError extends Error {
  readonly statusCode = 400;
}

// Evita gravar documentos excessivamente grandes no banco ou enviá-los por
// acidente ao provider de IA. O limite também cobre textos vindos do Drive.
export const MAX_GUARDIAN_DOCUMENT_CHARACTERS = 200_000;

export const guardianService = {
  // ---------- Rulesets ----------

  async listRulesets(organizationId: string): Promise<GuardianRulesetSummary[]> {
    const rows = await prisma.guardianRuleset.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toRulesetSummary);
  },

  async getRuleset(organizationId: string, id: string): Promise<GuardianRuleset | null> {
    const row = await prisma.guardianRuleset.findFirst({ where: { id, organizationId } });
    return row ? toRuleset(row) : null;
  },

  async createRuleset(
    organizationId: string,
    userId: string,
    input: CreateGuardianRulesetRequest,
  ): Promise<GuardianRuleset> {
    const rules: GuardianRule[] = input.rules
      .map((r) => r.trim())
      .filter(Boolean)
      .map((description, i) => ({ id: `rule-${i + 1}`, description }));

    if (rules.length === 0) {
      throw new InvalidGuardianInputError("Informe ao menos uma regra de negócio");
    }

    const created = await prisma.guardianRuleset.create({
      data: {
        organizationId,
        createdById: userId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        rules: rules as unknown as Prisma.InputJsonValue,
      },
    });
    return toRuleset(created);
  },

  async deleteRuleset(organizationId: string, id: string): Promise<void> {
    const row = await prisma.guardianRuleset.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!row) throw new NotFoundError("Conjunto de regras não encontrado");
    await prisma.guardianRuleset.delete({ where: { id } });
  },

  // ---------- Runs (auditorias) ----------

  async listRuns(organizationId: string, projectId?: string): Promise<GuardianRunSummary[]> {
    const rows = await prisma.guardianRun.findMany({
      where: { organizationId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRunSummary);
  },

  async getRun(organizationId: string, id: string): Promise<GuardianRun | null> {
    const row = await prisma.guardianRun.findFirst({
      where: { id, organizationId },
      include: { ruleset: { select: { name: true } } },
    });
    return row ? toRun(row) : null;
  },

  /**
   * Cria a auditoria em PENDING e dispara em background — mesmo padrão de
   * Blueprint/Atualizar: resposta HTTP volta na hora, o front acompanha por
   * polling até READY/FAILED.
   */
  async createRun(
    organizationId: string,
    userId: string,
    input: CreateGuardianRunRequest,
  ): Promise<GuardianRun> {
    const documentText = input.documentText?.trim();
    if (!documentText) {
      throw new InvalidGuardianInputError("Cole o texto do documento a auditar");
    }
    if (documentText.length > MAX_GUARDIAN_DOCUMENT_CHARACTERS) {
      throw new InvalidGuardianInputError(
        "O documento excede o limite de 200.000 caracteres. Envie uma parte por vez.",
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { aiProvider: true, aiApiKeyEncrypted: true },
    });
    if (!org?.aiProvider || !org.aiApiKeyEncrypted) {
      throw new AiKeyRequiredError(
        "O Guardian precisa de um provider de IA conectado (Claude, OpenAI ou Gemini) para avaliar riscos de verdade. Configure uma chave em Configurações antes de continuar.",
      );
    }

    let projectId: string | null = null;
    if (input.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, organizationId },
        select: { id: true },
      });
      if (!project) throw new NotFoundError("Projeto não encontrado");
      projectId = project.id;
    }

    let rulesetId: string | null = null;
    if (input.rulesetId) {
      const ruleset = await prisma.guardianRuleset.findFirst({
        where: { id: input.rulesetId, organizationId },
        select: { id: true },
      });
      if (!ruleset) throw new NotFoundError("Conjunto de regras não encontrado");
      rulesetId = ruleset.id;
    }

    const providerName = await resolveProviderName(organizationId, input.provider);
    const title = input.title?.trim() || `Auditoria — ${input.sourceName ?? "documento colado"}`;

    const created = await prisma.guardianRun.create({
      data: {
        organizationId,
        projectId,
        rulesetId,
        createdById: userId,
        title,
        sourceName: input.sourceName?.trim() || null,
        documentRaw: documentText,
        provider: providerName,
        status: "PENDING",
      },
    });

    void generate(created.id, organizationId);
    return (await this.getRun(organizationId, created.id))!;
  },

  async updateFindingStatus(
    organizationId: string,
    id: string,
    findingId: string,
    body: UpdateGuardianFindingRequest,
  ): Promise<GuardianRun> {
    const row = await prisma.guardianRun.findFirst({ where: { id, organizationId } });
    if (!row) throw new NotFoundError("Auditoria não encontrada");
    const result = row.result as unknown as GuardianResult | null;
    if (!result) throw new NotFoundError("A auditoria ainda não foi gerada");
    if (!result.findings.some((f) => f.id === findingId)) {
      throw new NotFoundError(`Achado "${findingId}" não existe nesta auditoria`);
    }

    const findings = result.findings.map((f) =>
      f.id === findingId ? { ...f, status: body.status } : f,
    );
    await prisma.guardianRun.update({
      where: { id },
      data: { result: { ...result, findings } as unknown as Prisma.InputJsonValue },
    });
    return (await this.getRun(organizationId, id))!;
  },

  async deleteRun(organizationId: string, id: string): Promise<void> {
    const row = await prisma.guardianRun.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!row) throw new NotFoundError("Auditoria não encontrada");
    await prisma.guardianRun.delete({ where: { id } });
  },

  /** Alimenta o painel executivo verde/amarelo/vermelho. */
  async dashboardStats(organizationId: string): Promise<GuardianDashboardStats> {
    const rows = await prisma.guardianRun.findMany({
      where: { organizationId, status: "READY" },
      select: { overallStatus: true, result: true },
    });

    let green = 0;
    let yellow = 0;
    let red = 0;
    let openCriticalFindings = 0;

    for (const row of rows) {
      if (row.overallStatus === "GREEN") green++;
      else if (row.overallStatus === "YELLOW") yellow++;
      else if (row.overallStatus === "RED") red++;

      const result = row.result as unknown as GuardianResult | null;
      openCriticalFindings += (result?.findings ?? []).filter(
        (f) => f.riskLevel === "critical" && f.status === "open",
      ).length;
    }

    return { totalRuns: rows.length, green, yellow, red, openCriticalFindings };
  },
};

// ---------- geração em background ----------

async function generate(id: string, organizationId: string): Promise<void> {
  try {
    const run = await prisma.guardianRun.findUnique({
      where: { id },
      include: { ruleset: true },
    });
    if (!run) return;

    const providerName = (
      AI_PROVIDER_NAMES.includes(run.provider as never) ? run.provider : "claude"
    ) as AiProviderName;
    const override = await loadAiOverride(organizationId);
    const ai = createAiProviderFor(providerName, override);

    const rules = (run.ruleset?.rules as unknown as GuardianRule[] | null) ?? [];
    const input: GuardianCheckInput = {
      title: run.title,
      sourceName: run.sourceName,
      documentText: run.documentRaw,
      rules,
      rulesetName: run.ruleset?.name ?? null,
    };

    const result = await ai.runGuardianCheck(input);
    // Reata a descrição da regra pro front não precisar buscar o ruleset à parte.
    const rulesById = new Map(rules.map((r) => [r.id, r.description]));
    const findings = result.findings.map((f) => ({
      ...f,
      ruleDescription: f.ruleId ? (rulesById.get(f.ruleId) ?? null) : null,
    }));
    const finalResult: GuardianResult = { ...result, findings };

    await prisma.guardianRun.update({
      where: { id },
      data: {
        status: "READY",
        provider: ai.name,
        overallStatus: finalResult.overallStatus.toUpperCase() as "GREEN" | "YELLOW" | "RED",
        result: finalResult as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(`✅ Guardian ${id} gerado (${ai.name}) — status ${finalResult.overallStatus}`);
  } catch (err) {
    await prisma.guardianRun
      .update({
        where: { id },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : String(err),
        },
      })
      .catch(() => {});
    console.error(`❌ Guardian ${id} falhou:`, err instanceof Error ? err.message : err);
  }
}

/** No boot, auditorias presas em PENDING (processo caiu) viram FAILED. */
export async function recoverStaleGuardianRuns(): Promise<void> {
  const stale = await prisma.guardianRun.updateMany({
    where: { status: "PENDING" },
    data: {
      status: "FAILED",
      error: "Geração interrompida (API reiniciada). Tente gerar de novo.",
    },
  });
  if (stale.count > 0) {
    console.log(`♻️  ${stale.count} auditoria(s) Guardian presa(s) marcada(s) como FAILED no boot.`);
  }
}

// ---------- helpers ----------

async function resolveProviderName(
  organizationId: string,
  requested?: GuardianProviderName,
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

function toRulesetSummary(row: {
  id: string;
  name: string;
  description: string | null;
  rules: unknown;
  createdAt: Date;
}): GuardianRulesetSummary {
  const rules = (row.rules as unknown as GuardianRule[] | null) ?? [];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ruleCount: rules.length,
    createdAt: row.createdAt.toISOString(),
  };
}

function toRuleset(row: {
  id: string;
  name: string;
  description: string | null;
  rules: unknown;
  createdAt: Date;
  updatedAt: Date;
}): GuardianRuleset {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    rules: (row.rules as unknown as GuardianRule[] | null) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function readOverallStatus(
  value: string | null,
): GuardianOverallStatus | null {
  if (!value) return null;
  return value.toLowerCase() as GuardianOverallStatus;
}

function toRunSummary(row: {
  id: string;
  title: string;
  rulesetId: string | null;
  status: string;
  overallStatus: string | null;
  result: unknown;
  createdAt: Date;
}): GuardianRunSummary {
  const result = row.result as unknown as GuardianResult | null;
  const findings = result?.findings ?? [];
  return {
    id: row.id,
    title: row.title,
    rulesetId: row.rulesetId,
    status: row.status as GuardianRunSummary["status"],
    overallStatus: readOverallStatus(row.overallStatus),
    findingCount: findings.length,
    criticalCount: findings.filter((f) => f.riskLevel === "critical").length,
    createdAt: row.createdAt.toISOString(),
  };
}

function toRun(row: {
  id: string;
  projectId: string | null;
  rulesetId: string | null;
  ruleset: { name: string } | null;
  title: string;
  sourceName: string | null;
  provider: string;
  status: string;
  result: unknown;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}): GuardianRun {
  return {
    id: row.id,
    projectId: row.projectId,
    rulesetId: row.rulesetId,
    rulesetName: row.ruleset?.name ?? null,
    title: row.title,
    sourceName: row.sourceName,
    provider: row.provider,
    status: row.status as GuardianRun["status"],
    result: (row.result as GuardianResult | null) ?? null,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
