import type { DetectedIssue } from "@qa-ai/shared";
import {
  detectManifest,
  extractDependencies,
} from "../upgrade/manifest-detector.js";
import { SECRET_PATTERNS } from "../analysis/analyzers/source-security-scan/secret-patterns.js";
import {
  MANIFEST_FILE_NAMES,
  scanDockerfile,
  scanForInsecurePatterns,
  scanForSecrets,
} from "../analysis/analyzers/source-security-scan/source-security-scan.js";
import { isDockerfilePath } from "../analysis/analyzers/source-security-scan/dockerfile-patterns.js";
import {
  compareSemverLike,
  KNOWN_VULNERABLE_PACKAGES,
} from "../analysis/analyzers/source-security-scan/vulnerable-packages.js";

/**
 * "PR Security Reviews automático" — deliberadamente separado de
 * `source-security-scan.ts` (SOURCE_SECURITY_SCAN, categoria de Análise que
 * escaneia o repositório inteiro na branch padrão). Este módulo escaneia só
 * os arquivos ALTERADOS de uma PR/MR específica — mais rápido, mais barato,
 * e o resultado (comentário na própria PR/MR) só faz sentido no contexto do
 * que mudou, não do repositório inteiro. Reaproveita as mesmas heurísticas
 * (segredo/código inseguro/Dockerfile/dependência vulnerável) exportadas de
 * `source-security-scan.ts` — a lista de padrões é a mesma fonte da verdade
 * dos dois caminhos, evita duplicar/divergir regras entre eles.
 */

const API_BASE_GITHUB = "https://api.github.com";
const API_BASE_GITLAB = "https://gitlab.com/api/v4";

/** PRs costumam ser bem menores que o repositório inteiro — teto generoso o bastante pra não truncar o caso comum. */
const MAX_PR_FILES = 40;
const MAX_FILE_SIZE_BYTES = 300_000;

const CODE_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
  ".py", ".rb", ".php", ".java", ".go", ".cs",
  ".env", ".env.example", ".yml", ".yaml", ".json", ".toml",
];

function hasScannableExtension(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    CODE_EXTENSIONS.some((ext) => lower.endsWith(ext)) ||
    MANIFEST_FILE_NAMES.has(lower.split("/").pop() ?? "") ||
    isDockerfilePath(path)
  );
}

export interface PrScanResult {
  issues: DetectedIssue[];
  filesScanned: number;
  filesSkipped: number;
  filesChanged: number;
}

/** Roda as heurísticas já existentes contra um conjunto de arquivos já baixados (path+conteúdo) — núcleo comum aos dois provedores. */
function scanFiles(files: { path: string; content: string }[]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const secretHits = new Map<string, { count: number; sampleFile: string }>();
  const insecureHits: DetectedIssue[] = [];
  const manifestDeps: { path: string; dep: { name: string; version: string } }[] = [];

  for (const file of files) {
    scanForSecrets(file.path, file.content, secretHits);
    scanForInsecurePatterns(file.path, file.content, insecureHits);
    if (isDockerfilePath(file.path)) {
      scanDockerfile(file.path, file.content, insecureHits);
    }
    const fileName = file.path.split("/").pop() ?? file.path;
    if (MANIFEST_FILE_NAMES.has(fileName.toLowerCase())) {
      const detection = detectManifest(file.content, fileName);
      const deps = extractDependencies(file.content, detection.ecosystem);
      for (const dep of deps) manifestDeps.push({ path: file.path, dep });
    }
  }

  const issue = makeIssueFn();

  for (const [key, hit] of secretHits) {
    const pattern = SECRET_PATTERNS.find((p) => p.id === key);
    issues.push(
      issue({
        title: `Segredo commitado nesta PR — ${pattern?.label ?? key}`,
        description: `Encontrado ${hit.count} ocorrência(s) de um padrão compatível com "${pattern?.label ?? key}", incluindo em ${hit.sampleFile}. Se for um segredo real (não um exemplo/placeholder), revogue e rotacione a credencial imediatamente antes do merge.`,
        severity: "CRITICAL",
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
        description: `${known.name} ${dep.version} declarado em ${path} (vulnerável abaixo de ${known.belowVersion}). ${known.cve}: ${known.note}`,
        severity: "HIGH",
      }),
    );
  }

  return issues;
}

/** DetectedIssue exige category/fingerprint (desenhado pra Analysis) — aqui não persiste em Analysis nenhuma, então os campos ficam com valores neutros. */
function makeIssueFn() {
  return (params: { title: string; description: string; severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" }): DetectedIssue => ({
    title: params.title,
    description: params.description,
    category: "SOURCE_SECURITY_SCAN" as DetectedIssue["category"],
    severity: params.severity as DetectedIssue["severity"],
    pageUrl: null,
    selector: null,
    raw: null,
    stepsToReproduce: [],
    impact: null,
    suggestion: null,
    fingerprint: "",
  });
}

