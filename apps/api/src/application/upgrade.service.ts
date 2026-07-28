import { randomBytes } from "node:crypto";
import type {
  CreateUpgradePlanRequest,
  UpgradeEcosystem,
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
import { decryptSecret } from "../infrastructure/crypto/secret-box.js";
import { prisma } from "../infrastructure/database/prisma.js";
import {
  detectManifest,
  ecosystemLabel,
  ecosystemManifestFile,
} from "../modules/upgrade/manifest-detector.js";
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
    // Aceita `manifest` (novo, multi-linguagem) ou `packageJson` (alias
    // legado — o cliente anterior ao suporte multi-linguagem só mandava esse).
    const manifestRaw = (input.manifest ?? input.packageJson)?.trim();
    if (!manifestRaw) {
      throw new InvalidPackageJsonError(
        "Envie o conteúdo do manifesto de dependências (package.json, requirements.txt, pom.xml, go.mod, .csproj...)",
      );
    }

    // Detecção de ecossistema substituiu o JSON.parse obrigatório: antes,
    // qualquer manifesto que não fosse JSON era recusado na entrada — o que
    // travava Python, Java, Go, .NET etc.
    const detection = input.ecosystem
      ? {
          ecosystem: input.ecosystem,
          label: ecosystemLabel(input.ecosystem),
          manifestFile: input.fileName ?? ecosystemManifestFile(input.ecosystem),
          confidence: "high" as const,
        }
      : detectManifest(manifestRaw, input.fileName);

    if (detection.ecosystem === "unknown") {
      throw new InvalidPackageJsonError(
        "Não foi possível identificar o ecossistema deste manifesto. Confira se colou o arquivo inteiro, ou informe o nome do arquivo (ex.: pom.xml) para ajudar na detecção.",
      );
    }

    const parsedName = extractProjectName(manifestRaw, detection.ecosystem);

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
      input.title?.trim() ||
      `Atualização — ${parsedName ?? detection.manifestFile} (${detection.label})`;

    const created = await prisma.upgradePlan.create({
      data: {
        organizationId,
        projectId,
        createdById: userId,
        title,
        // Coluna manteve o nome `packageJsonRaw` por compatibilidade com os
        // planos já gravados, mas hoje guarda manifesto de qualquer ecossistema.
        packageJsonRaw: manifestRaw,
        ecosystem: detection.ecosystem,
        provider: providerName,
        status: "PENDING",
        apiToken: randomBytes(24).toString("base64url"),
      },
    });

    void generate(created.id, organizationId, {
      title,
      manifestRaw,
      ecosystem: detection.ecosystem,
      ecosystemLabel: detection.label,
      manifestFile: detection.manifestFile,
      detectionConfidence: detection.confidence,
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

/**
 * Nome do projeto pra compor o título, por ecossistema. Best-effort: se não
 * achar, o título cai no nome do arquivo de manifesto.
 */
function extractProjectName(raw: string, ecosystem: UpgradeEcosystem): string | undefined {
  try {
    switch (ecosystem) {
      case "npm":
      case "composer":
        return (JSON.parse(raw) as { name?: string }).name;
      case "maven":
        // Pega o artifactId do <project>, não o das <dependency> — o primeiro
        // artifactId do arquivo é o do próprio projeto na esmagadora maioria
        // dos poms (vem antes do bloco <dependencies>).
        return raw.match(/<artifactId>\s*([^<]+?)\s*<\/artifactId>/)?.[1];
      case "go":
        return raw.match(/^module\s+(\S+)/m)?.[1];
      case "poetry":
      case "cargo":
        return raw.match(/^\s*name\s*=\s*["']([^"']+)["']/m)?.[1];
      case "nuget":
        return raw.match(/<(?:AssemblyName|RootNamespace)>\s*([^<]+?)\s*<\//)?.[1];
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

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
  // Sem chave própria configurada na organização, o nome é só um rótulo —
  // createAiProviderFor degrada pro noop de qualquer forma sem a chave.
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

/**
 * Planos criados antes do suporte multi-linguagem têm `ecosystem` NULL no
 * banco — nesse período o único ecossistema possível era npm.
 */
function readEcosystem(value: string | null | undefined): UpgradeEcosystem {
  return (value as UpgradeEcosystem | null) ?? "npm";
}

function toDto(row: {
  id: string;
  projectId: string | null;
  title: string;
  packageJsonRaw: string;
  ecosystem: string | null;
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
    manifestRaw: row.packageJsonRaw,
    // Mantido com o mesmo valor por compatibilidade com clientes anteriores
    // ao suporte multi-linguagem (o front atual ainda lê este campo).
    packageJsonRaw: row.packageJsonRaw,
    ecosystem: readEcosystem(row.ecosystem),
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
  ecosystem: string | null;
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
    ecosystem: readEcosystem(row.ecosystem),
    status: row.status as UpgradeSummary["status"],
    itemCount: items.length,
    doneCount: items.filter((i) => i.status === "done").length,
    overallRisk: result?.overallRisk ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
