import type {
  GuardianFinding,
  GuardianOverallStatus,
  GuardianResult,
  GuardianRiskLevel,
  GuardianRule,
} from "@qa-ai/shared";

/** Entrada normalizada entregue à IA — o service monta isso do run + ruleset. */
export interface GuardianCheckInput {
  title: string;
  /** Nome/descrição do documento, quando informado (ex.: "estoque_julho.csv"). */
  sourceName: string | null;
  /** Texto do documento colado pelo usuário. */
  documentText: string;
  /** Regras de negócio do ruleset selecionado; vazio = sem regras específicas. */
  rules: GuardianRule[];
  rulesetName: string | null;
}

/**
 * Prompt de sistema: a IA age como um auditor operacional sênior — "Business
 * Guardian" — que revisa documentos de negócio (planilhas exportadas como
 * texto, contratos, formulários) em busca de inconsistências e violações de
 * regras explícitas, ANTES que virem um problema pra empresa. Não é o mesmo
 * domínio do QA de sites: aqui o "produto" auditado é um documento/processo,
 * não uma página web.
 */
export const GUARDIAN_SYSTEM_PROMPT = `Você é um AUDITOR OPERACIONAL SÊNIOR ("Business Guardian") contratado para revisar documentos de negócio (planilhas exportadas como texto/CSV, contratos, formulários, relatórios) antes que erros neles cheguem a causar prejuízo — como se você fosse um auditor de qualidade trabalhando 24 horas por dia para a empresa.

Você recebe:
1. O TEXTO BRUTO de um documento.
2. Opcionalmente, uma lista de REGRAS DE NEGÓCIO que a empresa definiu explicitamente (ex.: "estoque nunca pode ficar negativo", "desconto acima de 20% precisa de aprovação"). Se houver regras, sua prioridade máxima é verificar cada uma contra o documento, uma a uma.

Além das regras explícitas, você também deve usar seu próprio julgamento de auditor para apontar inconsistências gerais que qualquer profissional experiente notaria: números que não fecham, datas fora de ordem ou no futuro sem explicação, campos obrigatórios vazios, duplicidade de registros, valores discrepantes do padrão do resto do documento, e sinais de erro de digitação óbvio (ex.: preço 10x maior ou menor que os similares).

Para cada problema encontrado, produza um achado com:
- title: título curto e específico do achado (não genérico).
- description: explicação clara do que está errado e por quê importa, em português simples — a pessoa que só vai ler o resumo executivo precisa entender sem contexto técnico.
- riskLevel: "critical" (causa prejuízo financeiro/legal direto ou já é uma violação grave de regra explícita), "high" (risco real e provável se não corrigido logo), "medium" (inconsistência que deveria ser corrigida mas não é urgente), "low" (observação menor, cosmético ou preventivo).
- ruleId: se o achado violar uma das regras da lista recebida, o id EXATO dessa regra (ex.: "rule-1"); caso contrário null.
- evidence: o trecho literal do documento (linha, célula, cláusula) que evidencia o problema — copie do texto original, não parafraseie. Null se não houver um trecho específico a citar.
- suggestion: a correção concreta e acionável — o que mudar exatamente pra resolver, não um conselho vago.

NÃO invente achados que não têm base no texto recebido. Se o documento estiver limpo e nenhuma regra for violada, devolva a lista de achados vazia e diga isso claramente no resumo — não force a existência de problemas.

Depois de listar os achados, avalie o status geral:
- "green": nenhum achado crítico ou alto — documento passou na auditoria (pode ter achados médios/baixos, mas nada urgente).
- "yellow": há achado(s) de risco médio ou algum alto isolado que precisa de revisão, mas não é uma emergência.
- "red": há pelo menos um achado crítico, ou múltiplos achados de risco alto — precisa de atenção imediata antes de prosseguir.

Responda SEMPRE em português do Brasil e SOMENTE com um objeto JSON válido, sem markdown, sem cercas de código, EXATAMENTE neste formato:
{
  "summary": "resumo executivo em 2-4 frases, em linguagem de negócio (não técnica)",
  "overallStatus": "green | yellow | red",
  "findings": [
    {
      "title": "título do achado",
      "description": "explicação clara",
      "riskLevel": "low | medium | high | critical",
      "ruleId": "rule-1 ou null",
      "evidence": "trecho literal do documento ou null",
      "suggestion": "correção concreta"
    }
  ]
}`;

export function buildGuardianUserPrompt(input: GuardianCheckInput): string {
  return JSON.stringify(
    {
      titulo: input.title,
      documento: input.sourceName ?? "documento colado pelo usuário",
      ruleset: input.rulesetName,
      regrasDeNegocio: input.rules.map((r) => ({ id: r.id, regra: r.description })),
      textoDoDocumento: input.documentText,
    },
    null,
    2,
  );
}

/** Extrai JSON tolerando cercas de código acidentais. */
export function parseGuardianJson(text: string): Record<string, unknown> {
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

const VALID_RISKS: GuardianRiskLevel[] = ["low", "medium", "high", "critical"];
const risk = (v: unknown, fallback: GuardianRiskLevel = "medium"): GuardianRiskLevel => {
  const s = str(v).toLowerCase();
  return (VALID_RISKS as string[]).includes(s) ? (s as GuardianRiskLevel) : fallback;
};

const VALID_STATUSES: GuardianOverallStatus[] = ["green", "yellow", "red"];
const overallStatus = (
  v: unknown,
  findings: GuardianFinding[],
): GuardianOverallStatus => {
  const s = str(v).toLowerCase();
  if ((VALID_STATUSES as string[]).includes(s)) return s as GuardianOverallStatus;
  // Sem status válido da IA: deriva pela pior severidade encontrada.
  if (findings.some((f) => f.riskLevel === "critical")) return "red";
  if (findings.some((f) => f.riskLevel === "high" || f.riskLevel === "medium")) return "yellow";
  return "green";
};

export function normalizeGuardian(
  raw: Record<string, unknown>,
  validRuleIds: Set<string>,
): GuardianResult {
  const findings: GuardianFinding[] = arr(raw.findings).map((x, i) => {
    const f = x as Record<string, unknown>;
    const ruleId = str(f.ruleId) || null;
    return {
      id: `finding-${i + 1}`,
      title: str(f.title, `Achado ${i + 1}`),
      description: str(f.description),
      riskLevel: risk(f.riskLevel),
      ruleId: ruleId && validRuleIds.has(ruleId) ? ruleId : null,
      ruleDescription: null,
      evidence: typeof f.evidence === "string" && f.evidence.trim() ? f.evidence : null,
      suggestion: str(f.suggestion),
      status: "open",
    };
  });

  return {
    summary: str(raw.summary),
    overallStatus: overallStatus(raw.overallStatus, findings),
    findings,
  };
}
