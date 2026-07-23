import type { Severity } from "@qa-ai/shared";
import type {
  AiAnalysisInput,
  AiAnalysisResult,
  AiIssueEnrichment,
} from "./provider.js";

/**
 * Prompt de sistema: a IA age como um Analista de QA sênior, não um scanner.
 * Explica motivo, impacto, prioridade, reprodução e correção.
 */
export const SYSTEM_PROMPT = `Você é um Analista de Qualidade (QA) sênior de nível mundial, com experiência em desenvolvimento web, UX, performance, acessibilidade, SEO e segurança.

Você recebe dados coletados automaticamente de um site (problemas detectados por módulos especializados + scores por categoria). Sua tarefa NÃO é apenas listar — é interpretar como um profissional faria em um relatório para desenvolvedores e gestores.

Os problemas foram detectados por regras automáticas — algumas geram falsos positivos ou apontam coisas triviais/normais que não são falhas de verdade (ex.: um header de segurança ausente em um site estático simples sem dados sensíveis pode ser irrelevante; um "erro" de console que é só um log de biblioteca de terceiros não é um bug). Sua função é agir como um revisor humano sênior: julgar CADA problema com bom senso antes de validá-lo.

Para cada problema, você deve produzir:
- valid: true se for uma falha real que vale a pena corrigir; false se for falso positivo, algo trivial demais, ou não representar risco real nesse contexto.
- impact: explique em linguagem SIMPLES, para alguém leigo em tecnologia, o que esse problema significa e por que importa (ou, se valid=false, explique por que NÃO é um problema real). Evite jargão sem explicar; se usar um termo técnico, defina-o em poucas palavras.
- suggestion: como corrigir, de forma acionável e específica (com exemplo de código quando fizer sentido). Se valid=false, pode ser uma string vazia.
- stepsToReproduce: passos objetivos para reproduzir o problema.

Também produza um "summary": um resumo executivo do estado geral de qualidade do site, em linguagem acessível para quem não é técnico, destacando os pontos mais críticos e priorizando o que corrigir primeiro.

Responda SEMPRE em português do Brasil e SOMENTE com um objeto JSON válido, sem markdown, sem cercas de código, no formato:
{
  "summary": "string",
  "enrichments": [
    { "fingerprint": "string", "valid": true, "impact": "string", "suggestion": "string", "stepsToReproduce": ["string"] }
  ]
}
O campo "fingerprint" deve corresponder exatamente ao fingerprint do problema recebido. Inclua um enrichment para TODOS os problemas recebidos, mesmo os marcados valid=false.`;

export function buildUserPrompt(input: AiAnalysisInput): string {
  return JSON.stringify(
    {
      site: input.siteUrl,
      paginasDescobertas: input.pagesDiscovered,
      scoreGeral: input.overallScore,
      scoresPorCategoria: input.categoryScores,
      problemas: input.issues.map((i) => ({
        fingerprint: i.fingerprint,
        titulo: i.title,
        descricao: i.description,
        categoria: i.category,
        severidade: i.severity,
        pagina: i.pageUrl,
        seletor: i.selector,
        evidenciaBruta: i.raw?.slice(0, 2000) ?? null,
      })),
    },
    null,
    2,
  );
}

/** Extrai JSON de uma resposta, tolerando cercas de código acidentais. */
export function parseAiJson(text: string): {
  summary?: string;
  enrichments?: unknown[];
} {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return {};
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return {};
  }
}

/** Normaliza a resposta bruta da IA (comum aos três providers). */
export function normalizeAiResult(parsed: {
  summary?: string;
  enrichments?: unknown[];
}): AiAnalysisResult {
  const enrichments: AiIssueEnrichment[] = (parsed.enrichments ?? [])
    .map((e) => e as Record<string, unknown>)
    .filter((e) => typeof e.fingerprint === "string")
    .map((e) => ({
      fingerprint: String(e.fingerprint),
      valid: e.valid !== false,
      impact: typeof e.impact === "string" ? e.impact : "",
      suggestion: typeof e.suggestion === "string" ? e.suggestion : "",
      stepsToReproduce: Array.isArray(e.stepsToReproduce)
        ? e.stepsToReproduce.map(String)
        : [],
      severity: e.severity as Severity | undefined,
    }));

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    enrichments,
  };
}
