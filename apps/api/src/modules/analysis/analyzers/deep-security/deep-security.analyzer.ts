import { AnalysisCategory, Severity, type DetectedIssue } from "@qa-ai/shared";
import type { PageContext, SiteAnalyzer } from "../../types.js";
import { issue } from "../helpers.js";
import {
  ADMIN_PATHS,
  API_DOCS_PATHS,
  BACKUP_PATHS,
  DIR_LISTING_PATHS,
  SECRET_PATHS,
  VULNERABLE_JS_LIBS,
} from "./paths.js";
import {
  probeAllowedMethods,
  probeCertificate,
  probeDns,
  probeGet,
} from "./probes.js";

const DANGEROUS_METHODS = ["TRACE", "TRACK", "CONNECT", "PUT", "DELETE"];

/**
 * Módulo — Segurança Avançada (auditoria prática, opt-in).
 * TLS, DNS anti-spoofing, segredos/backups expostos, headers avançados,
 * CORS, directory listing, HTTP methods perigosos e checagens de DOM
 * (autocomplete, CSRF, mixed content, libs JS vulneráveis).
 *
 * Tudo aqui é passivo: apenas GET/OPTIONS/DNS lookup/handshake TLS —
 * nenhum payload de ataque é enviado, nenhuma credencial é testada.
 */
export class DeepSecurityAnalyzer implements SiteAnalyzer {
  readonly id = "deep-security";

  async analyze(pages: PageContext[], siteUrl: string): Promise<DetectedIssue[]> {
    if (pages.length === 0) return [];
    const origin = new URL(siteUrl).origin;
    const hostname = new URL(siteUrl).hostname;
    const isHttps = siteUrl.startsWith("https://");

    const issues: DetectedIssue[] = [];
    const add = (
      title: string,
      description: string,
      severity: Severity,
      key: string,
      raw?: string | null,
    ) =>
      issues.push(
        issue({
          title,
          description,
          category: AnalysisCategory.DEEP_SECURITY,
          severity,
          pageUrl: siteUrl,
          fingerprintExtra: [key],
          raw: raw ?? null,
        }),
      );

    await Promise.all([
      isHttps ? this.checkCertificate(hostname, add) : Promise.resolve(),
      this.checkDns(hostname, add),
      this.checkHttpMethods(origin, add),
      this.checkExposedFiles(origin, SECRET_PATHS, add, Severity.CRITICAL, "Segredo exposto"),
      this.checkExposedFiles(origin, BACKUP_PATHS, add, Severity.HIGH, "Backup/log exposto"),
      this.checkExposedFiles(origin, API_DOCS_PATHS, add, Severity.MEDIUM, "Documentação de API pública"),
      this.checkExposedFiles(origin, ADMIN_PATHS, add, Severity.MEDIUM, "Painel administrativo acessível"),
      this.checkDirListing(origin, add),
      this.checkSecurityTxt(origin, add),
      this.checkAdvancedHeaders(pages[0]!, add),
      this.checkCors(origin, add),
    ]);

    // Checagens de DOM — roda na primeira página (representativa; evita
    // repetir o mesmo achado uma vez por página visitada).
    await this.checkDomIssues(pages[0]!, add);

    return issues;
  }

