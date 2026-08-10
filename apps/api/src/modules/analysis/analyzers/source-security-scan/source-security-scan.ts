import { AnalysisCategory, Severity, type DetectedIssue } from "@qa-ai/shared";
import { prisma } from "../../../../infrastructure/database/prisma.js";
import { decryptSecret } from "../../../../infrastructure/crypto/secret-box.js";
import {
  detectManifest,
  extractDependencies,
} from "../../../upgrade/manifest-detector.js";
import { issue } from "../helpers.js";
import { looksLikePlaceholder, SECRET_PATTERNS } from "./secret-patterns.js";
import { INSECURE_PATTERNS } from "./insecure-patterns.js";
import { DOCKERFILE_PATTERNS, isDockerfilePath } from "./dockerfile-patterns.js";
import {
  compareSemverLike,
  KNOWN_VULNERABLE_PACKAGES,
} from "./vulnerable-packages.js";

/**
 * Análise de Segurança via GitHub (SOURCE_SECURITY_SCAN) — opt-in, só roda
 * se o projeto tiver uma conexão GITHUB ativa (não há como escanear um
 * repositório sem token). Diferente de `SiteAnalyzer`/`PageAnalyzer`, precisa
 * de `organizationId`/`projectId` para achar a conexão — por isso não
 * implementa nenhuma das duas interfaces e é chamado diretamente pelo
 * engine (ver engine.ts) depois do crawl normal.
 *
 * Só leitura: nunca escreve nada no repositório. Três checagens:
 * 1. Segredos commitados (chaves de API, tokens, blocos de chave privada).
 * 2. Dependências com CVE conhecida via manifesto real do repo (não runtime).
 * 3. Padrões de código inseguro (eval, SQL concatenado, CORS coringa etc.).
 */

const API_BASE = "https://api.github.com";

const IGNORED_PATH_SEGMENTS = [
  "node_modules",
  "vendor",
  "bower_components",
  ".venv",
  "venv",
  "site-packages",
  "dist",
  "build",
  "target",
  "bin",
  "obj",
  ".git",
  ".gradle",
  "__pycache__",
  "testdata",
  "fixtures",
  ".next",
  "coverage",
];

/** Extensões tratadas como código-fonte de verdade — evita ruído em binário/imagem/lockfile gigante. */
const CODE_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rb",
  ".php",
  ".java",
  ".go",
  ".cs",
  ".env",
  ".env.example",
  ".yml",
  ".yaml",
  ".json",
  ".toml",
];

export const MANIFEST_FILE_NAMES = new Set([
  "package.json",
  "requirements.txt",
  "pipfile",
  "pyproject.toml",
  "gemfile",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "go.mod",
  "composer.json",
  "cargo.toml",
]);

/** Teto de arquivos lidos e escaneados — protege contra repositório gigante consumir a chamada inteira. */
const MAX_FILES_SCANNED = 120;
/** Teto de tamanho por arquivo lido — evita baixar um bundle gerado de vários MB pra escanear texto. */
const MAX_FILE_SIZE_BYTES = 300_000;

interface TreeEntry {
  path: string;
  type: string;
  size?: number;
}

