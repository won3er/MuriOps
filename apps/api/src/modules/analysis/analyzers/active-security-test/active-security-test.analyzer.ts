import { AnalysisCategory, Severity, type DetectedIssue } from "@qa-ai/shared";
import type { DetectedFormInfo, PageContext, SiteAnalyzer } from "../../types.js";
import { issue } from "../helpers.js";
import {
  CircuitBreaker,
  probeGetWithUa,
  probePost,
} from "./active-probes.js";
import {
  DETECTION_PAYLOADS,
  SQL_ERROR_SIGNATURES,
  STACK_TRACE_SIGNATURES,
} from "./payloads.js";

/**
 * Teto GLOBAL de formulários sondados com payload — não por página. A
 * descoberta varre todas as páginas do crawl (custo zero: é `evaluate` em
 * página já carregada, sem request ao alvo), mas o número de formulários
 * efetivamente testados continua limitado a este valor, mantendo o volume de
 * requisições contra o site igual ao de antes.
 */
const MAX_FORMS_TESTED = 3;
const RATE_LIMIT_PROBE_COUNT = 12;

/** Capturado no crawl (ver `PageContext.forms`), não redescoberto aqui. */
type DetectedForm = DetectedFormInfo;

/**
 * Módulo — Teste Ativo Autorizado (opt-in, NUNCA roda sem consentimento).
 *
 * Diferente de todos os outros analyzers deste produto, este envia
 * requisições ativas contra o site: repetição rápida pra medir rate-limit,
 * comparação de resposta pra indício de enumeração de usuário, e um punhado
 * curado de payloads de detecção (não de exploração) contra os formulários
 * que o próprio crawl encontrou.
 *
 * Gate: `analysis.service.ts` só inclui esta categoria na análise se
 * `project.activeTestingConsent === true` — o usuário precisa declarar
 * explicitamente que é dono do site ou tem autorização por escrito antes de
 * habilitar isso pra um projeto. Sem isso, este arquivo nunca executa.
 *
 * Escopo deliberadamente contido: nada que grave dado de verdade, nada de
 * força bruta contra conta real, nenhuma wordlist grande, um circuit breaker
 * corta tudo se o alvo começar a devolver 5xx em sequência.
 */
export class ActiveSecurityTestAnalyzer implements SiteAnalyzer {
  readonly id = "active-security-test";

