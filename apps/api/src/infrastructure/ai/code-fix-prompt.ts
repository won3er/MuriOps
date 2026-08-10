import type { RemediationItem } from "@qa-ai/shared";

/**
 * [10/08/2026] Auto-Fix — entrada pra IA gerar uma correção de código REAL
 * (não só o checklist em texto que o resto de Aplicação já produz). Decisão
 * de segurança deliberada: pede o ARQUIVO INTEIRO já corrigido, não um
 * diff/patch — aplicar um diff exige casar linhas exatas (frágil sem
 * validação), enquanto sobrescrever o arquivo inteiro é exatamente o que a
 * API do GitHub/GitLab já espera (mesmo formato usado por upsertFile), então
 * a superfície de bug de "aplicar errado" é bem menor. Só é chamado quando o
 * arquivo já existe no repositório (nunca cria arquivo novo por adivinhação
 * — ver github-adapter.ts/gitlab-adapter.ts).
 */
export interface CodeFixInput {
  item: Pick<RemediationItem, "title" | "description" | "howTo" | "filePath" | "category" | "severity">;
  currentFileContent: string;
}

export interface CodeFixResult {
  newContent: string;
  explanation: string;
}

export const CODE_FIX_SYSTEM_PROMPT = `Você é um Engenheiro de Software SÊNIOR fazendo uma correção de código pontual e conservadora num arquivo existente, a pedido de um item específico de um plano de remediação de QA/segurança.

Regras estritas:
- Você recebe o CONTEÚDO COMPLETO ATUAL do arquivo. Devolva o ARQUIVO INTEIRO já corrigido (não um diff, não um trecho) — preserve tudo que não precisa mudar, byte a byte.
- Faça SÓ a mudança mínima necessária pra resolver o item descrito. Não refatore, não reformate, não "aproveite para melhorar" outras partes do arquivo.
- Se você não tiver confiança alta de que consegue corrigir isso de forma segura e completa só com o conteúdo do arquivo fornecido (ex.: falta contexto de outros arquivos, a mudança é conceitual/não é de código, o arquivo não parece ser o certo para este item), responda com "applicable": false e não invente uma mudança. É preferível não tentar do que aplicar algo errado.
- Nunca insira segredos, credenciais ou dados fictícios de exemplo que pareçam reais.
- Nunca remova comentários, licenças ou headers existentes do arquivo.

Responda SOMENTE com um objeto JSON válido, sem markdown, sem cercas de código, EXATAMENTE neste formato:
{
  "applicable": true ou false,
  "newContent": "conteúdo completo do arquivo já corrigido (string única, com \\n para quebras de linha) — obrigatório se applicable=true, omitir ou null se applicable=false",
  "explanation": "1-3 frases em português explicando o que mudou e por quê, ou por que não foi possível corrigir"
}`;

export function buildCodeFixUserPrompt(input: CodeFixInput): string {
  return JSON.stringify(
    {
      item: {
        titulo: input.item.title,
        categoria: input.item.category,
        severidade: input.item.severity,
        arquivo: input.item.filePath,
        descricao: input.item.description,
        comoAplicar: input.item.howTo,
      },
      conteudoAtualDoArquivo: input.currentFileContent,
    },
    null,
    2,
  );
}

/** Extrai JSON tolerando cercas de código acidentais — mesmo padrão de remediation-prompt.ts. */
export function parseCodeFixJson(text: string): Record<string, unknown> {
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

/**
 * Normalização defensiva — devolve null (não um objeto vazio) quando a IA
 * disse "applicable: false", devolveu conteúdo vazio, ou a resposta veio
 * malformada. Chamador (adapter) trata null como "sem Auto-Fix desta vez",
 * nunca como erro que derruba o resto do apply().
 */
export function normalizeCodeFix(raw: Record<string, unknown>): CodeFixResult | null {
  const applicable = raw.applicable === true;
  const newContent = typeof raw.newContent === "string" ? raw.newContent : "";
  if (!applicable || !newContent.trim()) return null;
  const explanation = typeof raw.explanation === "string" ? raw.explanation : "Correção sugerida pela IA.";
  return { newContent, explanation };
}
