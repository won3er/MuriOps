import { randomBytes } from "node:crypto";
import type {
  CreateUpgradePlanRequest,
  UpgradeItemStatus,
  UpgradePlan,
  UpgradeProviderName,
  UpgradeResult,
  UpgradeSummary,
} from "@qa-ai/shared";
import type { Prisma } from "@prisma/client";
import {
  AI_PROVIDER_NAMES,
  createAiProviderFor,
  type AiOverride,
  type AiProviderName,
} from "../infrastructure/ai/index.js";
import type { UpgradeDesignInput } from "../infrastructure/ai/upgrade-prompt.js";
import { env } from "../config/env.js";
import { decryptSecret } from "../infrastructure/crypto/secret-box.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { NotFoundError } from "./analysis.service.js";

export class InvalidPackageJsonError extends Error {}

export const upgradeService = {
  /**
   * Cria o plano de Atualização em `PENDING` e dispara a geração em
   * background — mesmo padrão da Aplicação: a resposta HTTP volta na hora,
   * o front acompanha por polling.
   */
  async create(
    organizationId: string,
    userId: string,
    input: CreateUpgradePlanRequest,
  ): Promise<UpgradePlan> {
    const packageJsonRaw = input.packageJson?.trim();
    if (!packageJsonRaw) {
      throw new InvalidPackageJsonError("Envie o conteúdo do package.json");
    }
    let parsedName: string | undefined;
    try {
      const pkg = JSON.parse(packageJsonRaw) as { name?: string };
      parsedName = pkg.name;
    } catch {
      throw new InvalidPackageJsonError(
        "O conteúdo enviado não é um JSON válido — confira se colou o package.json inteiro",
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

    const providerName = await resolveProviderName(organizationId, input.provider);
    const title =
      input.title?.trim() || `Atualização — ${parsedName ?? "package.json"}`;

    const created = await prisma.upgradePlan.create({
      data: {
        organizationId,
        projectId,
        createdById: userId,
        title,
        packageJsonRaw,
        provider: providerName,
        status: "PENDING",
        apiToken: randomBytes(24).toString("base64url"),
      },
    });

    void generate(created.id, organizationId, {
      title,
      packageJsonRaw,
    });
    return toDto(created);
  },

  async list(organizationId: string, projectId?: string): Promise<UpgradeSummary[]> {
    const rows = await prisma.upgradePlan.findMany({
      where: { organizationId, ...(projectId ? { projectId } : {}) },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toSummary);
  },

  async getById(organizationId: string, id: string): Promise<UpgradePlan | null> {
    const row = await prisma.upgradePlan.findFirst({ where: { id, organizationId } });
    return row ? toDto(row) : null;
  },

  async updateItemStatus(
    organizationId: string,
    id: string,
    itemId: string,
    status: UpgradeItemStatus,
  ): Promise<UpgradePlan> {
    const row = await prisma.upgradePlan.findFirst({ where: { id, organizationId } });
    if (!row) throw new NotFoundError("Atualização não encontrada");
    const result = row.result as unknown as UpgradeResult | null;
    if (!result) throw new NotFoundError("O plano ainda não foi gerado");

    const items = result.items.map((it) => (it.id === itemId ? { ...it, status } : it));
    const updated = await prisma.upgradePlan.update({
      where: { id },
      data: { result: { ...result, items } as unknown as Prisma.InputJsonValue },
    });
    return toDto(updated);
  },

  async remove(organizationId: string, id: string): Promise<void> {
    const row = await prisma.upgradePlan.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!row) throw new NotFoundError("Atualização não encontrada");
    await prisma.upgradePlan.delete({ where: { id } });
  },

  // ---------- ponte universal (API pública por token) ----------

  async getByToken(token: string): Promise<UpgradePlan | null> {
    const row = await prisma.upgradePlan.findUnique({ where: { apiToken: token } });
    return row ? toDto(row) : null;
  },

  async updateItemStatusByToken(
    token: string,
    itemId: string,
    status: UpgradeItemStatus,
  ): Promise<UpgradePlan> {
    const row = await prisma.upgradePlan.findUnique({ where: { apiToken: token } });
    if (!row) throw new NotFoundError("Atualização não encontrada");
    const result = row.result as unknown as UpgradeResult | null;
    if (!result) throw new NotFoundError("O plano ainda não foi gerado");
    if (!result.items.some((it) => it.id === itemId))
      throw new NotFoundError(`Item "${itemId}" não existe neste plano`);

    const items = result.items.map((it) => (it.id === itemId ? { ...it, status } : it));
    const updated = await prisma.upgradePlan.update({
      where: { id: row.id },
      data: { result: { ...result, items } as unknown as Prisma.InputJsonValue },
    });
    return toDto(updated);
  },
};

// ---------- geração em background ----------

async function generate(
  id: string,
  organizationId: string,
  input: UpgradeDesignInput,
): Promise<void> {
  try {
    const plan = await prisma.upgradePlan.findUnique({ where: { id } });
    if (!plan) return;

    const providerName = (
      AI_PROVIDER_NAMES.includes(plan.provider as never) ? plan.provider : "claude"
    ) as AiProviderName;
    const override = await loadAiOverride(organizationId);

    const ai = createAiProviderFor(providerName, override);
    const result = await ai.buildUpgradePlan(input);

    await prisma.upgradePlan.update({
      where: { id },
      data: {
        status: "READY",
        provider: ai.name,
        result: result as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(`✅ Atualização ${id} gerada (${ai.name})`);
  } catch (err) {
    await prisma.upgradePlan
      .update({
        where: { id },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : String(err),
        },
      })
      .catch(() => {});
    console.error(`❌ Atualização ${id} falhou:`, err instanceof Error ? err.message : err);
  }
}

/** No boot, atualizações presas em PENDING (processo caiu) viram FAILED. */
export async function recoverStaleUpgradePlans(): Promise<void> {
  const stale = await prisma.upgradePlan.updateMany({
    where: { status: "PENDING" },
    data: {
      status: "FAILED",
      error: "Geração interrompida (API reiniciada). Tente gerar de novo.",
    },
  });
  if (stale.count > 0) {
    console.log(
      `♻️  ${stale.count} atualização(ões) presa(s) marcada(s) como FAILED no boot.`,
    );
  }
}

// ---------- helpers ----------

/** Provider efetivo: o pedido no request, ou o configurado na org, ou o do servidor. */
async function resolveProviderName(
  organizationId: string,
  requested?: UpgradeProviderName,
): Promise<AiProviderName> {
  if (requested && AI_PROVIDER_NAMES.includes(requested)) return requested;
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { aiProvider: true },
  });
  if (org?.aiProvider && AI_PROVIDER_NAMES.includes(org.aiProvider as never)) {
    return org.aiProvider as AiProviderName;
  }
  if (AI_PROVIDER_NAMES.includes(env.AI_PROVIDER as never)) {
    return env.AI_PROVIDER as AiProviderName;
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

function toDto(row: {
  id: string;
  projectId: string | null;
  title: string;
  packageJsonRaw: string;
  provider: string;
  status: string;
  result: unknown;
  error: string | null;
  apiToken: string;
  createdAt: Date;
  updatedAt: Date;
}): UpgradePlan {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    packageJsonRaw: row.packageJsonRaw,
    provider: row.provider,
    status: row.status as UpgradePlan["status"],
    result: (row.result as UpgradeResult | null) ?? null,
    error: row.error,
    apiToken: row.apiToken,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSummary(row: {
  id: string;
  projectId: string | null;
  title: string;
  status: string;
  result: unknown;
  createdAt: Date;
  updatedAt: Date;
}): UpgradeSummary {
  const result = row.result as unknown as UpgradeResult | null;
  const items = result?.items ?? [];
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    status: row.status as UpgradeSummary["status"],
    itemCount: items.length,
    doneCount: items.filter((i) => i.status === "done").length,
    overallRisk: result?.overallRisk ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
