import { randomBytes } from "node:crypto";
import type {
  CreateUpgradePlanRequest,
  UpgradeEcosystem,
  UpgradeItemStatus,
  UpgradePlan,
  UpgradeProviderName,
  UpgradeReadiness,
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
  MAX_MANIFESTS,
  scanGithubManifests,
  type RepoReadinessSignals,
  type ScanResult,
} from "../modules/upgrade/github-manifest-scanner.js";
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

  /**
   * Cria um plano varrendo o repositório GitHub do projeto em vez de exigir
   * que o usuário cole o manifesto. Cobre projeto poliglota: acha todos os
   * manifestos (package.json, requirements.txt, pom.xml, .csproj...) e gera
   * um plano consolidado, com cada item sabendo de qual arquivo veio.
   *
   * Usa a conexão GITHUB já cadastrada do projeto (mesma credencial do
   * adapter de aplicação) — não pede token de novo.
   */
  async createFromGithub(
    organizationId: string,
    userId: string,
    projectId: string,
    provider?: UpgradeProviderName,
  ): Promise<UpgradePlan> {
    // Escopo: projeto tem que ser da organização de quem pediu, e a conexão
    // tem que ser desse mesmo projeto — mesma checagem que a Orquestração faz
    // antes de usar credencial de adapter.
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true, name: true },
    });
    if (!project) throw new NotFoundError("Projeto não encontrado");

    const connection = await prisma.adapterConnection.findFirst({
      where: { projectId, organizationId, kind: "GITHUB", isActive: true },
    });
    if (!connection?.credentialEncrypted) {
      throw new NotFoundError(
        "Este projeto não tem uma conexão GitHub ativa. Configure-a em Aplicação → Conexões e integrações antes de investigar pelo repositório.",
      );
    }
    const config = connection.config as { owner?: string; repo?: string } | null;
    if (!config?.owner || !config.repo) {
      throw new NotFoundError("Conexão GitHub incompleta (owner ou repo ausente).");
    }

    const scan = await scanGithubManifests(
      decryptSecret(connection.credentialEncrypted),
      config.owner,
      config.repo,
    );

    if (scan.manifests.length === 0) {
      throw new InvalidPackageJsonError(
        `Nenhum manifesto de dependências encontrado em ${scan.owner}/${scan.repo}@${scan.branch}. ` +
          `São procurados package.json, requirements.txt, pyproject.toml, Gemfile, pom.xml, build.gradle, go.mod, .csproj, composer.json e Cargo.toml.`,
      );
    }

    const providerName = await resolveProviderName(organizationId, provider);
    const ecossistemas = [...new Set(scan.manifests.map((m) => m.ecosystem))];
    const title = `Atualização — ${project.name} (${scan.owner}/${scan.repo}, ${scan.manifests.length} manifesto(s))`;

    const created = await prisma.upgradePlan.create({
      data: {
        organizationId,
        projectId,
        createdById: userId,
        title,
        // Guarda o índice do que foi varrido (auditoria) — o conteúdo de cada
        // manifesto vai pra IA, mas gravar tudo aqui inflaria a linha à toa.
        packageJsonRaw: scan.manifests
          .map((m) => `# ${m.path} (${m.ecosystem})`)
          .join("\n"),
        // Num repo poliglota não existe UM ecossistema; grava o do manifesto
        // principal (o mais raso) e cada item carrega o seu.
        ecosystem: scan.manifests[0]!.ecosystem,
        provider: providerName,
        status: "PENDING",
        apiToken: randomBytes(24).toString("base64url"),
      },
    });

    void generateFromScan(created.id, organizationId, scan, ecossistemas);
    return toDto(created);
  },
};

// ---------- geração em background ----------

/**
 * Gera o plano de um repositório inteiro: uma chamada de IA POR MANIFESTO,
 * mescladas num plano só.
 *
 * Por que uma chamada por manifesto em vez de uma só com tudo junto: cada
 * ecossistema tem prompt e comandos próprios (e o legado tem a trava
 * anti-migração de tecnologia). Jogar dez manifestos de linguagens
 * diferentes num prompt único diluiria essas regras e produziria passo a
 * passo genérico — exatamente o que esta funcionalidade não pode entregar.
 * O custo é limitado pelo teto de manifestos do scanner.
 */
