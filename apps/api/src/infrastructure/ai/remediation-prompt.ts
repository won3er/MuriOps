import type { RemediationItem, RemediationResult } from "@qa-ai/shared";

/** Entrada normalizada entregue à IA — o service serializa a origem (análise ou projeto) nisto. */
export interface RemediationDesignInput {
  title: string;
  siteUrl: string | null;
  /** Descrição em linguagem natural dos achados/plano a transformar em ações. */
  context: string;
}

/**
 * Prompt de sistema: a IA age como um Engenheiro de Software sênior que pega
 * achados de QA (ou um plano de projeto) já existentes e os transforma num
 * checklist de mudanças CONCRETAS E APLICÁVEIS — arquivo por arquivo quando
 * possível — para o usuário (ou o dev dele) executar manualmente. Não
 * inventa arquivos que não fazem sentido; quando o item não é de código
 * (ex.: configuração de DNS, decisão de produto), diz isso claramente.
 */
export const REMEDIATION_SYSTEM_PROMPT = `Você é um Engenheiro de Software SÊNIOR encarregado de transformar uma lista de achados de QA (ou um plano de projeto) em um PLANO DE APLICAÇÃO concreto — um checklist acionável que um desenvolvedor consegue seguir e marcar como feito, item por item.

Para cada item:
- Seja específico: diga O QUE mudar e COMO, com o nível de detalhe de um code review sênior (nomes de arquivo prováveis quando fizer sentido pelo contexto, atributos/propriedades a alterar, trecho de código ou configuração quando ajudar).
- Se o item não é uma mudança de código (ex.: configuração de DNS, decisão de negócio, algo fora do controle do usuário), diga isso explicitamente na descrição e ainda assim explique o passo a passo de quem resolve.
- Priorize por severidade/impacto quando a origem trouxer isso.
- Não invente problemas que não estão na entrada. Não repita o mesmo item duas vezes.
- filePath: seu melhor palpite de caminho de arquivo (ex.: "apps/web/src/app/page.tsx"), ou null se não for uma mudança de arquivo específico.

Responda SEMPRE em português do Brasil e SOMENTE com um objeto JSON válido, sem markdown, sem cercas de código, EXATAMENTE neste formato:
{
  "summary": "resumo executivo do plano de aplicação",
  "items": [
    {
      "title": "título curto do item",
      "category": "categoria (ex.: performance, acessibilidade, seo, seguranca, arquitetura)",
      "severity": "info | low | medium | high | critical",
      "filePath": "caminho/do/arquivo.ts ou null",
      "description": "o que precisa mudar e por quê",
      "howTo": "passo a passo concreto de como aplicar"
    }
  ]
}`;

export function buildRemediationUserPrompt(input: RemediationDesignInput): string {
  return JSON.stringify(
    {
      titulo: input.title,
      siteUrl: input.siteUrl,
      contexto: input.context,
    },
    null,
    2,
  );
}

/** Extrai JSON tolerando cercas de código acidentais. */
export function parseRemediationJson(text: string): Record<string, unknown> {
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

const VALID_SEVERITIES = ["info", "low", "medium", "high", "critical"];

export function normalizeRemediation(
  raw: Record<string, unknown>,
): RemediationResult {
  const items: RemediationItem[] = arr(raw.items).map((x, i) => {
    const it = x as Record<string, unknown>;
    const sev = str(it.severity, "info").toLowerCase();
    return {
      id: `item-${i + 1}`,
      title: str(it.title, `Item ${i + 1}`),
      category: str(it.category, "geral"),
      severity: VALID_SEVERITIES.includes(sev) ? sev : "info",
      filePath: typeof it.filePath === "string" && it.filePath.trim() ? it.filePath : null,
      description: str(it.description),
      howTo: str(it.howTo),
      status: "pending",
    };
  });

  return {
    summary: str(raw.summary),
    items,
  };
}