  async analyze(pages: PageContext[], siteUrl: string): Promise<DetectedIssue[]> {
    if (pages.length === 0) return [];
    const issues: DetectedIssue[] = [];
    const breaker = new CircuitBreaker();

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
          category: AnalysisCategory.ACTIVE_SECURITY_TEST,
          severity,
          pageUrl: siteUrl,
          fingerprintExtra: [key],
          raw: raw ?? null,
        }),
      );

    // Varre TODAS as páginas do crawl, não só a primeira: um login quase nunca
    // fica na home (fica em /login, /entrar, /admin...). Descobrir é gratuito —
    // é `evaluate` em página já carregada, sem request ao alvo.
    const forms = this.discoverForms(pages);
    const loginForm = forms.find((f) => f.isLoginLike);

    if (loginForm && loginForm.method === "post") {
      await this.checkRateLimit(loginForm, add, breaker);
      if (!breaker.isOpen) await this.checkUserEnumeration(loginForm, add, breaker);
    } else if (loginForm) {
      // Login sem method="post" é quase sempre um formulário de SPA (React,
      // Vue...), em que o envio real acontece por `fetch` para um endpoint de
      // API que o HTML não revela. Sondar o `action` aqui bateria na própria
      // página — que responde 200 sempre — e produziria um falso "sem
      // rate-limit" com severidade alta. Melhor não testar e dizer o porquê.
      add(
        "Teste ativo — Login encontrado, mas o endpoint real não é determinável pelo HTML",
        `Encontramos um formulário de login em ${loginForm.pageUrl}, mas ele não declara \`method="post"\` — típico de aplicação SPA, onde o envio é feito por JavaScript para um endpoint de API que não aparece no HTML. Testar o endereço do formulário atingiria apenas a página em si e produziria um resultado enganoso, então os testes de rate-limit e de enumeração de usuário foram pulados. Para auditar o login de verdade, rode a análise apontando diretamente para o endpoint de autenticação da API.`,
        Severity.INFO,
        "login-form-not-probeable",
        `Formulário: ${loginForm.method.toUpperCase()} ${loginForm.action}\nCampos: ${loginForm.fieldNames.join(", ")}`,
      );
    } else {
      add(
        "Teste ativo — Nenhum formulário de login encontrado para testar",
        `Nenhuma das ${pages.length} página(s) visitadas tinha formulário com campo de senha, então o teste de rate-limit/enumeração de login não pôde rodar. Se o login existir numa rota que o crawler não alcançou (link só por JavaScript, rota protegida, subdomínio separado), rode a análise apontando direto pra URL de login ou aumente a profundidade/limite de páginas.`,
        Severity.INFO,
        "no-login-form",
        `Páginas visitadas:\n${pages.map((p) => p.url).join("\n")}`,
      );
    }

    if (!breaker.isOpen) {
      await this.checkPayloadReflection(forms.slice(0, MAX_FORMS_TESTED), add, breaker);
    }

    if (breaker.isOpen) {
      add(
        "Teste ativo — Interrompido por segurança",
        "O teste ativo foi interrompido automaticamente porque o site começou a responder com erros de servidor em sequência durante os testes. Isso evita que a auditoria sobrecarregue o site sendo testado. Rode novamente mais tarde se quiser tentar de novo.",
        Severity.INFO,
        "circuit-breaker-tripped",
      );
    }

    return issues;
  }

  /**
   * Descobre formulários em TODAS as páginas do crawl.
   *
   * Antes isto olhava só `pages[0]` (a home), o que na prática desligava em
   * silêncio os testes de login da maioria dos sites — login raramente fica na
   * home. O resultado é deduplicado (o mesmo formulário de newsletter no rodapé
   * de 10 páginas conta uma vez só) e o formulário de login vem primeiro, pra
   * caber no teto de `MAX_FORMS_TESTED` mesmo em sites com muitos formulários.
   */
  private discoverForms(pages: PageContext[]): DetectedForm[] {
    const found: DetectedForm[] = [];
    const seen = new Set<string>();

    for (const ctx of pages) {
      for (const f of ctx.forms) {
        const key = `${f.method} ${f.action} ${[...f.fieldNames].sort().join(",")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push(f);
      }
    }

    // Login primeiro: garante que ele entre no corte de MAX_FORMS_TESTED.
    return found.sort((a, b) => Number(b.isLoginLike) - Number(a.isLoginLike));
  }

  private async checkRateLimit(
    form: DetectedForm,
    add: (t: string, d: string, s: Severity, k: string, r?: string | null) => void,
    breaker: CircuitBreaker,
  ): Promise<void> {
    const statuses: number[] = [];
    let sawThrottle = false;

    for (let i = 0; i < RATE_LIMIT_PROBE_COUNT; i++) {
      if (breaker.isOpen) return;
      const body = this.buildFakeCredentials(form, i);
      const res =
        form.method === "post"
          ? await probePost(form.action, body)
          : await probeGetWithUa(`${form.action}?${new URLSearchParams(body).toString()}`);
      if (!res) continue;
      breaker.record(res.status);
      statuses.push(res.status);
      if (res.status === 429 || res.status === 403) {
        sawThrottle = true;
        break;
      }
    }

    if (!sawThrottle && statuses.length >= RATE_LIMIT_PROBE_COUNT - 1) {
      add(
        "Teste ativo — Sem rate-limit perceptível no login",
        `Enviamos ${statuses.length} tentativas de login seguidas com credenciais inválidas para ${form.action} e nenhuma foi bloqueada (nenhum 429/403). Sem limite de tentativas, o formulário fica exposto a ataques de força bruta/credential stuffing. Considere adicionar um rate-limit por IP/conta (ex.: bloquear após 5-10 tentativas por minuto).`,
        Severity.HIGH,
        "no-rate-limit-login",
        statuses.join(", "),
      );
    }
  }

  private async checkUserEnumeration(
    form: DetectedForm,
    add: (t: string, d: string, s: Severity, k: string, r?: string | null) => void,
    breaker: CircuitBreaker,
  ): Promise<void> {
    const fakeUserA = this.buildFakeCredentials(form, 9001);
    const fakeUserB = this.buildFakeCredentials(form, 9002);

    const resA =
      form.method === "post" ? await probePost(form.action, fakeUserA) : null;
    const resB =
      form.method === "post" ? await probePost(form.action, fakeUserB) : null;
    if (!resA || !resB) return;
    breaker.record(resA.status);
    breaker.record(resB.status);

    // Heurística: se duas credenciais igualmente inválidas dão status ou
    // tamanho de resposta bem diferentes, o servidor provavelmente distingue
    // "usuário não existe" de "senha errada" — o que permite enumerar contas.
    const lengthDiff = Math.abs(resA.text.length - resB.text.length);
    const statusDiffers = resA.status !== resB.status;
    if (statusDiffers || lengthDiff > 50) {
      add(
        "Teste ativo — Possível enumeração de usuário no login",
        `Duas tentativas de login com credenciais igualmente inválidas devolveram respostas diferentes (status ${resA.status} vs ${resB.status}, diferença de ${lengthDiff} caracteres no corpo). Isso é uma heurística — pode ser falso positivo (ex.: mensagem com tempo de resposta variável) — mas se a mensagem de erro realmente distinguir "usuário não existe" de "senha incorreta", um atacante consegue descobrir quais e-mails/usuários existem na base. Use sempre a mesma mensagem genérica ("credenciais inválidas") para os dois casos.`,
        Severity.MEDIUM,
        "user-enumeration-heuristic",
      );
    }
  }

  private async checkPayloadReflection(
    forms: DetectedForm[],
    add: (t: string, d: string, s: Severity, k: string, r?: string | null) => void,
    breaker: CircuitBreaker,
  ): Promise<void> {
    for (const form of forms) {
      if (form.isLoginLike) continue; // não manda payload de detecção no form de senha real.
      if (breaker.isOpen) return;

      for (const payload of DETECTION_PAYLOADS) {
        if (breaker.isOpen) return;
        const body = Object.fromEntries(
          form.fieldNames.slice(0, 6).map((name) => [name, payload.value]),
        );
        if (Object.keys(body).length === 0) continue;

        const res =
          form.method === "post"
            ? await probePost(form.action, body)
            : await probeGetWithUa(`${form.action}?${new URLSearchParams(body).toString()}`);
        if (!res) continue;
        breaker.record(res.status);

        const sqlHit = SQL_ERROR_SIGNATURES.find((re) => re.test(res.text));
        if (sqlHit) {
          add(
            "Teste ativo — Possível erro de SQL vazando na resposta",
            `Ao enviar um payload de detecção (${payload.label}) para o formulário em ${form.action}, a resposta contém um padrão de erro de banco de dados (${sqlHit.source}). Isso pode indicar que a entrada não está sendo tratada/parametrizada corretamente antes de chegar ao banco — um indício forte de SQL Injection. Recomenda-se revisar a query com prepared statements/ORM parametrizado e nunca expor mensagens de erro de banco ao usuário final.`,
            Severity.CRITICAL,
            `sqli-hint:${form.action}`,
          );
          continue;
        }

        const stackHit = STACK_TRACE_SIGNATURES.find((re) => re.test(res.text));
        if (stackHit) {
          add(
            "Teste ativo — Stack trace/erro interno vazando na resposta",
            `O formulário em ${form.action} devolveu o que parece ser um stack trace ou erro não tratado ao receber um payload de teste (${payload.label}). Vazar stack trace expõe estrutura interna do sistema (caminhos de arquivo, versões, nomes de função) que ajudam um atacante a mapear o alvo. Trate exceções e devolva uma mensagem genérica em produção.`,
            Severity.MEDIUM,
            `stack-leak:${form.action}`,
          );
          continue;
        }

        if (payload.label === "xss-marker" && res.text.includes(payload.value)) {
          add(
            "Teste ativo — Payload refletido sem escape na resposta",
            `O formulário em ${form.action} devolveu o payload de teste (uma tag <script> inofensiva usada só como marcador) exatamente como foi enviado, sem escapar os caracteres especiais. Se esse valor for renderizado como HTML na página (e não apenas devolvido como texto/JSON), isso é uma Cross-Site Scripting (XSS) refletida. Confirme manualmente e sempre escape saída de HTML (ex.: encodeURIComponent no back, framework com auto-escape no front).`,
            Severity.HIGH,
            `xss-reflection:${form.action}`,
          );
        }

        // Se o marcador de eco do payload de command injection aparecer na
        // resposta sem o resto do payload (ex.: "qa-probe; echo
        // qa-probe-marker" virou execução real do echo), é sinal forte de
        // que a entrada chegou a um shell sem sanitização.
        if (
          payload.label === "command-injection-marker" &&
          res.text.includes("qa-probe-marker") &&
          !res.text.includes(payload.value)
        ) {
          add(
            "Teste ativo — Possível execução de comando (Command Injection)",
            `Ao enviar um payload de detecção de command injection para o formulário em ${form.action}, o marcador de eco ("qa-probe-marker") apareceu na resposta separado do restante do payload enviado — indício de que a entrada chegou a um shell e foi executada, não apenas devolvida como texto. Confirme manualmente com cautela e nunca monte comandos de shell concatenando entrada do usuário; use execFile/spawn com argumentos em array.`,
            Severity.CRITICAL,
            `command-injection-hint:${form.action}`,
          );
        }
      }
    }
  }

  /** Credenciais obviamente falsas — nunca tenta senha real nem endereço de e-mail existente. */
  private buildFakeCredentials(form: DetectedForm, seed: number): Record<string, string> {
    const body: Record<string, string> = {};
    for (const name of form.fieldNames) {
      if (/pass/i.test(name)) body[name] = `qa-probe-pw-${seed}!X9`;
      else if (/mail/i.test(name)) body[name] = `qa-probe-${seed}@nao-existe.muriops.invalid`;
      else if (/user|login/i.test(name)) body[name] = `qa-probe-${seed}`;
      else body[name] = `qa-probe-${seed}`;
    }
    return body;
  }
}