async function generateFromScan(
  id: string,
  organizationId: string,
  scan: ScanResult,
  ecossistemas: UpgradeEcosystem[],
): Promise<void> {
  try {
    const plan = await prisma.upgradePlan.findUnique({ where: { id } });
    if (!plan) return;

    const providerName = (
      AI_PROVIDER_NAMES.includes(plan.provider as never) ? plan.provider : "claude"
    ) as AiProviderName;
    const override = await loadAiOverride(organizationId);
    const ai = createAiProviderFor(providerName, override);

    const items: UpgradeResult["items"] = [];
    const resumos: string[] = [];
    const scopeNotes: string[] = [];
    const falhas: string[] = [];
    let piorRisco: UpgradeResult["overallRisk"] = "low";

    for (const manifest of scan.manifests) {
      try {
        const parcial = await ai.buildUpgradePlan({
          title: `${plan.title} — ${manifest.path}`,
          manifestRaw: manifest.content,
          ecosystem: manifest.ecosystem,
          ecosystemLabel: ecosystemLabel(manifest.ecosystem),
          // filePath dos itens aponta pro caminho REAL no repo, não pro nome
          // genérico do manifesto — é o que torna o plano aplicável direto.
          manifestFile: manifest.path,
          detectionConfidence: "high",
          repoSignals: scan.readinessSignals,
        });

        for (const item of parcial.items) {
          items.push({
            ...item,
            // Reindexa: cada chamada devolve item-1, item-2... e sem isso os
            // ids colidiriam entre manifestos, quebrando o marcar-como-feito.
            id: `item-${items.length + 1}`,
            filePath: item.filePath ?? manifest.path,
            ecosystem: manifest.ecosystem,
          });
        }
        if (parcial.summary.trim()) {
          resumos.push(`**${manifest.path}** (${ecosystemLabel(manifest.ecosystem)}): ${parcial.summary}`);
        }
        for (const note of parcial.scopeNotes ?? []) {
          scopeNotes.push(`${manifest.path}: ${note}`);
        }
        piorRisco = maiorRisco(piorRisco, parcial.overallRisk);
      } catch (err) {
        // Um manifesto que falha não pode derrubar o plano inteiro — registra
        // e segue, igual à política dos analyzers da Análise.
        const motivo = err instanceof Error ? err.message : String(err);
        falhas.push(`${manifest.path}: ${motivo}`);
        console.error(`⚠️  Atualização ${id}: falha em ${manifest.path}:`, motivo);
      }
    }

    if (scan.treeTruncated) {
      scopeNotes.push(
        "O repositório é grande e a listagem de arquivos veio truncada pela API do GitHub — pode haver manifestos não descobertos.",
      );
    }
    if (scan.skipped.length > 0) {
      scopeNotes.push(
        `${scan.skipped.length} manifesto(s) além do limite de ${MAX_MANIFESTS} não foram analisados: ${scan.skipped.join(", ")}.`,
      );
    }
    for (const falha of falhas) {
      scopeNotes.push(`Falha ao analisar ${falha}`);
    }

    const result: UpgradeResult = {
      summary:
        `Plano consolidado de ${scan.owner}/${scan.repo}@${scan.branch}: ` +
        `${scan.manifests.length} manifesto(s) analisado(s) ` +
        `(${ecossistemas.map(ecosystemLabel).join(", ")}), ${items.length} dependência(s).\n\n` +
        resumos.join("\n\n"),
      overallRisk: piorRisco,
      recommendedOrder: items.map((i) => i.id),
      items,
      scopeNotes,
      readiness: computeRepoReadiness(scan.readinessSignals, piorRisco),
    };

    await prisma.upgradePlan.update({
      where: { id },
      data: {
        status: "READY",
        provider: ai.name,
        result: result as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(`✅ Atualização ${id} gerada de ${scan.owner}/${scan.repo} (${ai.name})`);
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
    console.error(
      `❌ Atualização ${id} (GitHub) falhou:`,
      err instanceof Error ? err.message : err,
    );
  }
}

const ORDEM_RISCO: UpgradeResult["overallRisk"][] = ["low", "medium", "high", "critical"];
function maiorRisco(
  a: UpgradeResult["overallRisk"],
  b: UpgradeResult["overallRisk"],
): UpgradeResult["overallRisk"] {
  return ORDEM_RISCO.indexOf(b) > ORDEM_RISCO.indexOf(a) ? b : a;
}

/**
 * Avaliação determinística de prontidão pra planos gerados via GitHub — feita
 * em código, não pela IA, porque os sinais (teste/CI/lockfile) já vieram da
 * árvore do repo e são fatos, não julgamento. Confiar na IA pra "concordar"
 * entre vários manifestos analisados separadamente seria menos confiável do
 * que só olhar o que o repo realmente tem.
 *
 * `ready = false` quando falta rede de segurança básica (sem teste, sem CI)
 * ou quando o risco geral da atualização é "critical" — nesses casos a
 * recomendação do produto é levar o plano pro Projetar antes de aplicar.
 */
function computeRepoReadiness(
  signals: RepoReadinessSignals,
  overallRisk: UpgradeResult["overallRisk"],
): UpgradeResult["readiness"] {
  const blockers: string[] = [];

  if (!signals.hasTestDirectoryOrFiles) {
    blockers.push(
      "Nenhum diretório ou arquivo de teste foi encontrado no repositório — sem testes automatizados, não há como confirmar que a atualização não quebrou nada.",
    );
  }
  if (!signals.hasCiConfig) {
    blockers.push(
      "Nenhuma configuração de CI (GitHub Actions, GitLab CI, CircleCI, etc.) foi encontrada — sem pipeline automatizado, cada atualização precisaria ser validada manualmente.",
    );
  }
  if (!signals.hasLockfile) {
    blockers.push(
      "Nenhum lockfile de dependências foi encontrado — sem ele, a versão exata instalada em cada ambiente pode divergir do que está no manifesto.",
    );
  }
  if (overallRisk === "critical") {
    blockers.push(
      "O risco geral desta atualização foi classificado como crítico — mudanças dessa magnitude exigem rede de segurança extra antes de aplicar.",
    );
  }

  const ready = signals.hasTestDirectoryOrFiles && signals.hasCiConfig && overallRisk !== "critical";

  const reasoning = ready
    ? "O repositório tem testes automatizados e pipeline de CI configurados, e o risco geral da atualização não é crítico — há rede de segurança suficiente para aplicar e validar as mudanças com confiança."
    : "Faltam sinais básicos de segurança para absorver esta atualização sem risco alto de quebra silenciosa. Recomendado levar este plano para o Projetar e desenhar a rede de segurança que falta (testes, CI, ambiente de staging) antes de aplicar as mudanças.";

  return { ready, reasoning, blockers };
}

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
