import { AnalysisCategory, Severity, type DetectedIssue } from "@qa-ai/shared";
import type { PageAnalyzer, PageContext } from "../types.js";
import { issue } from "./helpers.js";
import {
  looksLikePlaceholder,
  SECRET_PATTERNS,
} from "./source-security-scan/secret-patterns.js";

/**
 * Módulo — Segredos expostos no site em produção (nível página).
 *
 * Diferente do SOURCE_SECURITY_SCAN (que varre o repositório no GitHub),
 * este analyzer inspeciona o HTML *renderizado* que o navegador do visitante
 * realmente recebe — inclui scripts inline, comentários e atributos gerados
 * em runtime, que podem existir mesmo sem aparecer no código-fonte versionado
 * (ex.: valor injetado por um template de build, ou nunca commitado mas
 * hardcoded direto na variável de ambiente do bundler de produção). Reusa os
 * mesmos padrões de detecção do scan de repositório, pela mesma razão: regex
 * específica por formato de provedor, para minimizar falso positivo.
 *
 * Nunca registra o segredo em texto pleno — só contagem, um trecho mascarado
 * e o rótulo do padrão, para não criar um segundo vazamento dentro do nosso
 * próprio relatório.
 *
 * Escopo atual: só o HTML renderizado (`page.content()`), que já cobre o
 * vetor mais comum (chave hardcoded que o navegador consegue ler). Não
 * inspeciona corpo de respostas de rede — o crawler hoje não retém corpo de
 * resposta (só metadados, ver `NetworkEntry`), e capturar isso teria custo de
 * memória real no crawler já limitado pelo Render free tier.
 */
export class ExposedSecretsAnalyzer implements PageAnalyzer {
  readonly id = "exposed-secrets";

  async analyze(ctx: PageContext): Promise<DetectedIssue[]> {
    let html: string;
    try {
      html = await ctx.page.content();
    } catch {
      // Página já fechada (ver nota em PageContext.page) — não é um erro do site.
      return [];
    }

    const issues: DetectedIssue[] = [];

    for (const pattern of SECRET_PATTERNS) {
      const matches = html.match(pattern.regex);
      if (!matches) continue;
      const real = matches.filter((m) => !looksLikePlaceholder(m));
      if (real.length === 0) continue;

      const sample = maskSecret(real[0]!);
      issues.push(
        issue({
          title: `Segredo exposto no site — ${pattern.label}`,
          description:
            `Encontrado no HTML entregue ao navegador (${real.length} ocorrência(s) de um padrão compatível com "${pattern.label}"), ` +
            `exemplo mascarado: ${sample}. Qualquer visitante do site — não só quem tem acesso ao repositório — pode ler esse valor abrindo ` +
            `"Exibir código-fonte". Se for uma credencial real (não um exemplo/placeholder), revogue e rotacione imediatamente, remova do lado ` +
            `cliente e, se for necessária no navegador, use uma chave com escopo restrito (ex.: chave pública/publishable, nunca uma secreta) ` +
            `ou passe a chamada por um backend próprio que guarde o segredo de verdade.`,
          category: AnalysisCategory.SECURITY,
          severity: Severity.CRITICAL,
          pageUrl: ctx.url,
          fingerprintExtra: [pattern.id],
        }),
      );
    }

    return issues;
  }
}

/** Mostra só os primeiros/últimos caracteres — o bastante pra identificar o achado, não pra reconstruir o segredo. */
function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 10) return "•".repeat(trimmed.length);
  return `${trimmed.slice(0, 4)}${"•".repeat(Math.min(20, trimmed.length - 8))}${trimmed.slice(-4)}`;
}
