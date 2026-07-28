import type {
  Blueprint,
  BlueprintInputPayload,
  BlueprintProviderName,
  BlueprintResult,
  BlueprintSummary,
  CreateBlueprintRequest,
} from "@qa-ai/shared";
import type { Prisma } from "@prisma/client";
import {
  AI_PROVIDER_NAMES,
  createAiProviderFor,
  type AiOverride,
  type AiProviderName,
} from "../infrastructure/ai/index.js";
import type { BlueprintDesignInput } from "../infrastructure/ai/blueprint-prompt.js";
import { decryptSecret } from "../infrastructure/crypto/secret-box.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { NotFoundError } from "./analysis.service.js";

export const blueprintService = {
  /**
   * Cria o blueprint em `PENDING` e dispara a geração em background — a resposta
   * HTTP volta na hora. O front acompanha por polling do status (READY/FAILED).
   * A geração pela IA costuma levar dezenas de segundos.
   */
  async create(
    organizationId: string,
    userId: string,
    input: CreateBlueprintRequest,
  ): Promise<Blueprint> {
    const mode = input.input.mode;
    const provider = await resolveProviderName(organizationId, input.provider);

    // `projectId` vem cru do request (z.string().optional() na rota) — sem
    // esta checagem dava pra vincular um Blueprint a um projeto de OUTRA
    // organização, só sabendo o id. O Blueprint continuaria sendo lido pelo
    // organizationId de quem criou, mas a referência cruzada vazava pra
    // frente: `remediation.service.ts` → `loadSource()` copia
    // `blueprint.projectId` direto pro `RemediationPlan.projectId`, criando
    // um plano de uma org apontando pro projeto de outra. Mesma validação
    // que `upgrade.service.ts.create()` já fazia.
    let projectId: string | null = null;
    if (input.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, organizationId },
        select: { id: true },
      });
      if (!project) throw new NotFoundError("Projeto não encontrado");
      projectId = project.id;
    }

    const created = await prisma.blueprint.create({
      data: {
        organizationId,
        createdById: userId,
        projectId,
        title: input.title,
        mode,
        provider,
        status: "PENDING",
        input: input.input as unknown as Prisma.InputJsonValue,
      },
    });

    // Geração assíncrona: não bloqueia a resposta.
    void generateBlueprint(created.id, organizationId);
    return toDto(created);
  },

  /** Regenera um blueprint (mesma entrada, provider opcionalmente novo). Assíncrono. */
  async regenerate(
    organizationId: string,
    id: string,
    provider?: BlueprintProviderName,
  ): Promise<Blueprint> {
    const existing = await prisma.blueprint.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundError("Blueprint não encontrado");

    const providerName = await resolveProviderName(organizationId, provider);

    const updated = await prisma.blueprint.update({
      where: { id },
      data: { status: "PENDING", error: null, provider: providerName },
    });

    void generateBlueprint(id, organizationId);
    return toDto(updated);
  },

  async list(organizationId: string): Promise<BlueprintSummary[]> {
    const rows = await prisma.blueprint.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        mode: true,
        provider: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      mode: r.mode as BlueprintSummary["mode"],
      provider: r.provider,
      status: r.status as BlueprintSummary["status"],
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  },

  async getById(
    organizationId: string,
    id: string,
  ): Promise<Blueprint | null> {
    const row = await prisma.blueprint.findFirst({
      where: { id, organizationId },
    });
    return row ? toDto(row) : null;
  },

  async remove(organizationId: string, id: string): Promise<void> {
    const row = await prisma.blueprint.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!row) throw new NotFoundError("Blueprint não encontrado");
    await prisma.blueprint.delete({ where: { id } });
  },
};

// ---------- geração em background ----------

/**
 * Executa a geração pela IA e persiste o resultado (READY) ou o erro (FAILED).
 * Roda fora do ciclo da requisição HTTP; nunca lança para fora.
 */
