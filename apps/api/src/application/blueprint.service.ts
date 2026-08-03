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
import { scanGithubManifests } from "../modules/upgrade/github-manifest-scanner.js";

/**
 * Blueprint pedido sem a organização ter uma chave de IA própria configurada.
 * Diferente de Análise/Atualizar (que sempre têm dado real coletado — crawl
 * ou manifesto — mesmo sem IA), o Blueprint sem IA não tem NENHUM dado real
 * de entrada pra trabalhar: o `NoopProvider` devolvia um template fixo
 * idêntico pra qualquer projeto (mesmo stack, mesmo marco único, mesmo caso
 * de teste), o que confundia mais do que ajudava. Bloquear aqui é melhor do
 * que gerar algo enganosamente "pronto".
 */
export class AiKeyRequiredError extends Error {
  readonly statusCode = 400;
}

export class ProjectBlueprintRequiredError extends Error {
  readonly statusCode = 400;
}

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

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { aiProvider: true, aiApiKeyEncrypted: true },
    });
    if (!org?.aiProvider || !org.aiApiKeyEncrypted) {
      throw new AiKeyRequiredError(
        "O Blueprint precisa de um provider de IA conectado (Claude, OpenAI ou Gemini) para gerar um plano específico para este projeto. Configure uma chave em Configurações antes de continuar.",
      );
    }

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
    if (mode === "project" && !projectId) {
      throw new ProjectBlueprintRequiredError(
        "Escolha um projeto para gerar uma projeção baseada no contexto atual.",
      );
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

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { aiProvider: true, aiApiKeyEncrypted: true },
    });
    if (!org?.aiProvider || !org.aiApiKeyEncrypted) {
      throw new AiKeyRequiredError(
        "O Blueprint precisa de um provider de IA conectado (Claude, OpenAI ou Gemini) para regenerar o plano. Configure uma chave em Configurações antes de continuar.",
      );
    }

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
      description: await describeBlueprintContext(bp, payload, organizationId),
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
  if (payload.mode === "project") return payload.businessContext?.trim() ?? "";
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

/**
 * Builds an evidence-based context for an existing project. GitHub contributes
 * only repository metadata and dependency manifests: source files and tokens
 * are never included in the AI prompt.
 */
async function describeBlueprintContext(
  bp: { projectId: string | null },
  payload: BlueprintInputPayload,
  organizationId: string,
): Promise<string> {
  if (payload.mode !== "project" || !bp.projectId) return describeInput(payload);

  const project = await prisma.project.findFirst({
    where: { id: bp.projectId, organizationId },
    select: {
      name: true,
      url: true,
      description: true,
      analyses: {
        where: { status: "COMPLETED" },
        orderBy: { finishedAt: "desc" },
        take: 1,
        select: {
          score: true,
          issueCount: true,
          pagesDiscovered: true,
          aiSummary: true,
          issues: {
            orderBy: { createdAt: "desc" },
            take: 12,
            select: { title: true, category: true, severity: true },
          },
        },
      },
      adapterConnections: {
        where: { kind: "GITHUB", isActive: true },
        take: 1,
        select: { config: true, credentialEncrypted: true },
      },
    },
  });
  if (!project) throw new NotFoundError("Projeto não encontrado");

  const lines = [
    "Esta é uma projeção de evolução de um sistema existente, não um projeto do zero.",
    `Projeto: ${project.name}`,
    `URL cadastrada: ${project.url}`,
    `Descrição cadastrada: ${project.description?.trim() || "não informada"}`,
    `Contexto de negócio informado nesta projeção: ${payload.businessContext?.trim() || "não informado"}`,
  ];
  const analysis = project.analyses[0];
  if (analysis) {
    const score = analysis.score as { overall?: number } | null;
    lines.push(`Última análise concluída: score geral ${score?.overall ?? "não calculado"}; ${analysis.pagesDiscovered} página(s) verificadas; ${analysis.issueCount} achado(s).`);
    if (analysis.aiSummary?.trim()) lines.push(`Resumo da análise: ${analysis.aiSummary.trim()}`);
    if (analysis.issues.length) {
      lines.push(`Achados recentes: ${analysis.issues.map((issue) => `${issue.category}/${issue.severity}: ${issue.title}`).join(" | ")}`);
    }
  } else {
    lines.push("Ainda não há análise concluída: deixe claro quais decisões dependem de validar o sistema primeiro.");
  }

  const github = project.adapterConnections[0];
  const githubConfig = github?.config as { owner?: string; repo?: string } | null;
  if (githubConfig?.owner && githubConfig.repo && github?.credentialEncrypted) {
    try {
      const scan = await scanGithubManifests(decryptSecret(github.credentialEncrypted), githubConfig.owner, githubConfig.repo);
      const manifests = scan.manifests.map((m) => `${m.path} (${m.ecosystem})`);
      lines.push(`Repositório conectado: ${scan.owner}/${scan.repo}@${scan.branch}. Manifestos identificados: ${manifests.join(", ") || "nenhum"}.`);
      if (scan.skipped.length) lines.push(`Manifestos fora do limite de leitura: ${scan.skipped.join(", ")}.`);
      if (scan.treeTruncated) lines.push("A árvore do repositório foi truncada pelo GitHub; trate a cobertura da estrutura como parcial.");
    } catch {
      lines.push(`Repositório conectado: ${githubConfig.owner}/${githubConfig.repo}. A estrutura não pôde ser lida agora; não invente detalhes sobre o código.`);
    }
  } else {
    lines.push("Nenhum repositório GitHub conectado: não presuma stack, arquivos ou integrações de código.");
  }
  lines.push("Proponha evoluções proporcionais às evidências. Diferencie fatos observados, lacunas de informação e recomendações; não afirme que uma correção já foi implementada.");
  return lines.join("\n");
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
