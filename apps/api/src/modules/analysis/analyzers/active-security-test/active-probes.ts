/**
 * Sondas "ativas" — diferente de probes.ts (Segurança Avançada, só GET/leitura),
 * estas enviam POST com dados de teste. Só são chamadas quando o projeto tem
 * `activeTestingConsent = true` (gate em analysis.service.ts).
 *
 * Identificação: User-Agent próprio, transparente — quem olhar o log do
 * servidor-alvo consegue saber que foi um scan de segurança autorizado, não
 * um ataque anônimo. Mesma prática de scanners de mercado (Qualys, Detectify).
 */
const SCANNER_USER_AGENT =
  "MuriOps-SecurityScan/1.0 (+https://muriops.com.br/docs/funcionalidades; teste ativo autorizado pelo proprietario do projeto)";

export interface ActiveProbeResult {
  status: number;
  text: string;
  durationMs: number;
}

/** POST com timeout curto — usado só contra o próprio site do projeto, nunca URL arbitrária. */
export async function probePost(
  url: string,
  body: Record<string, string>,
  timeoutMs = 8000,
): Promise<ActiveProbeResult | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const t0 = performance.now();
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": SCANNER_USER_AGENT,
      },
      body: new URLSearchParams(body).toString(),
    });
    const durationMs = Math.round(performance.now() - t0);
    clearTimeout(t);
    const text = await res.text().catch(() => "");
    return { status: res.status, text, durationMs };
  } catch {
    return null;
  }
}

export async function probeGetWithUa(
  url: string,
  timeoutMs = 6000,
): Promise<ActiveProbeResult | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const t0 = performance.now();
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      headers: { "user-agent": SCANNER_USER_AGENT },
    });
    const durationMs = Math.round(performance.now() - t0);
    clearTimeout(t);
    const text = await res.text().catch(() => "");
    return { status: res.status, text, durationMs };
  } catch {
    return null;
  }
}

/**
 * Corta o circuito se o alvo começar a devolver erro de servidor em
 * sequência — o objetivo é auditar, não derrubar o site do cliente.
 */
export class CircuitBreaker {
  private consecutiveServerErrors = 0;
  private tripped = false;

  constructor(private readonly threshold = 3) {}

  get isOpen(): boolean {
    return this.tripped;
  }

  record(status: number | null): void {
    if (this.tripped) return;
    if (status !== null && status >= 500) {
      this.consecutiveServerErrors++;
      if (this.consecutiveServerErrors >= this.threshold) this.tripped = true;
    } else {
      this.consecutiveServerErrors = 0;
    }
  }
}
