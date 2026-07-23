import { AnalysisCategory, Severity, type DetectedIssue } from "@qa-ai/shared";
import type { PageAnalyzer, PageContext } from "../types.js";
import { issue } from "./helpers.js";

/**
 * Módulo 7 — Console.
 * Captura errors, warnings, unhandled exceptions e promise errors.
 */
export class ConsoleAnalyzer implements PageAnalyzer {
  readonly id = "console";

  async analyze(ctx: PageContext): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];
    const errors = ctx.console.filter((c) => c.type === "error");
    const warnings = ctx.console.filter((c) => c.type === "warning");

    for (const err of dedupe(errors)) {
      issues.push(
        issue({
          title: "Erro de JavaScript no console",
          description: `A página lançou um erro de JavaScript não tratado: "${truncate(err.text)}"${err.location ? ` — em ${err.location}` : ""}. Isso interrompe a execução do script no ponto do erro; qualquer código que viria depois dessa linha na mesma função não roda, o que pode quebrar funcionalidade da página silenciosamente (sem avisar o usuário).`,
          category: AnalysisCategory.CONSOLE,
          severity: Severity.HIGH,
          pageUrl: ctx.url,
          raw: `${err.text}\n${err.location ?? ""}`,
          fingerprintExtra: [signature(err.text)],
        }),
      );
    }

    for (const warn of dedupe(warnings)) {
      issues.push(
        issue({
          title: "Warning no console",
          description: `A página emitiu um aviso no console: "${truncate(warn.text)}"${warn.location ? ` — em ${warn.location}` : ""}. Não quebra a página, mas geralmente sinaliza uso de API depreciada, prop/atributo incorreto, ou um padrão que vai virar erro em versão futura da lib/framework.`,
          category: AnalysisCategory.CONSOLE,
          severity: Severity.LOW,
          pageUrl: ctx.url,
          raw: warn.text,
          fingerprintExtra: [signature(warn.text)],
        }),
      );
    }

    return issues;
  }
}

/** Deduplica por assinatura textual (mesmo erro repetido conta 1 vez). */
function dedupe(entries: { type: string; text: string; location?: string }[]) {
  const seen = new Map<string, (typeof entries)[number]>();
  for (const e of entries) seen.set(signature(e.text), e);
  return [...seen.values()];
}

/** Remove números/urls voláteis para agrupar mensagens equivalentes. */
function signature(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/\d+/g, "<n>")
    .slice(0, 120);
}

function truncate(text: string): string {
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}