  private async checkCertificate(
    hostname: string,
    add: (t: string, d: string, s: Severity, k: string, r?: string | null) => void,
  ): Promise<void> {
    const cert = await probeCertificate(hostname);
    if (!cert) return;

    if (cert.daysToExpiry < 0) {
      add(
        "TLS — Certificado expirado",
        `O certificado SSL/TLS expirou em ${cert.validTo}. Navegadores bloqueiam o acesso com aviso de segurança.`,
        Severity.CRITICAL,
        "cert-expired",
      );
    } else if (cert.daysToExpiry < 15) {
      add(
        "TLS — Certificado expirando em breve",
        `O certificado expira em ${cert.daysToExpiry} dia(s) (${cert.validTo}). Renove antes do vencimento para evitar queda de acesso.`,
        Severity.HIGH,
        "cert-expiring",
      );
    } else if (cert.daysToExpiry < 30) {
      add(
        "TLS — Certificado expira em menos de 30 dias",
        `O certificado expira em ${cert.daysToExpiry} dia(s) (${cert.validTo}). Planeje a renovação.`,
        Severity.MEDIUM,
        "cert-expiring-30",
      );
    }

    if (cert.protocol && /TLSv1(\.0|\.1)?$/.test(cert.protocol) && cert.protocol !== "TLSv1.2") {
      add(
        "TLS — Protocolo desatualizado",
        `A conexão negociou ${cert.protocol}, um protocolo considerado inseguro/obsoleto. O ideal é exigir TLS 1.2 ou superior.`,
        Severity.HIGH,
        "tls-weak-protocol",
      );
    }
  }

  private async checkDns(
    hostname: string,
    add: (t: string, d: string, s: Severity, k: string, r?: string | null) => void,
  ): Promise<void> {
    const dns = await probeDns(hostname);

    if (!dns.spf) {
      add(
        "DNS — SPF ausente",
        "Não há registro SPF configurado para o domínio. Sem SPF, qualquer servidor pode enviar e-mails se passando pelo seu domínio (spoofing), o que prejudica também a entregabilidade dos e-mails legítimos.",
        Severity.MEDIUM,
        "spf-missing",
      );
    }

    if (!dns.dmarc) {
      add(
        "DNS — DMARC ausente",
        "Não há política DMARC configurada. DMARC diz aos provedores de e-mail o que fazer com mensagens que falham na verificação SPF/DKIM — sem ele, phishing usando seu domínio é mais fácil de passar despercebido.",
        Severity.MEDIUM,
        "dmarc-missing",
      );
    }

    if (!dns.caa) {
      add(
        "DNS — CAA ausente",
        "Não há registro CAA definindo quais autoridades certificadoras podem emitir certificados para este domínio. Sem CAA, qualquer CA pública pode emitir um certificado válido para o seu site.",
        Severity.LOW,
        "caa-missing",
      );
    }
  }

  private async checkHttpMethods(
    origin: string,
    add: (t: string, d: string, s: Severity, k: string, r?: string | null) => void,
  ): Promise<void> {
    const methods = await probeAllowedMethods(origin);
    const dangerous = methods.filter((m) => DANGEROUS_METHODS.includes(m));
    if (dangerous.length) {
      add(
        "HTTP — Métodos potencialmente perigosos habilitados",
        `O servidor aceita os métodos: ${dangerous.join(", ")}. TRACE pode vazar cookies (Cross-Site Tracing); PUT/DELETE sem controle de acesso podem permitir modificar/apagar recursos.`,
        Severity.MEDIUM,
        "dangerous-methods",
        methods.join(", "),
      );
    }
  }

  private async checkExposedFiles(
    origin: string,
    paths: string[],
    add: (t: string, d: string, s: Severity, k: string, r?: string | null) => void,
    severity: Severity,
    label: string,
  ): Promise<void> {
    const checks = paths.map(async (p) => {
      const res = await probeGet(`${origin}/${p}`);
      if (!res || res.status !== 200) return null;
      // Evita falso positivo de SPAs que devolvem 200 + HTML pra qualquer rota.
      const looksLikeSpaFallback =
        res.text.trim().toLowerCase().startsWith("<!doctype html") ||
        res.text.trim().toLowerCase().startsWith("<html");
      if (looksLikeSpaFallback && !p.includes(".php")) return null;
      return p;
    });

    const exposed = (await Promise.all(checks)).filter((p): p is string => !!p);
    if (exposed.length) {
      add(
        `Segredos/Config — ${label}`,
        `Arquivo(s) acessível(is) publicamente: ${exposed.map((p) => `/${p}`).join(", ")}. Isso pode expor credenciais, chaves de API ou estrutura interna do sistema. Remova o acesso público ou bloqueie no servidor/CDN imediatamente.`,
        severity,
        `exposed:${label}`,
        exposed.join("\n"),
      );
    }
  }

