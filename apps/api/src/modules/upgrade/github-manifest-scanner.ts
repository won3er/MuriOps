import type { UpgradeEcosystem } from "@qa-ai/shared";
import { detectManifest } from "./manifest-detector.js";

/**
 * Varre um repositório do GitHub procurando manifestos de dependência de
 * qualquer ecossistema suportado — é o que permite "investigar as
 * atualizações necessárias do projeto pelo GitHub" em vez de o usuário colar
 * arquivo por arquivo.
 *
 * Pensado pra projeto poliglota: um mesmo repo pode ter `package.json` no
 * front, `requirements.txt` num serviço Python, `pom.xml` num serviço Java e
 * um `.csproj` legado — todos entram no mesmo plano, cada item sabendo de
 * qual manifesto veio.
 *
 * Só leitura: usa a API oficial do GitHub com o token da conexão do projeto.
 */

const API_BASE = "https://api.github.com";

/** Diretórios de dependência instalada/artefato — manifesto ali dentro não é do projeto. */
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
];

/**
 * Teto de manifestos analisados. Cada manifesto vira uma chamada de IA — sem
 * teto, um monorepo grande consumiria a chave do usuário sem ele perceber.
 * Os que passarem do teto são reportados em `skipped`, não silenciados.
 */
export const MAX_MANIFESTS = 8;

export interface FoundManifest {
  /** Caminho completo no repositório (ex.: "services/api/pom.xml"). */
  path: string;
  fileName: string;
  ecosystem: UpgradeEcosystem;
  content: string;
}

export interface ScanResult {
  owner: string;
  repo: string;
  branch: string;
  manifests: FoundManifest[];
  /** Manifestos encontrados mas não analisados (acima do teto). */
  skipped: string[];
  /** true = a árvore do repo é grande demais e veio cortada pela API. */
  treeTruncated: boolean;
  /** Sinais de prontidão pra atualização com segurança — ver readiness em upgrade-prompt.ts. */
  readinessSignals: RepoReadinessSignals;
}

/** Mesma forma de RepoReadinessSignals em upgrade-prompt.ts — duplicado aqui pra não criar
 * dependência circular entre módulos de camadas diferentes (application/ai vs modules/upgrade). */
export interface RepoReadinessSignals {
  hasTestDirectoryOrFiles: boolean;
  hasCiConfig: boolean;
  hasLockfile: boolean;
  sampleTestPaths: string[];
  sampleCiPaths: string[];
}

const CI_FILE_PATHS = new Set([
  ".gitlab-ci.yml",
  ".circleci/config.yml",
  "azure-pipelines.yml",
  "jenkinsfile",
  ".travis.yml",
  "bitbucket-pipelines.yml",
]);

const LOCKFILE_NAMES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "poetry.lock",
  "gemfile.lock",
  "go.sum",
  "composer.lock",
  "cargo.lock",
]);

const TEST_DIR_NAMES = new Set(["test", "tests", "spec", "specs", "__tests__"]);

function isTestPath(path: string): boolean {
  const segments = path.toLowerCase().split("/");
  if (segments.some((s) => TEST_DIR_NAMES.has(s))) return true;
  const fileName = segments[segments.length - 1] ?? "";
  return (
    fileName.includes(".test.") ||
    fileName.includes(".spec.") ||
    fileName.startsWith("test_") ||
    fileName.endsWith("_test.py") ||
    fileName.endsWith("_test.go")
  );
}

function isCiPath(path: string): boolean {
  const lower = path.toLowerCase();
  if (lower.startsWith(".github/workflows/")) return true;
  return CI_FILE_PATHS.has(lower);
}

/** Só olha os caminhos já baixados na listagem da árvore — sem chamada de API extra. */
function detectReadinessSignals(entries: TreeEntry[]): RepoReadinessSignals {
  const testPaths = entries.filter((e) => e.type === "blob" && isTestPath(e.path)).map((e) => e.path);
  const ciPaths = entries.filter((e) => e.type === "blob" && isCiPath(e.path)).map((e) => e.path);
  const hasLockfile = entries.some(
    (e) => e.type === "blob" && LOCKFILE_NAMES.has((e.path.split("/").pop() ?? "").toLowerCase()),
  );
  return {
    hasTestDirectoryOrFiles: testPaths.length > 0,
    hasCiConfig: ciPaths.length > 0,
    hasLockfile,
    sampleTestPaths: testPaths.slice(0, 5),
    sampleCiPaths: ciPaths.slice(0, 5),
  };
}