export async function runSourceSecurityScan(
  organizationId: string,
  projectId: string,
): Promise<DetectedIssue[]> {
  const connection = await prisma.adapterConnection.findFirst({
    where: { projectId, organizationId, kind: "GITHUB" },
  });

  if (!connection || !connection.credentialEncrypted) {
    return [
      issue({
        title: "Análise de Segurança via GitHub — conexão necessária",
        description:
          "Esta categoria lê o código-fonte do repositório para procurar segredos commitados, dependências com CVE conhecida e padrões de código inseguro. Conecte o projeto ao GitHub em Aplicação → Conexões e integrações para habilitá-la.",
        category: AnalysisCategory.SOURCE_SECURITY_SCAN,
        severity: Severity.INFO,
        fingerprintExtra: ["github-connection-required"],
      }),
    ];
  }

  const config = connection.config as { owner?: string; repo?: string } | null;
  if (!config?.owner || !config?.repo) {
    return [
      issue({
        title: "Análise de Segurança via GitHub — conexão incompleta",
        description:
          "A conexão GitHub deste projeto está sem owner/repo configurado corretamente. Revise em Aplicação → Conexões e integrações.",
        category: AnalysisCategory.SOURCE_SECURITY_SCAN,
        severity: Severity.INFO,
        fingerprintExtra: ["github-connection-incomplete"],
      }),
    ];
  }

  let token: string;
  try {
    token = decryptSecret(connection.credentialEncrypted);
  } catch {
    return [
      issue({
        title: "Análise de Segurança via GitHub — token ilegível",
        description:
          "Não foi possível decriptar o token salvo desta conexão GitHub. Reconecte o projeto em Aplicação → Conexões e integrações.",
        category: AnalysisCategory.SOURCE_SECURITY_SCAN,
        severity: Severity.INFO,
        fingerprintExtra: ["github-token-undecryptable"],
      }),
    ];
  }

  const { owner, repo } = config;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  try {
    const repoRes = await fetch(`${API_BASE}/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      return [
        issue({
          title: "Análise de Segurança via GitHub — repositório inacessível",
          description: `Não foi possível ler ${owner}/${repo} (HTTP ${repoRes.status}). Confira se o token da conexão ainda é válido e tem acesso de leitura ao repositório.`,
          category: AnalysisCategory.SOURCE_SECURITY_SCAN,
          severity: Severity.INFO,
          fingerprintExtra: ["github-repo-unreachable"],
        }),
      ];
    }
    const branch =
      ((await repoRes.json()) as { default_branch?: string }).default_branch ?? "main";

    const treeRes = await fetch(
      `${API_BASE}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      { headers },
    );
    if (!treeRes.ok) {
      return [
        issue({
          title: "Análise de Segurança via GitHub — falha ao listar arquivos",
          description: `Não foi possível listar os arquivos de ${owner}/${repo}@${branch} (HTTP ${treeRes.status}).`,
          category: AnalysisCategory.SOURCE_SECURITY_SCAN,
          severity: Severity.INFO,
          fingerprintExtra: ["github-tree-unreachable"],
        }),
      ];
    }
    const tree = (await treeRes.json()) as { tree?: TreeEntry[] };

    const candidates = (tree.tree ?? [])
      .filter((e) => e.type === "blob")
      .filter((e) => !isIgnoredPath(e.path))
      .filter((e) => hasScannableExtension(e.path))
      .filter((e) => (e.size ?? 0) <= MAX_FILE_SIZE_BYTES)
      .sort((a, b) => a.path.split("/").length - b.path.split("/").length);

    const selected = candidates.slice(0, MAX_FILES_SCANNED);
    const skippedCount = candidates.length - selected.length;

    const issues: DetectedIssue[] = [];
    const secretHits = new Map<string, { count: number; sampleFile: string }>();
    const insecureHits: DetectedIssue[] = [];
    const manifestDeps: { path: string; dep: { name: string; version: string } }[] = [];

    for (const entry of selected) {
      const content = await fetchFileContent(headers, owner, repo, entry.path, branch);
      if (content === null) continue;

      const fileName = entry.path.split("/").pop() ?? entry.path;

      scanForSecrets(entry.path, content, secretHits);
      scanForInsecurePatterns(entry.path, content, insecureHits);
      if (isDockerfilePath(entry.path)) {
        scanDockerfile(entry.path, content, insecureHits);
      }

      if (MANIFEST_FILE_NAMES.has(fileName.toLowerCase())) {
        const detection = detectManifest(content, fileName);
        const deps = extractDependencies(content, detection.ecosystem);
        for (const dep of deps) manifestDeps.push({ path: entry.path, dep });
      }
    }

    for (const [key, hit] of secretHits) {
      const pattern = SECRET_PATTERNS.find((p) => p.id === key);
      issues.push(
        issue({
          title: `Segredo commitado no repositório — ${pattern?.label ?? key}`,
          description: `Encontrado ${hit.count} ocorrência(s) de um padrão compatível com "${pattern?.label ?? key}" no código-fonte, incluindo em ${hit.sampleFile}. Se for um segredo real (não um exemplo/placeholder), revogue e rotacione a credencial imediatamente — qualquer pessoa com acesso ao repositório (e ao histórico do git) pode vê-la.`,
          category: AnalysisCategory.SOURCE_SECURITY_SCAN,
          severity: Severity.CRITICAL,
          fingerprintExtra: [`secret:${key}`],
        }),
      );
    }

    issues.push(...insecureHits);

    const seenVulnKeys = new Set<string>();
    for (const { path, dep } of manifestDeps) {
      const known = KNOWN_VULNERABLE_PACKAGES.find(
        (k) => k.name.toLowerCase() === dep.name.toLowerCase(),
      );
      if (!known) continue;
      if (dep.version === "?" || !/^[0-9]/.test(dep.version.replace(/^[^0-9]*/, ""))) continue;
      if (compareSemverLike(dep.version, known.belowVersion) >= 0) continue;
      const key = `${known.ecosystem}:${known.name}`;
      if (seenVulnKeys.has(key)) continue;
      seenVulnKeys.add(key);
      issues.push(
        issue({
          title: `Dependência com CVE conhecida — ${known.name}`,
          description: `${known.name} ${dep.version} declarado em ${path} (vulnerável abaixo de ${known.belowVersion}). ${known.cve}: ${known.note} Atualize a dependência.`,
          category: AnalysisCategory.SOURCE_SECURITY_SCAN,
          severity: Severity.HIGH,
          fingerprintExtra: [`vuln-dep:${known.name}`],
        }),
      );
    }

    if (skippedCount > 0) {
      issues.push(
        issue({
          title: "Análise de Segurança via GitHub — varredura parcial",
          description: `O repositório tem mais arquivos elegíveis do que o teto de ${MAX_FILES_SCANNED} escaneados nesta execução (${skippedCount} arquivo(s) não analisado(s)). Os arquivos mais próximos da raiz do repositório têm prioridade.`,
          category: AnalysisCategory.SOURCE_SECURITY_SCAN,
          severity: Severity.INFO,
          fingerprintExtra: ["scan-truncated"],
        }),
      );
    }

    return issues;
  } catch (err) {
    return [
      issue({
        title: "Análise de Segurança via GitHub — falha inesperada",
        description: `A varredura do repositório falhou: ${err instanceof Error ? err.message : String(err)}`,
        category: AnalysisCategory.SOURCE_SECURITY_SCAN,
        severity: Severity.INFO,
        fingerprintExtra: ["scan-error"],
      }),
    ];
  }
}