  private async checkDirListing(
    origin: string,
    add: (t: string, d: string, s: Severity, k: string, r?: string | null) => void,
  ): Promise<void> {
    for (const p of DIR_LISTING_PATHS) {
      const res = await probeGet(`${origin}/${p}`);
      if (res?.status === 200 && /index of \//i.test(res.text)) {
        add(
          "Servidor — Directory listing habilitado",
          `A pasta /${p} lista seus arquivos publicamente (directory listing ativo). Isso expõe todos os arquivos da pasta a qualquer visitante. Desative a listagem de diretórios no servidor web.`,
          Severity.MEDIUM,
          "dir-listing",
          p,
        );
        return;
      }
    }
  }

  private async checkSecurityTxt(
    origin: string,
    add: (t: string, d: string, s: Severity, k: string, r?: string | null) => void,
  ): Promise<void> {
    const res = await probeGet(`${origin}/.well-known/security.txt`);
    if (!res || res.status !== 200) {
      add(
        "Boas práticas — security.txt ausente",
        "Não há um arquivo /.well-known/security.txt. Esse arquivo (RFC 9116) informa pesquisadores de segurança sobre como reportar vulnerabilidades encontradas — sem ele, relatos podem nunca chegar até você.",
        Severity.INFO,
        "security-txt",
      );
    }
  }

  private async checkAdvancedHeaders(
    firstPage: PageContext,
    add: (t: string, d: string, s: Severity, k: string, r?: string | null) => void,
  ): Promise<void> {
    const h = firstPage.responseHeaders;
    if (!h["permissions-policy"]) {
      add(
        "Headers — Permissions-Policy ausente",
        "Sem Permissions-Policy, o navegador não restringe o uso de APIs sensíveis (câmera, microfone, geolocalização) por scripts de terceiros carregados na página.",
        Severity.LOW,
        "permissions-policy",
      );
    }
    if (!h["cross-origin-opener-policy"]) {
      add(
        "Headers — Cross-Origin-Opener-Policy ausente",
        "Sem COOP, a página fica vulnerável a ataques que usam janelas/abas abertas por ela para roubar dados (Spectre-class attacks via cross-origin window references).",
        Severity.LOW,
        "coop",
      );
    }
    if (!h["cross-origin-resource-policy"]) {
      add(
        "Headers — Cross-Origin-Resource-Policy ausente",
        "Sem CORP, outros sites podem incluir recursos desta página (imagens, scripts) sem restrição, facilitando abuso de dados ou hotlinking.",
        Severity.INFO,
        "corp",
      );
    }
  }

