import type { UpgradeEcosystem } from "@qa-ai/shared";

/**
 * Lista curada de pacotes com CVE conhecida, por ecossistema — mesmo
 * espírito de `VULNERABLE_JS_LIBS` (deep-security/paths.ts), mas aplicada à
 * versão declarada no manifesto do repositório (dado real do projeto) em vez
 * de só à versão exposta em runtime no navegador.
 *
 * Deliberadamente pequena e específica: não substitui uma feed de CVE de
 * verdade (tipo OSV/Snyk), mas cobre os casos mais comuns e de maior impacto
 * sem depender de nenhuma API externa nova.
 */
export interface KnownVulnerablePackage {
  ecosystem: UpgradeEcosystem;
  name: string;
  belowVersion: string;
  cve: string;
  note: string;
}

export const KNOWN_VULNERABLE_PACKAGES: KnownVulnerablePackage[] = [
  // ---- npm ----
  {
    ecosystem: "npm",
    name: "next",
    belowVersion: "14.2.25",
    cve: "CVE-2025-29927",
    note: "Bypass de autorização no middleware do Next.js.",
  },
  {
    ecosystem: "npm",
    name: "fastify",
    belowVersion: "5.3.2",
    cve: "CVE-2025-32442",
    note: "Bypass de validação de Content-Type.",
  },
  {
    ecosystem: "npm",
    name: "lodash",
    belowVersion: "4.17.21",
    cve: "CVE-2020-8203 / CVE-2021-23337",
    note: "Poluição de protótipo e injeção de comando via template.",
  },
  {
    ecosystem: "npm",
    name: "moment",
    belowVersion: "2.29.4",
    cve: "CVE-2022-31129",
    note: "ReDoS (negação de serviço) no parser de datas.",
  },
  {
    ecosystem: "npm",
    name: "jquery",
    belowVersion: "3.5.0",
    cve: "CVE-2020-11022 / CVE-2020-11023",
    note: "XSS via manipulação de HTML no jQuery.",
  },
  {
    ecosystem: "npm",
    name: "axios",
    belowVersion: "1.7.4",
    cve: "CVE-2024-39338",
    note: "SSRF via redirecionamento não sanitizado.",
  },
  {
    ecosystem: "npm",
    name: "express",
    belowVersion: "4.20.0",
    cve: "CVE-2024-29041",
    note: "Open redirect em respostas malformadas.",
  },
  {
    ecosystem: "npm",
    name: "jsonwebtoken",
    belowVersion: "9.0.0",
    cve: "CVE-2022-23529 / CVE-2022-23540",
    note: "Falsificação de token via confusão de algoritmo/segredo fraco.",
  },
  {
    ecosystem: "npm",
    name: "minimist",
    belowVersion: "1.2.6",
    cve: "CVE-2021-44906",
    note: "Poluição de protótipo.",
  },
  // ---- pip ----
  {
    ecosystem: "pip",
    name: "django",
    belowVersion: "4.2.16",
    cve: "CVE-2024-45230 / CVE-2024-45231",
    note: "DoS e vazamento de informação em fluxos de reset de senha.",
  },
  {
    ecosystem: "pip",
    name: "flask",
    belowVersion: "2.3.2",
    cve: "CVE-2023-30861",
    note: "Vazamento de cookie de sessão em certas configurações de cache.",
  },
  {
    ecosystem: "pip",
    name: "requests",
    belowVersion: "2.32.0",
    cve: "CVE-2024-35195",
    note: "Verificação de certificado SSL não persiste entre requisições da mesma sessão.",
  },
  {
    ecosystem: "pip",
    name: "pyyaml",
    belowVersion: "5.4",
    cve: "CVE-2020-14343",
    note: "Execução arbitrária de código via yaml.load sem Loader seguro.",
  },
  {
    ecosystem: "pip",
    name: "pillow",
    belowVersion: "10.3.0",
    cve: "CVE-2024-28219",
    note: "Buffer overflow no processamento de imagem.",
  },
  {
    ecosystem: "npm",
    name: "vite",
    belowVersion: "5.4.12",
    cve: "CVE-2025-30208",
    note: "Bypass de restrição de arquivo no servidor de dev — expõe arquivos fora da raiz do projeto.",
  },
  {
    ecosystem: "npm",
    name: "ws",
    belowVersion: "8.17.1",
    cve: "CVE-2024-37890",
    note: "Negação de serviço via requisição de handshake malformada.",
  },
  {
    ecosystem: "npm",
    name: "semver",
    belowVersion: "7.5.2",
    cve: "CVE-2022-25883",
    note: "ReDoS (negação de serviço) no parser de versão.",
  },
  // ---- pip (continuação) ----
  {
    ecosystem: "pip",
    name: "urllib3",
    belowVersion: "2.2.2",
    cve: "CVE-2024-37891",
    note: "Vazamento de credenciais de proxy em redirecionamento cross-origin.",
  },
  {
    ecosystem: "pip",
    name: "cryptography",
    belowVersion: "42.0.4",
    cve: "CVE-2024-26130",
    note: "NULL pointer dereference (DoS) ao processar certos PKCS#12.",
  },
  {
    ecosystem: "pip",
    name: "jinja2",
    belowVersion: "3.1.5",
    cve: "CVE-2024-56201",
    note: "Sandbox escape possibilitando execução de código via template malicioso.",
  },
  // ---- ruby (gemfile) ----
  {
    ecosystem: "bundler",
    name: "rails",
    belowVersion: "7.0.8.4",
    cve: "CVE-2024-26146",
    note: "ReDoS em Range header do ActionDispatch.",
  },
  {
    ecosystem: "bundler",
    name: "nokogiri",
    belowVersion: "1.16.5",
    cve: "CVE-2024-34459",
    note: "Uso de libxml2 vulnerável vendorizado — múltiplos CVEs de parsing XML.",
  },
  // ---- outros ecossistemas comuns ----
  {
    ecosystem: "composer",
    name: "guzzlehttp/guzzle",
    belowVersion: "7.4.5",
    cve: "CVE-2022-29248",
    note: "Vazamento de header de autorização em redirecionamento cross-domain.",
  },
  {
    ecosystem: "composer",
    name: "laravel/framework",
    belowVersion: "10.48.29",
    cve: "CVE-2024-52301",
    note: "Bypass de proteção de argumento via variável de ambiente X-Forwarded.",
  },
  {
    ecosystem: "maven",
    name: "org.apache.logging.log4j:log4j-core",
    belowVersion: "2.17.1",
    cve: "CVE-2021-44228 (Log4Shell)",
    note: "Execução remota de código via JNDI lookup — uma das vulnerabilidades mais críticas já divulgadas.",
  },
  {
    ecosystem: "maven",
    name: "org.springframework:spring-core",
    belowVersion: "5.3.39",
    cve: "CVE-2024-38820",
    note: "Bypass de restrição de padrão de path em determinadas condições de comparação.",
  },
  {
    ecosystem: "go",
    name: "golang.org/x/net",
    belowVersion: "0.23.0",
    cve: "CVE-2023-45288",
    note: "Consumo excessivo de memória ao decodificar HTTP/2 HPACK malformado (DoS).",
  },
];

/** Compara versões "1.2.3" — negativo se a < b. Tolerante a sufixos (ex.: "1.2.3-beta"). */
export function compareSemverLike(a: string, b: string): number {
  const clean = (v: string) => v.replace(/^[^0-9]*/, "").split(/[-+]/)[0]!;
  const pa = clean(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = clean(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
