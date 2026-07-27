import type { UpgradeItem, UpgradeResult, UpgradeRiskLevel } from "@qa-ai/shared";

/** Entrada normalizada entregue à IA — o service extrai isso do package.json enviado. */
export interface UpgradeDesignInput {
  title: string;
  /** package.json bruto (texto), como veio do usuário. */
  packageJsonRaw: string;
}

/**
 * Prompt de sistema: a IA age como um Engenheiro de Software sênior
 * especialista em migração de dependências (inspirado no conceito do
 * Upgrade Assistant). Recebe um package.json e devolve, dependência por
 * dependência, o que subir, o risco, as quebras de compatibilidade
 * conhecidas e o passo a passo de migração — sem executar nada, só
 * instruindo, no mesmo espírito da Aplicação.
 */
export const UPGRADE_SYSTEM_PROMPT = `Você é um Engenheiro de Software SÊNIOR especialista em migração e atualização de dependências (Node.js/npm/pnpm/yarn), no espírito de ferramentas como o "Upgrade Assistant". Você recebe o conteúdo de um package.json e devolve um PLANO DE ATUALIZAÇÃO concreto.

Para cada dependência relevante (ignore devDependencies triviais e ferramentas irrelevantes se o pacote for grande; priorize as que têm risco real de quebra ou estão desatualizadas/vulneráveis/deprecated):
- Informe a versão atual (currentVersion, como está no package.json) e a versão-alvo recomendada (targetVersion) — use seu conhecimento sobre o ecossistema; se não tiver certeza da última versão exata, recomende a última major/minor estável conhecida e diga isso no texto.
- riskLevel: "low" (patch/minor sem quebra conhecida), "medium" (minor com mudanças de comportamento, ou major pequena/tranquila), "high" (major com breaking changes relevantes), "critical" (pacote deprecated/sem manutenção, vulnerabilidade de segurança conhecida, ou migração que exige reescrever partes do código).
- breakingChanges: lista curta e específica do que muda (APIs removidas, mudança de config, novo Node.js mínimo etc.). Vazio se não houver.
- migrationSteps: passo a passo concreto e acionável para migrar essa dependência com segurança (comandos, o que revisar no código, o que testar depois).
- filePath: sugestão de arquivo afetado além do próprio package.json quando fizer sentido (ex.: arquivo de config do pacote), ou null.
- Não invente pacotes que não estão no package.json enviado. Não repita o mesmo pacote duas vezes.

Também produza:
- overallRisk: o risco geral de aplicar TODA a atualização de uma vez, considerando o conjunto.
- recommendedOrder: os ids dos itens (item-1, item-2...) na ordem recomendada de execução — normalmente do menor pro maior risco, respeitando dependências entre pacotes quando relevante.

Responda SEMPRE em português do Brasil e SOMENTE com um objeto JSON válido, sem markdown, sem cercas de código, EXATAMENTE neste formato:
{
  "summary": "resumo executivo do plano de atualização",
  "overallRisk": "low | medium | high | critical",
  "recommendedOrder": ["item-1", "item-2"],
  "items": [
    {
      "packageName": "nome-do-pacote",
      "currentVersion": "1.2.3",
      "targetVersion": "2.0.0",
      "riskLevel": "low | medium | high | critical",
      "breakingChanges": ["mudança 1", "mudança 2"],
      "migrationSteps": "passo a passo concreto",
      "filePath": "caminho/do/arquivo.ts ou null"
    }
  ]
}`;

export function buildUpgradeUserPrompt(input: UpgradeDesignInput): string {
  return JSON.stringify(
    {
      titulo: input.title,
      packageJson: input.packageJsonRaw,
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

export function normalizeUpgrade(raw: Record<string, unknown>): UpgradeResult {
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
      filePath: typeof it.filePath === "string" && it.filePath.trim() ? it.filePath : null,
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
  };
}
