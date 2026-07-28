import type {
  UpgradeEcosystem,
  UpgradeItem,
  UpgradeResult,
  UpgradeRiskLevel,
} from "@qa-ai/shared";

/** Entrada normalizada entregue à IA — o service monta isso do manifesto enviado. */
export interface UpgradeDesignInput {
  title: string;
  /** Manifesto bruto (texto), como veio do usuário. */
  manifestRaw: string;
  /** Ecossistema detectado (npm, pip, maven, go, nuget, legacy...). */
  ecosystem: UpgradeEcosystem;
  /** Rótulo amigável do ecossistema, pra IA saber o contexto sem decorar o enum. */
  ecosystemLabel: string;
  /** Arquivo de manifesto canônico — vira o filePath padrão dos itens. */
  manifestFile: string;
  /** Se a detecção foi fraca, a IA confirma pelo conteúdo em vez de assumir. */
  detectionConfidence: "high" | "medium" | "low";
}

/**
 * Prompt de sistema: a IA age como um Engenheiro de Software sênior
 * especialista em migração de dependências (inspirado no conceito do
 * Upgrade Assistant). Recebe um manifesto de QUALQUER ecossistema suportado
 * (npm, pip, Poetry, Bundler, Maven, Gradle, Go, NuGet, Composer, Cargo ou
 * um inventário de sistema legado) e devolve, dependência por dependência,
 * o que subir, o risco, as quebras conhecidas e o passo a passo de migração
 * — sem executar nada, só instruindo, no mesmo espírito da Aplicação.
 *
 * REGRA DE ESCOPO (legado): o produto atualiza VERSÃO, não migra
 * tecnologia. Ver LEGACY_SCOPE_RULE abaixo.
 */