  private async checkCors(
    origin: string,
    add: (t: string, d: string, s: Severity, k: string, r?: string | null) => void,
  ): Promise<void> {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(origin, {
        signal: controller.signal,
        headers: { Origin: "https://qa-ai-cors-probe.invalid" },
      });
      clearTimeout(t);
      const acao = res.headers.get("access-control-allow-origin");
      const acac = res.headers.get("access-control-allow-credentials");
      if (acao === "https://qa-ai-cors-probe.invalid" || (acao === "*" && acac === "true")) {
        add(
          "CORS — Configuração insegura",
          `O servidor reflete/permite qualquer origem em Access-Control-Allow-Origin${acac === "true" ? " combinado com credenciais habilitadas" : ""}. Isso permite que sites maliciosos façam requisições autenticadas em nome do usuário e leiam a resposta.`,
          Severity.HIGH,
          "cors-misconfig",
        );
      }
    } catch {
      /* alvo não respondeu ao probe — sem achado */
    }
  }

  private async checkDomIssues(
    ctx: PageContext,
    add: (t: string, d: string, s: Severity, k: string, r?: string | null) => void,
  ): Promise<void> {
    const result = await ctx.page
      .evaluate(() => {
        const passwordNoAutocompleteOff = [
          ...document.querySelectorAll('input[type="password"]'),
        ].some((el) => el.getAttribute("autocomplete") !== "off" && el.getAttribute("autocomplete") !== "new-password");

        const forms = [...document.querySelectorAll("form")];
        const postFormsWithoutCsrf = forms.filter((f) => {
          const method = (f.getAttribute("method") || "get").toLowerCase();
          if (method !== "post") return false;
          const inputs = [...f.querySelectorAll("input[type=hidden]")];
          return !inputs.some((i) =>
            /csrf|token|_token|authenticity/i.test(i.getAttribute("name") ?? ""),
          );
        }).length;

        const bodyText = document.body.innerText.slice(0, 20000);
        const emailMatches = bodyText.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        );
        const mailtoCount = document.querySelectorAll('a[href^="mailto:"]').length;

        const mixedContent = [
          ...document.querySelectorAll('img[src^="http://"], script[src^="http://"], link[href^="http://"]'),
        ].length;

        // Fingerprint mínimo de libs JS vulneráveis (só lê versão exposta pela lib, não executa nada extra).
        const jq = (window as unknown as { jQuery?: { fn?: { jquery?: string } } }).jQuery;
        const jqueryVersion = jq?.fn?.jquery ?? null;

        return {
          passwordNoAutocompleteOff,
          postFormsWithoutCsrf,
          emailCount: emailMatches ? emailMatches.length : 0,
          mailtoCount,
          mixedContent,
          jqueryVersion,
        };
      })
      .catch(() => null);

    if (!result) return;

    if (result.passwordNoAutocompleteOff) {
      add(
        "Formulário — Autocomplete habilitado em campo de senha",
        "Campo de senha sem autocomplete=\"off\"/\"new-password\". O navegador pode salvar e preencher a senha automaticamente em computadores compartilhados, o que é um risco em máquinas públicas.",
        Severity.LOW,
        "autocomplete-password",
      );
    }

    if (result.postFormsWithoutCsrf > 0) {
      add(
        "Formulário — Possível ausência de proteção CSRF",
        `${result.postFormsWithoutCsrf} formulário(s) POST sem um campo oculto de token (csrf/token/authenticity). Isso é uma heurística — se a proteção for feita por outro meio (header customizado, SameSite cookie), pode ser um falso positivo, mas vale confirmar.`,
        Severity.LOW,
        "csrf-heuristic",
      );
    }

    if (result.emailCount > 0 && result.mailtoCount === 0) {
      add(
        "Conteúdo — E-mail exposto em texto puro",
        `${result.emailCount} endereço(s) de e-mail em texto puro na página, sem link mailto nem ofuscação. Bots de spam raspam esse tipo de conteúdo facilmente. Considere ofuscar ou usar formulário de contato em vez do e-mail direto.`,
        Severity.INFO,
        "plain-email",
      );
    }

    if (result.mixedContent > 0) {
      add(
        "TLS — Conteúdo misto (mixed content)",
        `${result.mixedContent} recurso(s) carregado(s) via HTTP em uma página HTTPS. Navegadores podem bloquear ou avisar sobre isso, e o recurso HTTP pode ser interceptado/adulterado em trânsito.`,
        Severity.MEDIUM,
        "mixed-content",
      );
    }

    if (result.jqueryVersion) {
      const lib = VULNERABLE_JS_LIBS[0]!;
      if (compareVersions(result.jqueryVersion, lib.belowVersion) < 0) {
        add(
          "Dependências — Biblioteca JS desatualizada com CVE conhecida",
          `jQuery ${result.jqueryVersion} detectado (vulnerável abaixo de ${lib.belowVersion}). ${lib.cve}. Atualize para a versão mais recente.`,
          Severity.MEDIUM,
          "outdated-jquery",
        );
      }
    }
  }
}

/** Compara versões simples "1.2.3" — retorna negativo se a < b. */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