export class GithubScanError extends Error {
  readonly statusCode = 502;
}

interface TreeEntry {
  path: string;
  type: string;
  size?: number;
}

/** Nome de arquivo é manifesto conhecido? (só o basename, sem o caminho) */
function isManifestFileName(fileName: string): boolean {
  const f = fileName.toLowerCase();
  return (
    f === "package.json" ||
    f === "requirements.txt" ||
    (f.startsWith("requirements") && f.endsWith(".txt")) ||
    f === "pipfile" ||
    f === "pyproject.toml" ||
    f === "gemfile" ||
    f.endsWith(".gemspec") ||
    f === "pom.xml" ||
    f === "build.gradle" ||
    f === "build.gradle.kts" ||
    f === "libs.versions.toml" ||
    f === "go.mod" ||
    f.endsWith(".csproj") ||
    f.endsWith(".vbproj") ||
    f.endsWith(".fsproj") ||
    f === "packages.config" ||
    f === "directory.packages.props" ||
    f === "composer.json" ||
    f === "cargo.toml"
  );
}

function isIgnoredPath(path: string): boolean {
  const segments = path.toLowerCase().split("/");
  // Ignora só se o segmento for exatamente um dos diretórios de artefato —
  // comparar por "includes" pegaria caminhos legítimos (ex.: "src/binder/").
  return segments.some((s) => IGNORED_PATH_SEGMENTS.includes(s));
}

/**
 * Ordena por relevância: manifesto na raiz vem antes dos aninhados, e mais
 * raso antes de mais fundo — assim, quando o teto corta, o que sobra é a
 * periferia do projeto, não o manifesto principal.
 */
function byRelevance(a: TreeEntry, b: TreeEntry): number {
  const depthA = a.path.split("/").length;
  const depthB = b.path.split("/").length;
  if (depthA !== depthB) return depthA - depthB;
  return a.path.localeCompare(b.path);
}

export async function scanGithubManifests(
  token: string,
  owner: string,
  repo: string,
): Promise<ScanResult> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const repoRes = await fetch(`${API_BASE}/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    const guidance =
      repoRes.status === 404
        ? "No GitHub, 404 também é retornado para repositórios privados sem acesso. Abra Aplicações → Conexões e integrações, confira owner/repo e salve um novo token com acesso de leitura a este repositório."
        : "Confira se o token da conexão do GitHub ainda é válido e tem acesso a ele.";
    throw new GithubScanError(
      `Não foi possível ler o repositório ${owner}/${repo} (${repoRes.status}). ${guidance}`,
    );
  }
  const branch = ((await repoRes.json()) as { default_branch?: string }).default_branch ?? "main";

  const treeRes = await fetch(
    `${API_BASE}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers },
  );
  if (!treeRes.ok) {
    throw new GithubScanError(
      `Não foi possível listar os arquivos de ${owner}/${repo}@${branch} (${treeRes.status}).`,
    );
  }
  const tree = (await treeRes.json()) as { tree?: TreeEntry[]; truncated?: boolean };

  const candidates = (tree.tree ?? [])
    .filter((e) => e.type === "blob")
    .filter((e) => !isIgnoredPath(e.path))
    .filter((e) => isManifestFileName(e.path.split("/").pop() ?? ""))
    .sort(byRelevance);

  const selected = candidates.slice(0, MAX_MANIFESTS);
  const skipped = candidates.slice(MAX_MANIFESTS).map((e) => e.path);

  const manifests: FoundManifest[] = [];
  for (const entry of selected) {
    const content = await fetchFileContent(headers, owner, repo, entry.path, branch);
    if (content === null) continue;
    const fileName = entry.path.split("/").pop() ?? entry.path;
    // O nome do arquivo é a pista mais confiável aqui (veio do repo, não de
    // um palpite do usuário), então a detecção acerta com confiança alta.
    const detection = detectManifest(content, fileName);
    manifests.push({
      path: entry.path,
      fileName,
      ecosystem: detection.ecosystem,
      content,
    });
  }

  return {
    owner,
    repo,
    branch,
    manifests,
    skipped,
    treeTruncated: Boolean(tree.truncated),
    readinessSignals: detectReadinessSignals(tree.tree ?? []),
  };
}

/** Busca o conteúdo de um arquivo. Devolve null (em vez de lançar) se falhar — um arquivo ilegível não pode abortar a varredura inteira. */
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
