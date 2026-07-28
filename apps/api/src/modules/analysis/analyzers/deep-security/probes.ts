import { connect, type PeerCertificate } from "node:tls";
import { resolveCaa, resolveTxt, resolveMx } from "node:dns/promises";

/** GET com timeout curto, sem seguir credenciais nem enviar payload — só leitura. */
export async function probeGet(
  url: string,
  timeoutMs = 6000,
): Promise<{ status: number; headers: Headers; text: string } | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      // UA de navegador real: um UA que se identifica como bot (usado antes)
      // é bloqueado por proteções anti-bot de hosts como Vercel/Cloudflare,
      // gerando falsos-positivos de "arquivo ausente" em robots.txt,
      // sitemap.xml e security.txt.
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(t);
    const text = await res.text().catch(() => "");
    return { status: res.status, headers: res.headers, text };
  } catch {
    return null;
  }
}

export interface CertInfo {
  validFrom: string;
  validTo: string;
  daysToExpiry: number;
  issuer: string;
  protocol: string | null;
}

/** Inspeciona o certificado TLS via handshake bruto (sem enviar requisição HTTP). */
export function probeCertificate(hostname: string): Promise<CertInfo | null> {
  return new Promise((resolve) => {
    const socket = connect(
      { host: hostname, port: 443, servername: hostname, timeout: 6000 },
      () => {
        const cert: PeerCertificate = socket.getPeerCertificate();
        const protocol = socket.getProtocol();
        socket.end();
        if (!cert || !cert.valid_to) return resolve(null);
        const validTo = new Date(cert.valid_to);
        const daysToExpiry = Math.round(
          (validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        resolve({
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysToExpiry,
          issuer: firstString(cert.issuer?.O) ?? firstString(cert.issuer?.CN) ?? "desconhecido",
          protocol,
        });
      },
    );
    socket.on("error", () => resolve(null));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });
}

export interface DnsAudit {
  spf: string | null;
  dmarc: string | null;
  hasMx: boolean;
  caa: string[] | null;
}

/** dns.promises não tem timeout embutido — sem isso, um domínio sem resposta
 * definitiva (ex.: "localhost", rede instável) pode travar a análise por
 * minutos esperando o resolver desistir. */
function withTimeout<T>(promise: Promise<T>, fallback: T, ms = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** Consultas DNS passivas (registros públicos) — sem tentar autenticar em nada. */
export async function probeDns(domain: string): Promise<DnsAudit> {
  const [spfRecords, dmarcRecords, mxRecords, caaRecords] = await Promise.all([
    withTimeout(resolveTxt(domain).catch(() => [] as string[][]), [] as string[][]),
    withTimeout(
      resolveTxt(`_dmarc.${domain}`).catch(() => [] as string[][]),
      [] as string[][],
    ),
    withTimeout(resolveMx(domain).catch(() => []), []),
    withTimeout(resolveCaa(domain).catch(() => null), null),
  ]);

  const spf =
    spfRecords.map((r) => r.join("")).find((r) => r.startsWith("v=spf1")) ??
    null;
  const dmarc =
    dmarcRecords.map((r) => r.join("")).find((r) => r.startsWith("v=DMARC1")) ??
    null;

  return {
    spf,
    dmarc,
    hasMx: mxRecords.length > 0,
    caa: caaRecords
      ? caaRecords.map(
          (c) => `issue: ${c.issue ?? c.issuewild ?? c.iodef ?? "?"}`,
        )
      : null,
  };
}

function firstString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Testa métodos HTTP habilitados via OPTIONS (não executa nenhum, só lê o header Allow). */
export async function probeAllowedMethods(url: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    // `redirect: "manual"` pelo mesmo motivo do probeGet acima: o padrão do
    // fetch é seguir redirect, e a URL analisada é escolhida por quem usa o
    // app. Sem isso, um site que responde 30x apontando pra rede interna
    // faria esta sonda seguir pra lá — furando a checagem de IP privado que
    // `infrastructure/security/url-guard.ts` faz só na URL inicial.
    const res = await fetch(url, {
      method: "OPTIONS",
      signal: controller.signal,
      redirect: "manual",
    });
    clearTimeout(t);
    const allow = res.headers.get("allow");
    return allow ? allow.split(",").map((m) => m.trim().toUpperCase()) : [];
  } catch {
    return [];
  }
}