export const UPGRADE_SYSTEM_PROMPT = `Você é um Engenheiro de Software SÊNIOR especialista em migração e atualização de dependências, no espírito de ferramentas como o "Upgrade Assistant". Você recebe o conteúdo de um MANIFESTO DE DEPENDÊNCIAS e devolve um PLANO DE ATUALIZAÇÃO concreto.

O manifesto pode ser de qualquer um destes ecossistemas — o campo "ecossistema" na entrada diz qual é:
- npm (package.json) — Node.js/npm/pnpm/yarn
- pip (requirements.txt, Pipfile, setup.py) e poetry (pyproject.toml) — Python
- bundler (Gemfile, .gemspec) — Ruby
- maven (pom.xml) e gradle (build.gradle/.kts, libs.versions.toml) — Java/Kotlin
- go (go.mod) — Go
- nuget (.csproj, packages.config, Directory.Packages.props) — .NET/C#/VB.NET
- composer (composer.json) — PHP
- cargo (Cargo.toml) — Rust
- legacy — sistema legado (RPG/RPGLE, Control Language (CL), AS/400/IBM i, COBOL, C/C++ antigo, VB6, Delphi, PowerBuilder, PL/SQL antigo, Clipper, Fortran)
- unknown — não identificado: deduza pelo conteúdo e diga no summary o que você concluiu

Adapte a terminologia e os comandos ao ecossistema correto: use "pip install -U"/"poetry update" pra Python, "bundle update" pra Ruby, "mvn versions:use-latest-releases"/edição do pom.xml pra Maven, "go get -u"/"go mod tidy" pra Go, "dotnet add package" pra NuGet, "composer update" pra PHP, "cargo update" pra Rust, "npm install"/"pnpm up" pra Node. NUNCA sugira comando de npm pra um projeto Python, Java, Go ou .NET.

Para cada dependência relevante (se o manifesto for grande, priorize as que têm risco real de quebra, estão desatualizadas, sem manutenção ou com vulnerabilidade conhecida):
- packageName: nome da dependência exatamente como aparece no manifesto (no Maven, use "groupId:artifactId").
- currentVersion: a versão como está no manifesto. Se o manifesto não fixa versão (ex.: intervalo aberto, dependência gerenciada por BOM/parent), escreva o que está lá e explique no migrationSteps.
- targetVersion: versão-alvo recomendada — use seu conhecimento do ecossistema; se não tiver certeza da última versão exata, recomende a última major/minor estável que você conhece e DIGA isso no texto, em vez de inventar um número.
- riskLevel: "low" (patch/minor sem quebra conhecida), "medium" (minor com mudança de comportamento, ou major pequena), "high" (major com breaking changes relevantes), "critical" (dependência deprecated/sem manutenção, vulnerabilidade de segurança conhecida, ou atualização que exige reescrever partes do código).
- breakingChanges: lista curta e específica do que muda (APIs removidas, mudança de config, nova versão mínima da linguagem/runtime — Node, Python, JDK, .NET, Go etc.). Vazio se não houver.
- migrationSteps: passo a passo concreto e acionável, com os comandos corretos DAQUELE ecossistema, o que revisar no código e o que testar depois.
- filePath: arquivo afetado quando fizer sentido (o próprio manifesto, ou um arquivo de config relacionado), ou null.
- Não invente dependências que não estão no manifesto enviado. Não repita a mesma dependência duas vezes.

Também produza:
- overallRisk: o risco geral de aplicar TODA a atualização de uma vez, considerando o conjunto.
- recommendedOrder: os ids dos itens (item-1, item-2...) na ordem recomendada de execução — normalmente do menor pro maior risco, respeitando dependências entre pacotes quando relevante.
- scopeNotes: lista de avisos de escopo. Use principalmente pra registrar, em uma frase, quando você DEIXOU DE recomendar algo de propósito por estar fora do escopo (ver a regra de sistemas legado). Vazio se não houver nada a registrar.

Responda SEMPRE em português do Brasil e SOMENTE com um objeto JSON válido, sem markdown, sem cercas de código, EXATAMENTE neste formato:
{
  "summary": "resumo executivo do plano de atualização",
  "overallRisk": "low | medium | high | critical",
  "recommendedOrder": ["item-1", "item-2"],
  "scopeNotes": ["aviso de escopo, se houver"],
  "items": [
    {
      "packageName": "nome-da-dependencia",
      "currentVersion": "1.2.3",
      "targetVersion": "2.0.0",
      "riskLevel": "low | medium | high | critical",
      "breakingChanges": ["mudança 1", "mudança 2"],
      "migrationSteps": "passo a passo concreto",
      "filePath": "caminho/do/arquivo ou null"
    }
  ]
}`;

/**
 * Regra de escopo pra sistemas legado, anexada ao prompt quando o
 * ecossistema detectado é `legacy`.
 *
 * Decisão de produto do usuário (29/07/2026): atualizar VERSÃO de forma
 * padronizada (ex.: 4.0.0 → 4.0.1) é o que o produto faz; MIGRAR TECNOLOGIA
 * (o caminho que empresas costumam tomar — RPG → Java, VB6 → .NET, COBOL →
 * Java) está explicitamente FORA DE ESCOPO, porque exige uma arquitetura de
 * migração de sistema completo que o produto ainda não tem. Sem esta trava a
 * IA naturalmente sugeriria "reescreva em Java", que é um conselho que o
 * MuriOps não consegue sustentar nem aplicar.
 */