async function generateBlueprint(
  id: string,
  organizationId: string,
): Promise<void> {
  try {
    const bp = await prisma.blueprint.findUnique({ where: { id } });
    if (!bp) return;

    const providerName = (
      AI_PROVIDER_NAMES.includes(bp.provider as never) ? bp.provider : "claude"
    ) as AiProviderName;
    const override = await loadAiOverride(organizationId);
    const payload = bp.input as unknown as BlueprintInputPayload;

    const ai = createAiProviderFor(providerName, override);
    const result = await ai.designBlueprint({
      title: bp.title,
      description: describeInput(payload),
    });

    await prisma.blueprint.update({
      where: { id },
      data: {
        status: "READY",
        // O provider efetivo pode cair no noop se a chave sumir.
        provider: ai.name,
        result: result as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(`✅ Blueprint ${id} gerado (${ai.name})`);
  } catch (err) {
    await prisma.blueprint
      .update({
        where: { id },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : String(err),
        },
      })
      .catch(() => {});
    console.error(
      `❌ Blueprint ${id} falhou:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * No boot, blueprints presos em PENDING (processo caiu durante a geração)
 * viram FAILED — não há fila persistente que os retome.
 */
export async function recoverStaleBlueprints(): Promise<void> {
  const stale = await prisma.blueprint.updateMany({
    where: { status: "PENDING" },
    data: {
      status: "FAILED",
      error: "Geração interrompida (API reiniciada). Tente regerar.",
    },
  });
  if (stale.count > 0) {
    console.log(
      `♻️  ${stale.count} blueprint(s) preso(s) marcado(s) como FAILED no boot.`,
    );
  }
}

// ---------- helpers ----------

/**
 * Serializa qualquer modo de entrada numa descrição em português que a IA lê.
 * É o ponto único de tradução form/canvas/prompt → texto.
 */
function describeInput(payload: BlueprintInputPayload): string {
  if (payload.mode === "prompt") {
    return payload.prompt.trim();
  }
  if (payload.mode === "form") {
    const f = payload.form;
    const lines = [
      `Objetivo: ${f.objective}`,
      `Tipo de aplicação: ${f.appType}`,
      `Público-alvo: ${f.audience}`,
      `Escala esperada: ${f.scale}`,
    ];
    if (f.features.length) lines.push(`Funcionalidades: ${f.features.join(", ")}`);
    if (f.integrations.length)
      lines.push(`Integrações: ${f.integrations.join(", ")}`);
    if (f.compliance.length)
      lines.push(`Conformidade/normas: ${f.compliance.join(", ")}`);
    if (f.constraints.trim()) lines.push(`Restrições: ${f.constraints}`);
    return lines.join("\n");
  }
  // canvas
  const c = payload.canvas;
  const labelOf = (id: string) =>
    c.nodes.find((n) => n.id === id)?.label ?? id;
  const nodes = c.nodes
    .map((n) => `- ${n.label} (${n.type})`)
    .join("\n");
  const edges = c.edges
    .map((e) => `- ${labelOf(e.from)} → ${labelOf(e.to)}${e.label ? ` (${e.label})` : ""}`)
    .join("\n");
  const parts = [
    "O usuário desenhou a arquitetura como um grafo de componentes.",
    `Componentes:\n${nodes || "(nenhum)"}`,
    `Ligações:\n${edges || "(nenhuma)"}`,
  ];
  if (c.notes?.trim()) parts.push(`Notas: ${c.notes}`);
  return parts.join("\n\n");
}

/** Provider efetivo: o pedido no request, ou o configurado na org, ou 'claude'. */
async function resolveProviderName(
  organizationId: string,
  requested?: BlueprintProviderName,
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

function toDto(row: {
  id: string;
  projectId: string | null;
  title: string;
  mode: string;
  provider: string;
  status: string;
  input: unknown;
  result: unknown;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Blueprint {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    mode: row.mode as Blueprint["mode"],
    provider: row.provider,
    status: row.status as Blueprint["status"],
    input: row.input as BlueprintInputPayload,
    result: (row.result as BlueprintResult | null) ?? null,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
