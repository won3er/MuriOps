import { AnalysisCategory, Severity, type DetectedIssue } from "@qa-ai/shared";
import type { PageContext, SiteAnalyzer } from "../types.js";
import { issue } from "./helpers.js";

/**
 * Módulo 9 — Segurança Passiva (nível site).
 * SEM realizar ataques: apenas inspeciona configurações e headers de resposta
 * (HTTPS, CSP, X-Frame-Options, HSTS, cookies, referrer-policy, content-type).
 *
 * Roda uma vez para o site inteiro (headers de segurança normalmente são os
 * mesmos em todas as páginas) — evita reportar o mesmo problema repetido
 * uma vez por página visitada.
 */
export class SecurityAnalyzer implements SiteAnalyzer {
  readonly id = "security";

  async analyze(pages: PageContext[], siteUrl: string): Promise<DetectedIssue[]> {
    if (pages.length === 0) return [];

    const issues: DetectedIssue[] = [];
    const add = (
      title: string,
      description: string,
      severity: Severity,
      key: string,
      affected: string[],
    ) => {
      const examples = affected.slice(0, 5);
      const suffix = examples.length
        ? ` Página(s): ${examples.join(", ")}${affected.length > examples.length ? ` e mais ${affected.length - examples.length}` : ""}.`
        : "";
      issues.push(
        issue({
          title,
          description: description + suffix,
          category: AnalysisCategory.SECURITY,
          severity,
          pageUrl: affected[0] ?? siteUrl,
          fingerprintExtra: [key],
          raw: affected.length ? `Páginas afetadas:\n${affected.join("\n")}` : null,
        }),
      );
    };

    const isHttps = siteUrl.startsWith("https://");
    const withMissingHeader = (name: string) =>
      pages.filter((p) => !p.responseHeaders[name]).map((p) => p.url);

    if (!isHttps)
      add(
        "Site sem HTTPS",
        "O site é servido sobre HTTP, sem criptografia em trânsito.",
        Severity.HIGH,
        "https",
        [siteUrl],
      );

    const noCsp = withMissingHeader("content-security-policy");
    if (noCsp.length)
      add(
        "Content-Security-Policy ausente",
        `Nenhum header CSP definido em ${noCsp.length} de ${pages.length} página(s) — proteção reduzida contra XSS e injeção de conteúdo.`,
        Severity.MEDIUM,
        "csp",
        noCsp,
      );

    const noXfo = pages
      .filter((p) => !p.responseHeaders["x-frame-options"] && !p.responseHeaders["content-security-policy"])
      .map((p) => p.url);
    if (noXfo.length)
      add(
        "X-Frame-Options ausente",
        `Sem X-Frame-Options nem CSP frame-ancestors em ${noXfo.length} página(s) — risco de clickjacking.`,
        Severity.MEDIUM,
        "xfo",
        noXfo,
      );

    if (isHttps) {
      const noHsts = withMissingHeader("strict-transport-security");
      if (noHsts.length)
        add(
          "HSTS ausente",
          `Header Strict-Transport-Security não definido em ${noHsts.length} página(s) — conexões podem ser rebaixadas para HTTP.`,
          Severity.MEDIUM,
          "hsts",
          noHsts,
        );
    }

    const noXcto = withMissingHeader("x-content-type-options");
    if (noXcto.length)
      add(
        "X-Content-Type-Options ausente",
        `Sem 'nosniff' em ${noXcto.length} página(s) — o navegador pode inferir tipos MIME incorretamente.`,
        Severity.LOW,
        "xcto",
        noXcto,
      );

    const noReferrer = withMissingHeader("referrer-policy");
    if (noReferrer.length)
      add(
        "Referrer-Policy ausente",
        `Sem Referrer-Policy em ${noReferrer.length} página(s) — URLs completas podem vazar para terceiros.`,
        Severity.LOW,
        "referrer",
        noReferrer,
      );

    const first = pages[0]!;
    const server = first.responseHeaders["server"] ?? "";
    const poweredBy = first.responseHeaders["x-powered-by"] ?? "";
    if (/\d+\.\d+/.test(server) || /\d+\.\d+/.test(poweredBy))
      add(
        "Versão de software exposta",
        `Headers expõem versões de software (Server: "${server}", X-Powered-By: "${poweredBy}"), facilitando ataques direcionados.`,
        Severity.LOW,
        "version-leak",
        [first.url],
      );

    if (isHttps) {
      const badCookiePages = pages.filter((p) => {
        const setCookie = p.responseHeaders["set-cookie"] ?? "";
        return setCookie && !/;\s*secure/i.test(setCookie);
      });
      if (badCookiePages.length)
        add(
          "Cookie sem flag Secure",
          `Cookies definidos sem a flag Secure em ${badCookiePages.length} página(s) — podem trafegar em conexões inseguras.`,
          Severity.MEDIUM,
          "cookie-secure",
          badCookiePages.map((p) => p.url),
        );

      const noHttpOnlyPages = pages.filter((p) => {
        const setCookie = p.responseHeaders["set-cookie"] ?? "";
        return setCookie && !/;\s*httponly/i.test(setCookie);
      });
      if (noHttpOnlyPages.length)
        add(
          "Cookie sem flag HttpOnly",
          `Cookies sem HttpOnly em ${noHttpOnlyPages.length} página(s) — ampliam o impacto de XSS.`,
          Severity.MEDIUM,
          "cookie-httponly",
          noHttpOnlyPages.map((p) => p.url),
        );
    }

    return issues;
  }
}
