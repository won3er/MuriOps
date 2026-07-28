import { chromium, type Browser, type BrowserContext } from "playwright";
import { storage } from "../../infrastructure/storage/storage.js";
import { pageKey } from "./fingerprint.js";
import type {
  ConsoleEntry,
  NetworkEntry,
  PageContext,
  PerfMetrics,
} from "./types.js";

export interface CrawlOptions {
  siteUrl: string;
  maxDepth: number;
  maxPages: number;
  /** Pasta de storage onde as evidências desta análise são gravadas. */
  storagePrefix: string;
  /** Timeout de navegação por página (ms). */
  navTimeoutMs?: number;
  onPage?: (url: string, index: number, total: number) => void;
  /**
   * Chamado assim que uma página termina de ser coletada, com a aba do
   * Chromium ainda aberta — o chamador roda os analyzers por-página aqui.
   * Logo depois, a aba é fechada (exceto a primeira, mantida até o fim para
   * os analyzers de nível-site). Mantém o pico de memória em ~2 abas
   * simultâneas em vez de uma por página descoberta.
   */
  onPageReady?: (ctx: PageContext) => Promise<void>;
}

export interface CrawlResult {
  browser: Browser;
  context: BrowserContext;
  pages: PageContext[];
}

/** Script injetado antes do load para coletar LCP e CLS via PerformanceObserver. */
const VITALS_INIT = `
window.__vitals = { lcp: 0, cls: 0 };
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__vitals.lcp = e.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (!e.hadRecentInput) window.__vitals.cls += e.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });
} catch (_) {}
`;

/**
 * Módulo 1 — Crawler Inteligente.
 * Descobre páginas por BFS (mesma origem), navegando como um usuário real e
 * coletando console, network, métricas de performance e screenshot por página.
 *
 * Cada página é fechada assim que o callback `onPageReady` termina (exceto a
 * primeira, mantida aberta para os analyzers de nível-site) — evita acumular
 * uma aba de Chromium por página descoberta. O chamador (engine) ainda deve
 * fechar o `browser` ao terminar, no `finally`.
 */
export async function crawl(options: CrawlOptions): Promise<CrawlResult> {
  const { siteUrl, maxDepth, maxPages } = options;
  const navTimeout = options.navTimeoutMs ?? 15000;
  const origin = new URL(siteUrl).origin;

  const { browser, context } = await launchWithRetry();
  await context.addInitScript(VITALS_INIT);

  const visited = new Set<string>();
  const queue: { url: string; depth: number; linkedFrom: string | null }[] = [
    { url: siteUrl, depth: 0, linkedFrom: null },
  ];
  const results: PageContext[] = [];

  while (queue.length > 0 && results.length < maxPages) {
    const item = queue.shift()!;
    const key = pageKey(item.url);
    if (visited.has(key)) continue;
    visited.add(key);

    options.onPage?.(item.url, results.length + 1, maxPages);

    let page;
    try {
      page = await context.newPage();
    } catch {
      // Browser/contexto caiu no meio da análise (instabilidade do Chromium).
      // Para o crawl aqui e entrega o que já foi coletado, em vez de falhar tudo.
      break;
    }
    const consoleEntries: ConsoleEntry[] = [];
    const network: NetworkEntry[] = [];

    page.on("console", (msg) => {
      consoleEntries.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()?.url,
      });
    });
    page.on("pageerror", (err) => {
      consoleEntries.push({ type: "error", text: err.message });
    });
    page.on("requestfailed", (req) => {
      network.push({
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        status: null,
        failed: true,
        failureText: req.failure()?.errorText,
        durationMs: null,
        sizeBytes: null,
        fromCache: false,
      });
    });
    page.on("requestfinished", async (req) => {
      try {
        const res = await req.response();
        const timing = req.timing();
        const headers = res ? await res.allHeaders() : {};
        network.push({
          url: req.url(),
          method: req.method(),
          resourceType: req.resourceType(),
          status: res?.status() ?? null,
          failed: false,
          durationMs:
            timing.responseEnd > 0 ? timing.responseEnd : null,
          sizeBytes: headers["content-length"]
            ? Number(headers["content-length"])
            : null,
          fromCache: res?.fromServiceWorker() ?? false,
        });
      } catch {
        /* resposta indisponível */
      }
    });

    let statusCode: number | null = null;
    let responseHeaders: Record<string, string> = {};
    try {
      // "load" é suficiente pra métricas/DOM prontos e muito mais rápido que
      // "networkidle" (que trava esperando analytics/polling pararem de vez).
      const response = await page.goto(item.url, {
        waitUntil: "load",
        timeout: navTimeout,
      });
      statusCode = response?.status() ?? null;
      responseHeaders = response ? await response.allHeaders() : {};
    } catch {
      // deixa registrado como falha de carregamento; segue com o que houver
    }

    // Aguarda estabilização de vitals (LCP/CLS).
    await page.waitForTimeout(300).catch(() => {});

    const title = await page.title().catch(() => null);
    const perf = await collectPerf(page, network);
    const screenshotPath = await captureScreenshot(
      page,
      item.url,
      options.storagePrefix,
    );
    const hasNav = await page
      .evaluate(() => !!document.querySelector("nav, [role=navigation]"))
      .catch(() => false);

    const ctx: PageContext = {
      url: item.url,
      title,
      depth: item.depth,
      statusCode,
      responseHeaders,
      console: consoleEntries,
      network,
      perf,
      page,
      mainResponse: null,
      screenshotPath,
      hasNav,
    };

    // Descobre links internos para continuar o BFS — precisa da página ainda
    // aberta, então roda antes do callback/fechamento abaixo.
    if (item.depth < maxDepth) {
      const links = await extractLinks(page, origin);
      for (const link of links) {
        if (!visited.has(pageKey(link)) && results.length + queue.length < maxPages) {
          queue.push({ url: link, depth: item.depth + 1, linkedFrom: item.url });
        }
      }
    }

    results.push(ctx);

    // Roda os analyzers por-página (chamador) com a aba ainda aberta.
    await options.onPageReady?.(ctx).catch(() => {});

    // Fecha a aba assim que possível — exceto a primeira página, mantida
    // aberta até o fim para os analyzers de nível-site (SiteSeo,
    // DeepSecurity) que precisam de um Page vivo. Isso é o que evita
    // acumular uma aba de Chromium por página descoberta durante o crawl,
    // que era a causa do estouro de memória em sites pesados.
    if (results.length > 1) {
      await page.close().catch(() => {});
    }
  }

  return { browser, context, pages: results };
}