function isIgnoredPath(path: string): boolean {
  const segments = path.toLowerCase().split("/");
  return segments.some((s) => IGNORED_PATH_SEGMENTS.includes(s));
}

function hasScannableExtension(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    CODE_EXTENSIONS.some((ext) => lower.endsWith(ext)) ||
    MANIFEST_FILE_NAMES.has(lower.split("/").pop() ?? "") ||
    isDockerfilePath(path)
  );
}

async function fetchFileContent(
  headers: Record<string, string>,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${API_BASE}/repos/${owner}/${repo}/contents/${path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}?ref=${encodeURIComponent(branch)}`,
      { headers },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: string; encoding?: string };
    if (!data.content) return null;
    if (data.encoding && data.encoding !== "base64") return null;
    return Buffer.from(data.content, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export function scanForSecrets(
  path: string,
  content: string,
  hits: Map<string, { count: number; sampleFile: string }>,
): void {
  for (const pattern of SECRET_PATTERNS) {
    const matches = content.match(pattern.regex);
    if (!matches) continue;
    const real = matches.filter((m) => !looksLikePlaceholder(m));
    if (real.length === 0) continue;
    const existing = hits.get(pattern.id);
    if (existing) {
      existing.count += real.length;
    } else {
      hits.set(pattern.id, { count: real.length, sampleFile: path });
    }
  }
}

export function scanDockerfile(
  path: string,
  content: string,
  out: DetectedIssue[],
): void {
  for (const pattern of DOCKERFILE_PATTERNS) {
    if (!pattern.test(content)) continue;
    out.push(
      issue({
        title: `Dockerfile inseguro — ${pattern.label}`,
        description: `${pattern.description} Encontrado em ${path}.`,
        category: AnalysisCategory.SOURCE_SECURITY_SCAN,
        severity:
          pattern.severity === "CRITICAL"
            ? Severity.CRITICAL
            : pattern.severity === "HIGH"
              ? Severity.HIGH
              : pattern.severity === "MEDIUM"
                ? Severity.MEDIUM
                : Severity.LOW,
        fingerprintExtra: [`dockerfile:${pattern.id}:${path}`],
      }),
    );
  }
}

export function scanForInsecurePatterns(
  path: string,
  content: string,
  out: DetectedIssue[],
): void {
  // Padrões de código inseguro só fazem sentido em arquivo de código de
  // verdade — .env/.json/.yaml não têm essas construções.
  if (!/\.(js|jsx|ts|tsx|mjs|cjs|py|rb|php|java|go|cs)$/.test(path)) return;

  for (const pattern of INSECURE_PATTERNS) {
    if (!pattern.regex.test(content)) continue;
    pattern.regex.lastIndex = 0;
    out.push(
      issue({
        title: `Código inseguro — ${pattern.label}`,
        description: `${pattern.description} Encontrado em ${path}.`,
        category: AnalysisCategory.SOURCE_SECURITY_SCAN,
        severity:
          pattern.severity === "CRITICAL"
            ? Severity.CRITICAL
            : pattern.severity === "HIGH"
              ? Severity.HIGH
              : Severity.MEDIUM,
        fingerprintExtra: [`insecure:${pattern.id}:${path}`],
      }),
    );
  }
}
