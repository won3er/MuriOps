import type {
  BlueprintMaturityDimension,
  BlueprintMetric,
  BlueprintMilestone,
  BlueprintNfr,
  BlueprintQualityGate,
  BlueprintResult,
  BlueprintRisk,
  BlueprintTechChoice,
  BlueprintTestCase,
} from "@qa-ai/shared";

/** Entrada normalizada entregue à IA — o service serializa qualquer modo nisto. */
export interface BlueprintDesignInput {
  title: string;
  /** Descrição em linguagem natural do projeto (form/canvas/prompt serializados). */
  description: string;
}

/**
 * Prompt de sistema: a IA age como um Arquiteto de QA / Engenheiro de Qualidade
 * sênior que PROJETA um plano de desenvolvimento com qualidade embutida —
 * não apenas descreve, mas decide stack, desenha arquitetura (Mermaid),
 * estratégia de teste, riscos, marcos e quality gates.
 */
export const BLUEPRINT_SYSTEM_PROMPT = `Você é um Arquiteto de Qualidade (QA) e Engenheiro de Software SÊNIOR de nível mundial. Recebe a descrição de um projeto a construir (ainda não existe código) e produz um PLANO DE DESENVOLVIMENTO COM QUALIDADE EMBUTIDA, como um tech lead / QA lead faria antes do time começar.

Pense como um sênior: escolha tecnologias com justificativa e alternativas, desenhe a arquitetura, defina a estratégia de teste (pirâmide), levante riscos com probabilidade e impacto, quebre em marcos com foco de QA em cada um, e defina quality gates objetivos (métrica + limiar). Seja concreto e acionável, não genérico.

DIAGRAMAS MERMAID: gere sintaxe Mermaid VÁLIDA e simples.
- architectureMermaid: um "flowchart TD" (ou "graph TD") com componentes (frontend, backend, banco, filas, integrações externas) e as ligações. Use ids alfanuméricos e rótulos entre colchetes. Ex.: A[Frontend] --> B[API]; B --> C[(Postgres)].
- userFlowMermaid: um "sequenceDiagram" OU "flowchart TD" do fluxo principal do usuário.
NÃO use aspas duplas dentro dos rótulos Mermaid, NÃO use ponto-e-vírgula desnecessário, mantenha uma instrução por linha com \\n. Evite caracteres que quebrem o parser.

qaMaturityRadar: avalie a maturidade-alvo do plano em 6 a 8 dimensões (ex.: Automação de Testes, CI/CD, Cobertura, Observabilidade, Segurança, Processo/Documentação, Performance, Acessibilidade), score 0-100 realista para o escopo descrito.

pyramid: percentuais de unit/integration/e2e que somem ~100.
riskMatrix: likelihood e impact de 1 a 5 (inteiros).
testCases: 4 a 10 casos em formato Gherkin (given/when/then), com priority P0-P3.

Responda SEMPRE em português do Brasil e SOMENTE com um objeto JSON válido, sem markdown, sem cercas de código, EXATAMENTE neste formato:
{
  "summary": "resumo executivo do plano",
  "objectives": { "goal": "", "scope": "", "outOfScope": "", "successCriteria": ["",""] },
  "personas": ["",""],
  "techStack": [{ "category": "Frontend", "choice": "", "rationale": "", "alternatives": ["",""] }],
  "architectureMermaid": "flowchart TD\\n  A[Frontend] --> B[API]",
  "userFlowMermaid": "sequenceDiagram\\n  U->>API: request",
  "testStrategy": { "pyramid": { "unit": 70, "integration": 20, "e2e": 10 }, "approaches": [""], "tooling": [""], "environments": [""] },
  "testCases": [{ "id": "TC-01", "title": "", "type": "unit", "priority": "P0", "given": "", "when": "", "then": "" }],
  "riskMatrix": [{ "risk": "", "category": "", "likelihood": 3, "impact": 4, "mitigation": "" }],
  "milestones": [{ "name": "", "durationWeeks": 2, "deliverables": ["",""], "qaFocus": "" }],
  "qualityGates": [{ "stage": "Pull Request", "criteria": ["",""], "metric": "", "threshold": "" }],
  "qaMaturityRadar": [{ "dimension": "Automação de Testes", "score": 70 }],
  "nfrs": [{ "category": "Performance", "requirement": "", "target": "" }],
  "metrics": [{ "name": "", "target": "", "why": "" }]
}`;

export function buildBlueprintUserPrompt(input: BlueprintDesignInput): string {
  return JSON.stringify(
    { titulo: input.title, descricaoDoProjeto: input.description },
    null,
    2,
  );
}

