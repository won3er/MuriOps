import type { BlueprintResult, RemediationResult, UpgradeResult } from "@qa-ai/shared";
import type { BlueprintDesignInput } from "./blueprint-prompt.js";
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
   * Blueprint determinístico sem IA — plano-base genérico porém coerente,
   * para o pilar Projetar funcionar mesmo sem chave configurada.
   */
  async designBlueprint(input: BlueprintDesignInput): Promise<BlueprintResult> {
    const t = input.title || "Projeto";
    return {
      summary:
        `Plano-base gerado sem IA para "${t}". Configure um provider (Claude, OpenAI ou Gemini) ` +
        `em Configurações ou selecione um na criação para obter um blueprint sênior e específico.`,
      objectives: {
        goal: `Entregar ${t} com qualidade embutida desde o início.`,
        scope: input.description.slice(0, 400),
        outOfScope: "A definir com stakeholders.",
        successCriteria: [
          "Cobertura de testes ≥ 80% no core",
          "Pipeline CI/CD verde",
          "Sem bugs críticos abertos no release",
        ],
      },
      personas: ["Usuário final", "Administrador"],
      techStack: [
        {
          category: "Frontend",
          choice: "React + TypeScript",
          rationale: "Ecossistema maduro, tipagem forte, ampla contratação.",
          alternatives: ["Vue", "Svelte"],
        },
        {
          category: "Backend",
          choice: "Node.js + Fastify",
          rationale: "Alto throughput, tipável, integra bem com o frontend TS.",
          alternatives: ["NestJS", "Go"],
        },
        {
          category: "Banco",
          choice: "PostgreSQL",
          rationale: "Relacional robusto, transacional, JSONB quando preciso.",
          alternatives: ["MySQL", "MongoDB"],
        },
        {
          category: "Testes",
          choice: "Vitest + Playwright",
          rationale: "Unit rápido + E2E confiável cobrindo a pirâmide.",
          alternatives: ["Jest", "Cypress"],
        },
      ],
      architectureMermaid:
        "flowchart TD\n  U[Usuário] --> FE[Frontend]\n  FE --> API[API Backend]\n  API --> DB[(PostgreSQL)]\n  API --> CACHE[(Redis)]",
      userFlowMermaid:
        "sequenceDiagram\n  participant U as Usuário\n  participant FE as Frontend\n  participant API as API\n  U->>FE: Acessa o app\n  FE->>API: Requisição\n  API-->>FE: Resposta\n  FE-->>U: Renderiza",
      testStrategy: {
        pyramid: { unit: 70, integration: 20, e2e: 10 },
        approaches: ["TDD no core", "BDD para fluxos críticos"],
        tooling: ["Vitest", "Playwright", "k6"],
        environments: ["local", "staging", "produção"],
      },
      testCases: [
        {
          id: "TC-01",
          title: "Fluxo principal do usuário",
          type: "e2e",
          priority: "P0",
          given: "Usuário na página inicial",
          when: "Executa a ação principal",
          then: "Recebe o resultado esperado sem erro",
        },
      ],
      riskMatrix: [
        {
          risk: "Escopo mal definido",
          category: "negócio",
          likelihood: 3,
          impact: 4,
          mitigation: "Refinar requisitos e critérios de aceite antes de codar.",
        },
      ],
      milestones: [
        {
          name: "MVP",
          durationWeeks: 4,
          deliverables: ["Fluxo principal", "Auth", "CI/CD"],
          qaFocus: "Testes unitários do core e smoke E2E.",
        },
      ],
      qualityGates: [
        {
          stage: "Pull Request",
          criteria: ["Lint ok", "Testes verdes", "Review aprovado"],
          metric: "cobertura de linhas",
          threshold: "≥ 80%",
        },
      ],
      qaMaturityRadar: [
        { dimension: "Automação de Testes", score: 60 },
        { dimension: "CI/CD", score: 65 },
        { dimension: "Cobertura", score: 55 },
        { dimension: "Observabilidade", score: 45 },
        { dimension: "Segurança", score: 50 },
        { dimension: "Processo", score: 55 },
      ],
      nfrs: [
        {
          category: "Performance",
          requirement: "Tempo de resposta da API",
          target: "p95 < 300ms",
        },
        {
          category: "Segurança",
          requirement: "Headers e autenticação",
          target: "OWASP Top 10 mitigado",
        },
      ],
      metrics: [
        {
          name: "Lead time",
          target: "< 2 dias",
          why: "Fluxo de entrega saudável.",
        },
        {
          name: "Change failure rate",
          target: "< 15%",
          why: "Qualidade dos deploys.",
        },
      ],
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
   * Sem IA, lista as dependências do package.json literalmente (sem saber
   * a versão-alvo real nem breaking changes) — mantém o fluxo funcional e
   * orienta a configurar um provider pra obter o plano de verdade.
   */
  async buildUpgradePlan(input: UpgradeDesignInput): Promise<UpgradeResult> {
    let deps: Record<string, string> = {};
    try {
      const pkg = JSON.parse(input.packageJsonRaw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      deps = { ...pkg.dependencies, ...pkg.devDependencies };
    } catch {
      // package.json inválido — devolve plano vazio com aviso no resumo.
    }

    const entries = Object.entries(deps);
    return {
      summary:
        `Plano-base sem IA para "${input.title}". Configure um provider ` +
        `(Claude, OpenAI ou Gemini) em Configurações para receber risco, ` +
        `breaking changes e passo a passo de migração reais por dependência. ` +
        `${entries.length} dependência(s) encontrada(s) no package.json.`,
      overallRisk: "medium",
      recommendedOrder: entries.map((_, i) => `item-${i + 1}`),
      items: entries.map(([packageName, currentVersion], i) => ({
        id: `item-${i + 1}`,
        packageName,
        currentVersion,
        targetVersion: "verificar manualmente",
        riskLevel: "medium" as const,
        breakingChanges: [],
        migrationSteps:
          "Configure um provider de IA em Configurações e regenere este " +
          "plano para receber a versão-alvo, o risco real e o passo a " +
          `passo de migração de ${packageName}.`,
        filePath: "package.json",
        status: "pending" as const,
      })),
    };
  }
}
