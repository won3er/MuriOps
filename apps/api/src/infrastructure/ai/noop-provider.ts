import type { RemediationResult, UpgradeResult } from "@qa-ai/shared";
import { extractDependencies } from "../../modules/upgrade/manifest-detector.js";
import type {
  AiAnalysisInput,
  AiAnalysisResult,
  AiProvider,
} from "./provider.js";
import type { RemediationDesignInput } from "./remediation-prompt.js";
import type { UpgradeDesignInput } from "./upgrade-prompt.js";

/**
 * Provider sem IA — usado quando nenhuma chave está configurada.
 * Gera um resumo determinístico e passos genéricos, mantendo o fluxo funcional.
 */
export class NoopProvider implements AiProvider {
  readonly name = "noop";

  async enrichAnalysis(input: AiAnalysisInput): Promise<AiAnalysisResult> {
    const critical = input.issues.filter(
      (i) => i.severity === "CRITICAL" || i.severity === "HIGH",
    ).length;

    const summary =
      `Análise de ${input.siteUrl}: ${input.pagesDiscovered} página(s) exploradas, ` +
      `score geral ${input.overallScore}/100 e ${input.issues.length} problema(s) ` +
      `detectado(s) (${critical} de alta prioridade). ` +
      `Configure um provider de IA (AI_PROVIDER=claude) para enriquecer com análise profissional.`;

    return {
      summary,
      enrichments: input.issues.map((i) => ({
        fingerprint: i.fingerprint,
        valid: true,
        impact: `Problema de ${i.category} com severidade ${i.severity}.`,
        suggestion: "Revise o elemento afetado e aplique a correção adequada.",
        stepsToReproduce: [
          `Acesse ${i.pageUrl ?? input.siteUrl}`,
          i.selector ? `Localize o elemento ${i.selector}` : "Observe a página",
          "Verifique o comportamento descrito no problema",
        ],
      })),
    };
  }

  /**
   * Sem IA, não há como transformar os achados num checklist detalhado —
   * devolve um único item apontando para o contexto bruto, orientando a
   * configurar um provider pra obter o plano de aplicação de verdade.
   */
  async buildRemediationPlan(
    input: RemediationDesignInput,
  ): Promise<RemediationResult> {
    return {
      summary:
        `Plano-base sem IA para "${input.title}". Configure um provider ` +
        `(Claude, OpenAI ou Gemini) em Configurações para obter um checklist ` +
        `detalhado, arquivo por arquivo, de como aplicar cada mudança.`,
      items: [
        {
          id: "item-1",
          title: "Revisar achados manualmente",
          category: "geral",
          severity: "info",
          filePath: null,
          description: input.context.slice(0, 1000),
          howTo:
            "Configure um provider de IA em Configurações e regenere este " +
            "plano para receber um passo a passo detalhado por item.",
          status: "pending",
        },
      ],
    };
  }

  /**
   * Sem IA, lista as dependências do manifesto literalmente (sem saber a
   * versão-alvo real nem breaking changes) — mantém o fluxo funcional e
   * orienta a configurar um provider pra obter o plano de verdade. Funciona
   * pra qualquer ecossistema suportado, não só npm.
   */
  async buildUpgradePlan(input: UpgradeDesignInput): Promise<UpgradeResult> {
    const deps = extractDependencies(input.manifestRaw, input.ecosystem);

    const encontradas =
      deps.length > 0
        ? `${deps.length} dependência(s) encontrada(s) em ${input.manifestFile}.`
        : `Não foi possível extrair dependências automaticamente de ${input.manifestFile} — ` +
          `configure um provider de IA para uma leitura completa do manifesto.`;

    return {
      summary:
        `Plano-base sem IA para "${input.title}" (${input.ecosystemLabel}). ` +
        `Configure um provider (Claude, OpenAI ou Gemini) em Configurações ` +
        `para receber risco, breaking changes e passo a passo de migração ` +
        `reais por dependência. ${encontradas}`,
      overallRisk: "medium",
      recommendedOrder: deps.map((_, i) => `item-${i + 1}`),
      items: deps.map((dep, i) => ({
        id: `item-${i + 1}`,
        packageName: dep.name,
        currentVersion: dep.version,
        targetVersion: "verificar manualmente",
        riskLevel: "medium" as const,
        breakingChanges: [],
        migrationSteps:
          "Configure um provider de IA em Configurações e regenere este " +
          "plano para receber a versão-alvo, o risco real e o passo a " +
          `passo de migração de ${dep.name}.`,
        filePath: input.manifestFile,
        ecosystem: input.ecosystem,
        status: "pending" as const,
      })),
      scopeNotes:
        input.ecosystem === "legacy"
          ? [
              "Sistema legado: este produto recomenda atualização de versão " +
                "dentro da tecnologia atual. Migração de tecnologia (ex.: RPG → " +
                "Java, VB6 → .NET) está fora do escopo da ferramenta.",
            ]
          : [],
    };
  }
}