/** Extrai JSON tolerando cercas de código acidentais. */
export function parseBlueprintJson(text: string): Record<string, unknown> {
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
const strArr = (v: unknown): string[] => arr(v).map((x) => String(x));
const clampInt = (v: unknown, min: number, max: number, fb: number): number => {
  const n = typeof v === "number" ? Math.round(v) : Number(v);
  if (!Number.isFinite(n)) return fb;
  return Math.min(max, Math.max(min, n));
};

export function normalizeBlueprint(raw: Record<string, unknown>): BlueprintResult {
  const obj = (raw.objectives ?? {}) as Record<string, unknown>;
  const ts = (raw.testStrategy ?? {}) as Record<string, unknown>;
  const pyr = (ts.pyramid ?? {}) as Record<string, unknown>;

  const techStack: BlueprintTechChoice[] = arr(raw.techStack).map((x) => {
    const t = x as Record<string, unknown>;
    return {
      category: str(t.category, "Geral"),
      choice: str(t.choice),
      rationale: str(t.rationale),
      alternatives: strArr(t.alternatives),
    };
  });

  const testCases: BlueprintTestCase[] = arr(raw.testCases).map((x, i) => {
    const t = x as Record<string, unknown>;
    const p = str(t.priority, "P2");
    return {
      id: str(t.id, `TC-${String(i + 1).padStart(2, "0")}`),
      title: str(t.title),
      type: str(t.type, "unit"),
      priority: (["P0", "P1", "P2", "P3"].includes(p) ? p : "P2") as
        | "P0"
        | "P1"
        | "P2"
        | "P3",
      given: str(t.given),
      when: str(t.when),
      then: str(t.then),
    };
  });

  const riskMatrix: BlueprintRisk[] = arr(raw.riskMatrix).map((x) => {
    const r = x as Record<string, unknown>;
    return {
      risk: str(r.risk),
      category: str(r.category, "técnico"),
      likelihood: clampInt(r.likelihood, 1, 5, 3),
      impact: clampInt(r.impact, 1, 5, 3),
      mitigation: str(r.mitigation),
    };
  });

  const milestones: BlueprintMilestone[] = arr(raw.milestones).map((x) => {
    const m = x as Record<string, unknown>;
    return {
      name: str(m.name),
      durationWeeks: clampInt(m.durationWeeks, 1, 104, 2),
      deliverables: strArr(m.deliverables),
      qaFocus: str(m.qaFocus),
    };
  });

  const qualityGates: BlueprintQualityGate[] = arr(raw.qualityGates).map((x) => {
    const g = x as Record<string, unknown>;
    return {
      stage: str(g.stage),
      criteria: strArr(g.criteria),
      metric: str(g.metric),
      threshold: str(g.threshold),
    };
  });

  const qaMaturityRadar: BlueprintMaturityDimension[] = arr(
    raw.qaMaturityRadar,
  ).map((x) => {
    const d = x as Record<string, unknown>;
    return { dimension: str(d.dimension), score: clampInt(d.score, 0, 100, 50) };
  });

  const nfrs: BlueprintNfr[] = arr(raw.nfrs).map((x) => {
    const n = x as Record<string, unknown>;
    return {
      category: str(n.category, "Geral"),
      requirement: str(n.requirement),
      target: str(n.target),
    };
  });

  const metrics: BlueprintMetric[] = arr(raw.metrics).map((x) => {
    const m = x as Record<string, unknown>;
    return { name: str(m.name), target: str(m.target), why: str(m.why) };
  });

  return {
    summary: str(raw.summary),
    objectives: {
      goal: str(obj.goal),
      scope: str(obj.scope),
      outOfScope: str(obj.outOfScope),
      successCriteria: strArr(obj.successCriteria),
    },
    personas: strArr(raw.personas),
    techStack,
    architectureMermaid: str(
      raw.architectureMermaid,
      "flowchart TD\n  A[Frontend] --> B[API]\n  B --> C[(Banco)]",
    ),
    userFlowMermaid: str(
      raw.userFlowMermaid,
      "flowchart TD\n  U[Usuário] --> A[App]",
    ),
    testStrategy: {
      pyramid: {
        unit: clampInt(pyr.unit, 0, 100, 70),
        integration: clampInt(pyr.integration, 0, 100, 20),
        e2e: clampInt(pyr.e2e, 0, 100, 10),
      },
      approaches: strArr(ts.approaches),
      tooling: strArr(ts.tooling),
      environments: strArr(ts.environments),
    },
    testCases,
    riskMatrix,
    milestones,
    qualityGates,
    qaMaturityRadar,
    nfrs,
    metrics,
  };
}