export const LEGACY_SCOPE_RULE = `
ATENÇÃO — ESTE É UM SISTEMA LEGADO. Regra de escopo obrigatória:

1. PODE e DEVE recomendar: atualização de VERSÃO dentro da mesma tecnologia, de forma padronizada e incremental (ex.: 4.0.0 → 4.0.1 → 4.1.0), atualização de compilador/runtime/biblioteca, correção de vulnerabilidade, e ajustes de compatibilidade necessários pra subir de versão.

2. NÃO recomende, em hipótese alguma, MIGRAÇÃO DE TECNOLOGIA como item do plano — nada de "reescrever em Java", "migrar de RPG para Java", "portar VB6 para .NET", "converter COBOL para C#", "trocar PL/SQL antigo por microserviços". Mesmo que seja a recomendação de mercado, ela está FORA DO ESCOPO desta ferramenta: migração de sistema completo exige um processo e uma arquitetura que este produto não cobre hoje.

3. Se você identificar que uma migração de tecnologia seria realmente o caminho ideal a longo prazo, NÃO crie um item pra isso. Em vez disso, registre UMA frase em "scopeNotes" dizendo que a migração foi identificada mas está fora do escopo desta ferramenta, e siga recomendando o que dá pra fazer dentro da tecnologia atual.

4. Priorize estabilidade sobre modernidade: em sistema legado, uma atualização que quebra produção custa muito mais caro. Prefira passos pequenos, reversíveis, com teste de regressão explícito em cada um.
`;

export function buildUpgradeSystemPrompt(ecosystem: UpgradeEcosystem): string {
  if (ecosystem === "legacy") {
    return `${UPGRADE_SYSTEM_PROMPT}\n${LEGACY_SCOPE_RULE}`;
  }
  return UPGRADE_SYSTEM_PROMPT;
}

export function buildUpgradeUserPrompt(input: UpgradeDesignInput): string {
  return JSON.stringify(
    {
      titulo: input.title,
      ecossistema: input.ecosystem,
      ecossistemaDescricao: input.ecosystemLabel,
      arquivoManifesto: input.manifestFile,
      // Detecção fraca: a IA confirma pelo conteúdo em vez de confiar no palpite.
      confiancaDaDeteccao: input.detectionConfidence,
      manifesto: input.manifestRaw,
    },
    null,
    2,
  );
}

/** Extrai JSON tolerando cercas de código acidentais. */
export function parseUpgradeJson(text: string): Record<string, unknown> {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return {};
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ---------- Normalização defensiva ----------

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strArr = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === "string");

const VALID_RISKS: UpgradeRiskLevel[] = ["low", "medium", "high", "critical"];
const risk = (v: unknown, fallback: UpgradeRiskLevel = "medium"): UpgradeRiskLevel => {
  const s = str(v).toLowerCase();
  return (VALID_RISKS as string[]).includes(s) ? (s as UpgradeRiskLevel) : fallback;
};

export function normalizeUpgrade(
  raw: Record<string, unknown>,
  ecosystem: UpgradeEcosystem = "npm",
  manifestFile?: string,
): UpgradeResult {
  const items: UpgradeItem[] = arr(raw.items).map((x, i) => {
    const it = x as Record<string, unknown>;
    return {
      id: `item-${i + 1}`,
      packageName: str(it.packageName, `pacote-${i + 1}`),
      currentVersion: str(it.currentVersion, "?"),
      targetVersion: str(it.targetVersion, "?"),
      riskLevel: risk(it.riskLevel),
      breakingChanges: strArr(it.breakingChanges),
      migrationSteps: str(it.migrationSteps),
      // Sem filePath explícito, aponta pro manifesto do ecossistema — que é
      // o arquivo que de fato precisa ser editado na esmagadora maioria dos
      // casos (antes ficava null e a UI não mostrava nada).
      filePath:
        typeof it.filePath === "string" && it.filePath.trim()
          ? it.filePath
          : (manifestFile ?? null),
      ecosystem,
      status: "pending",
    };
  });

  const validIds = new Set(items.map((it) => it.id));
  const recommendedOrder = strArr(raw.recommendedOrder).filter((id) => validIds.has(id));
  const orderedRest = items.map((it) => it.id).filter((id) => !recommendedOrder.includes(id));

  return {
    summary: str(raw.summary),
    overallRisk: risk(raw.overallRisk, "medium"),
    recommendedOrder: [...recommendedOrder, ...orderedRest],
    items,
    scopeNotes: strArr(raw.scopeNotes),
  };
}
