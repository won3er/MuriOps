import { promises as dns } from "node:dns";
import { isIP } from "node:net";

/**
 * Bloqueia SSRF nos dois pontos onde uma URL fornecida por quem usa o app
 * vira um acesso de rede de verdade no servidor: cadastro de projeto
 * (`project.service.ts`) e início de análise, que aceita um `url` avulso
 * sobrescrevendo a URL do projeto (`analysis.service.ts` → `start()`,
 * `StartAnalysisRequest.url`). Sem isso, alguém podia apontar pra rede
 * interna do Render (`169.254.169.254` metadata de nuvem, `localhost`,
 * `10.x`/`192.168.x`) e ver o conteúdo retornado no relatório de análise.
 *
 * Cobre o hostname resolvido via DNS na hora da checagem — não intercepta
 * redirects durante o crawl em si (o Playwright pode seguir um redirect pra
 * um IP interno no meio da navegação). Fechar esse gap exigiria validar
 * request a request dentro do engine de crawl; fica como próximo passo, não
 * é coberto por este guard.
 */
export class UnsafeUrlError extends Error {
  readonly statusCode = 400;
}

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);
const BLOCKED_HOSTNAME_SUFFIXES = [".local", ".internal", ".localhost"];

export async function assertPublicUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("URL inválida.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError("Só URLs http:// ou https:// são permitidas.");
  }

  // URL.hostname mantém os colchetes de um literal IPv6 (ex.: "[::1]") —
  // net.isIP() só reconhece a forma sem colchetes ("::1"). Sem remover
  // aqui, um literal IPv6 caía no caminho de DNS lookup (que falha pra uma
  // string com colchetes) em vez de ser barrado diretamente como IP.
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new UnsafeUrlError(
      "Essa URL aponta para um host interno/local — não é permitido analisar.",
    );
  }

  // Hostname já é um IP literal (ex.: http://169.254.169.254/) — checa direto.
  if (isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new UnsafeUrlError(
        "Essa URL aponta para um IP interno/reservado — não é permitido analisar.",
      );
    }
    return;
  }

  // Resolve o hostname de verdade e checa TODOS os IPs retornados — evita
  // que só o primeiro endereço "público" de uma resposta DNS com múltiplos
  // IPs (alguns internos) passe na checagem.
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError(
      "Não foi possível resolver esse domínio — confira se a URL está correta.",
    );
  }
  if (addresses.length === 0) {
    throw new UnsafeUrlError("Não foi possível resolver esse domínio.");
  }
  if (addresses.some((a) => isPrivateOrReservedIp(a.address))) {
    throw new UnsafeUrlError(
      "Esse domínio resolve para um IP interno/reservado — não é permitido analisar.",
    );
  }
}

function isPrivateOrReservedIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateOrReservedIpv4(address);
  if (version === 6) return isPrivateOrReservedIpv6(address);
  return true; // Não reconhecido como IP válido — trata como inseguro.
}

function isPrivateOrReservedIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => Number.isNaN(o))) return true;
  const a = octets[0]!;
  const b = octets[1]!;

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8 (privado)
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local, inclui metadata de nuvem)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (privado)
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 e 192.0.2.0/24 (reservado/TEST-NET-1)
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 (privado)
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 (benchmark)
  if (a === 198 && b === 51) return true; // 198.51.100.0/24 (TEST-NET-2)
  if (a === 203 && b === 0) return true; // 203.0.113.0/24 (TEST-NET-3)
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reservado + broadcast

  return false;
}

function isPrivateOrReservedIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true; // loopback / unspecified
  if (normalized.startsWith("fe80:") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb"))
    return true; // fe80::/10 link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7 unique local
  if (normalized.startsWith("ff")) return true; // ff00::/8 multicast

  // IPv4-mapped (::ffff:a.b.c.d) — extrai e checa como IPv4.
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateOrReservedIpv4(mapped[1]!);

  return false;
}