/**
 * Lança o browser com retry — o Chromium pode falhar de forma transitória ao
 * iniciar (instabilidade do processo nativo); duas tentativas cobrem isso.
 */
async function launchWithRetry(
  attempts = 2,
): Promise<{ browser: Browser; context: BrowserContext }> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      // Flags de baixo consumo de memória — necessário no Render free tier
      // (512MB RAM total pro processo Node + Chromium). Sem elas, sites
      // pesados (muito JS/trackers, como lojas Nuvemshop/Shopify) estouram a
      // memória e o Render mata o container inteiro no meio da análise.
      const browser = await chromium.launch({
        headless: true,
        args: [
          "--disable-gpu",
          "--disable-dev-shm-usage", // usa /tmp em vez de /dev/shm (que é minúsculo em containers)
          "--disable-extensions",
          "--disable-background-networking",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-breakpad",
          "--disable-component-update",
          "--disable-default-apps",
          "--disable-sync",
          "--disable-translate",
          "--metrics-recording-only",
          "--mute-audio",
          "--no-first-run",
          "--no-zygote", // um processo a menos por browser (o zygote existe só pra acelerar forks)
          "--renderer-process-limit=1", // um processo de renderer só, em vez de um por aba
          "--js-flags=--max-old-space-size=128", // teto no heap do V8 por página
        ],
      });
      // Sem userAgent customizado: usa o Chromium real do Playwright. Um UA
      // que se anuncia como bot (ex.: "QA-AI-Bot/0.1") é bloqueado por
      // proteções anti-bot de hosts como Vercel/Cloudflare — o que gera
      // falsos "site fora do ar" nos relatórios, além de não refletir a
      // experiência de um usuário real (o próprio objetivo do crawler).
      const context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
      });
      return { browser, context };
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Falha ao iniciar o navegador para a análise");
}

async function collectPerf(
  page: PageContext["page"],
  network: NetworkEntry[],
): Promise<PerfMetrics> {
  const nav = await page
    .evaluate(() => {
      const [n] = performance.getEntriesByType(
        "navigation",
      ) as PerformanceNavigationTiming[];
      const vitals = (window as unknown as { __vitals?: { lcp: number; cls: number } })
        .__vitals;
      return {
        ttfbMs: n ? n.responseStart : null,
        domContentLoadedMs: n ? n.domContentLoadedEventEnd : null,
        loadMs: n ? n.loadEventEnd : null,
        lcpMs: vitals?.lcp ?? null,
        cls: vitals?.cls ?? null,
      };
    })
    .catch(() => ({
      ttfbMs: null,
      domContentLoadedMs: null,
      loadMs: null,
      lcpMs: null,
      cls: null,
    }));

  const transferBytes = network.reduce((s, r) => s + (r.sizeBytes ?? 0), 0);

  return {
    ...nav,
    transferBytes,
    requestCount: network.length,
  };
}

async function captureScreenshot(
  page: PageContext["page"],
  url: string,
  storagePrefix: string,
): Promise<string | null> {
  try {
    const buffer = await page.screenshot({ fullPage: true, type: "png" });
    const name = `${slug(url)}.png`;
    return await storage.save(storagePrefix, name, buffer);
  } catch {
    return null;
  }
}

async function extractLinks(
  page: PageContext["page"],
  origin: string,
): Promise<string[]> {
  try {
    const hrefs = await page.$$eval("a[href]", (els) =>
      els.map((e) => (e as HTMLAnchorElement).href),
    );
    const internal = new Set<string>();
    for (const href of hrefs) {
      try {
        const u = new URL(href);
        if (u.origin === origin && !u.pathname.match(/\.(pdf|zip|jpg|png|svg|css|js)$/i)) {
          u.hash = "";
          internal.add(u.toString());
        }
      } catch {
        /* href inválido */
      }
    }
    return [...internal];
  } catch {
    return [];
  }
}

function slug(url: string): string {
  return (
    url
      .replace(/^https?:\/\//, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .slice(0, 80) || "page"
  );
}
