import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { CriticalFlowStep } from "@qa-ai/shared";
import { assertPublicUrl, UnsafeUrlError } from "../../infrastructure/security/url-guard.js";

/**
 * Executor de passos de um Fluxo Crítico. Reusa o mesmo lançamento de
 * Chromium com flags de baixo consumo de memória do crawler
 * (`analysis/crawler.ts`), porque roda no mesmo processo/limite de RAM do
 * Render free tier — sem essas flags, um fluxo rodando de hora em hora
 * junto com análises normais estouraria a memória com mais frequência
 * ainda que o crawler sozinho.
 *
 * Diferente do crawler (que só lê/observa passivamente), aqui os passos
 * *interagem* com o site (clicar, preencher, navegar) — é essencialmente um
 * teste E2E rodando em produção contra o site real do cliente. Por isso:
 * timeout curto por passo (não é um crawl, é simular uma ação humana),
 * screenshot automático no momento exato da falha (pra debug sem precisar
 * reproduzir manualmente), e nenhuma tentativa de "continuar mesmo assim"
 * depois de um passo falhar — um fluxo crítico quebrado no passo 3 não
 * prova nada sobre os passos 4-5, então o run para ali.
 */

const STEP_TIMEOUT_MS = 15_000;

export interface FlowStepResult {
  index: number;
  passed: boolean;
  errorMessage?: string;
}

export interface FlowRunResult {
  status: "PASSED" | "FAILED";
  failedStepIndex: number | null;
  errorMessage: string | null;
  screenshotBase64: string | null;
  durationMs: number;
}

export async function runCriticalFlow(
  startUrl: string,
  steps: CriticalFlowStep[],
): Promise<FlowRunResult> {
  const startedAt = Date.now();

  try {
    await assertPublicUrl(startUrl);
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return {
        status: "FAILED",
        failedStepIndex: null,
        errorMessage: err.message,
        screenshotBase64: null,
        durationMs: Date.now() - startedAt,
      };
    }
    throw err;
  }

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  try {
    ({ browser, context } = await launchWithRetry());
    const page = await context.newPage();
    page.setDefaultTimeout(STEP_TIMEOUT_MS);

    await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: STEP_TIMEOUT_MS });

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;
      try {
        await runStep(page, step);
      } catch (err) {
        const screenshotBase64 = await captureScreenshotSafely(page);
        return {
          status: "FAILED",
          failedStepIndex: i,
          errorMessage: describeStepError(step, err),
          screenshotBase64,
          durationMs: Date.now() - startedAt,
        };
      }
    }

    return {
      status: "PASSED",
      failedStepIndex: null,
      errorMessage: null,
      screenshotBase64: null,
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    // Falha fora de um passo específico (ex.: não conseguiu nem carregar a
    // startUrl, ou o navegador crashou) — sem screenshot possível.
    return {
      status: "FAILED",
      failedStepIndex: null,
      errorMessage: err instanceof Error ? err.message : String(err),
      screenshotBase64: null,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
  }
}

async function runStep(page: Page, step: CriticalFlowStep): Promise<void> {
  switch (step.action) {
    case "NAVIGATE": {
      if (!step.value) throw new Error("Passo NAVIGATE sem 'value' (URL de destino).");
      await page.goto(step.value, { waitUntil: "domcontentloaded", timeout: STEP_TIMEOUT_MS });
      return;
    }
    case "CLICK": {
      if (!step.selector) throw new Error("Passo CLICK sem 'selector'.");
      await page.locator(step.selector).first().click({ timeout: STEP_TIMEOUT_MS });
      return;
    }
    case "FILL": {
      if (!step.selector) throw new Error("Passo FILL sem 'selector'.");
      await page
        .locator(step.selector)
        .first()
        .fill(step.value ?? "", { timeout: STEP_TIMEOUT_MS });
      return;
    }
    case "SELECT": {
      if (!step.selector) throw new Error("Passo SELECT sem 'selector'.");
      await page
        .locator(step.selector)
        .first()
        .selectOption(step.value ?? "", { timeout: STEP_TIMEOUT_MS });
      return;
    }
    case "WAIT_FOR_SELECTOR": {
      if (!step.selector) throw new Error("Passo WAIT_FOR_SELECTOR sem 'selector'.");
      await page.locator(step.selector).first().waitFor({ state: "visible", timeout: STEP_TIMEOUT_MS });
      return;
    }
    case "ASSERT_TEXT": {
      if (!step.selector) throw new Error("Passo ASSERT_TEXT sem 'selector'.");
      const text = (await page.locator(step.selector).first().innerText({ timeout: STEP_TIMEOUT_MS })) ?? "";
      if (step.expected && !text.includes(step.expected)) {
        throw new Error(
          `Texto esperado "${step.expected}" não encontrado em "${step.selector}" (achei: "${text.slice(0, 200)}").`,
        );
      }
      return;
    }
    case "ASSERT_URL": {
      const url = page.url();
      if (step.expected && !url.includes(step.expected)) {
        throw new Error(`URL esperada conter "${step.expected}", mas está em "${url}".`);
      }
      return;
    }
    default: {
      const exhaustive: never = step.action;
      throw new Error(`Ação de passo desconhecida: ${exhaustive}`);
    }
  }
}

function describeStepError(step: CriticalFlowStep, err: unknown): string {
  const base = step.label ? `"${step.label}"` : `passo ${step.action}`;
  const detail = err instanceof Error ? err.message : String(err);
  return `Falhou em ${base}: ${detail}`;
}

async function captureScreenshotSafely(page: Page): Promise<string | null> {
  try {
    const buf = await page.screenshot({ type: "jpeg", quality: 60, timeout: 5_000 });
    return buf.toString("base64");
  } catch {
    return null;
  }
}

async function launchWithRetry(
  attempts = 2,
): Promise<{ browser: Browser; context: BrowserContext }> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const browser = await chromium.launch({
        headless: true,
        args: [
          "--disable-gpu",
          "--disable-dev-shm-usage",
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
          "--no-zygote",
          "--renderer-process-limit=1",
          "--js-flags=--max-old-space-size=128",
        ],
      });
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
    : new Error("Falha ao iniciar o navegador para o fluxo crítico");
}