interface GithubPrFile {
  filename: string;
  status: string;
}

/** Escaneia os arquivos alterados de uma PR do GitHub (não o repositório inteiro). */
export async function scanGithubPullRequestFiles(
  owner: string,
  repo: string,
  token: string,
  prNumber: number,
): Promise<PrScanResult> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const prRes = await fetch(`${API_BASE_GITHUB}/repos/${owner}/${repo}/pulls/${prNumber}`, { headers });
  if (!prRes.ok) throw new Error(`Falha ao ler a PR #${prNumber}: HTTP ${prRes.status}`);
  const pr = (await prRes.json()) as { head?: { ref?: string } };
  const headRef = pr.head?.ref;
  if (!headRef) throw new Error(`PR #${prNumber} sem branch de origem (head.ref).`);

  const filesRes = await fetch(
    `${API_BASE_GITHUB}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
    { headers },
  );
  if (!filesRes.ok) throw new Error(`Falha ao listar arquivos da PR #${prNumber}: HTTP ${filesRes.status}`);
  const changedFiles = (await filesRes.json()) as GithubPrFile[];

  const eligible = changedFiles
    .filter((f) => f.status !== "removed")
    .filter((f) => hasScannableExtension(f.filename));
  const selected = eligible.slice(0, MAX_PR_FILES);

  const files: { path: string; content: string }[] = [];
  for (const f of selected) {
    const content = await fetchGithubFileContent(headers, owner, repo, f.filename, headRef);
    if (content !== null) files.push({ path: f.filename, content });
  }

  return {
    issues: scanFiles(files),
    filesScanned: files.length,
    filesSkipped: eligible.length - selected.length,
    filesChanged: changedFiles.length,
  };
}

async function fetchGithubFileContent(
  headers: Record<string, string>,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${API_BASE_GITHUB}/repos/${owner}/${repo}/contents/${path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}?ref=${encodeURIComponent(ref)}`,
      { headers },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: string; encoding?: string; size?: number };
    if (!data.content) return null;
    if (data.encoding && data.encoding !== "base64") return null;
    if ((data.size ?? 0) > MAX_FILE_SIZE_BYTES) return null;
    return Buffer.from(data.content, "base64").toString("utf8");
  } catch {
    return null;
  }
}

interface GitlabMrChange {
  new_path: string;
  deleted_file: boolean;
}

/** Escaneia os arquivos alterados de um Merge Request do GitLab (não o projeto inteiro). */
export async function scanGitlabMergeRequestFiles(
  projectPath: string,
  token: string,
  mrIid: number,
): Promise<PrScanResult> {
  const encodedPath = encodeURIComponent(projectPath);
  const headers = { "PRIVATE-TOKEN": token };

  const mrRes = await fetch(`${API_BASE_GITLAB}/projects/${encodedPath}/merge_requests/${mrIid}`, { headers });
  if (!mrRes.ok) throw new Error(`Falha ao ler o MR !${mrIid}: HTTP ${mrRes.status}`);
  const mr = (await mrRes.json()) as { source_branch?: string };
  const sourceBranch = mr.source_branch;
  if (!sourceBranch) throw new Error(`MR !${mrIid} sem branch de origem (source_branch).`);

  const changesRes = await fetch(
    `${API_BASE_GITLAB}/projects/${encodedPath}/merge_requests/${mrIid}/changes`,
    { headers },
  );
  if (!changesRes.ok) throw new Error(`Falha ao listar alterações do MR !${mrIid}: HTTP ${changesRes.status}`);
  const changesBody = (await changesRes.json()) as { changes?: GitlabMrChange[] };
  const changedFiles = changesBody.changes ?? [];

  const eligible = changedFiles
    .filter((f) => !f.deleted_file)
    .filter((f) => hasScannableExtension(f.new_path));
  const selected = eligible.slice(0, MAX_PR_FILES);

  const files: { path: string; content: string }[] = [];
  for (const f of selected) {
    const content = await fetchGitlabFileContent(headers, encodedPath, f.new_path, sourceBranch);
    if (content !== null) files.push({ path: f.new_path, content });
  }

  return {
    issues: scanFiles(files),
    filesScanned: files.length,
    filesSkipped: eligible.length - selected.length,
    filesChanged: changedFiles.length,
  };
}

async function fetchGitlabFileContent(
  headers: Record<string, string>,
  encodedProjectPath: string,
  path: string,
  ref: string,
): Promise<string | null> {
  try {
    const encodedFilePath = encodeURIComponent(path);
    const res = await fetch(
      `${API_BASE_GITLAB}/projects/${encodedProjectPath}/repository/files/${encodedFilePath}/raw?ref=${encodeURIComponent(ref)}`,
      { headers },
    );
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_FILE_SIZE_BYTES) return null;
    return Buffer.from(buf).toString("utf8");
  } catch {
    return null;
  }
}
