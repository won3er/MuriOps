import type {
  Adapter,
  AdapterApplyResult,
  AdapterCapabilityName,
  AdapterProjectState,
  RemediationItem,
} from "@qa-ai/shared";

const API_BASE = "https://api.github.com";

interface GithubRepo {
  full_name: string;
  default_branch: string;
  open_issues_count: number;
}

interface GithubPr {
  number: number;
  html_url: string;
}

/**
 * Primeiro adapter *push*: em vez de esperar uma ferramenta externa puxar o
 * plano (como MCP/ponte manual), o próprio Atlas age no GitHub. Mas
 * `RemediationItem` só carrega instrução (`howTo`), não um diff de código —
 * então "aplicar" aqui é abrir uma branch com um checklist rastreável
 * (`.muriops/remediation/<item>.md`) e uma PR referenciando o item, nunca
 * commitar a correção de código em si. A PR é o checkpoint de aprovação
 * humana da autonomia manual: este adapter nunca faz merge sozinho.
 */
export class GithubAdapter implements Adapter {
  readonly kind = "GITHUB" as const;
  readonly mode = "push" as const;
  readonly capabilities: AdapterCapabilityName[] = ["ANALYZE", "APPLY", "OBSERVE"];

  constructor(
    private readonly token: string,
    private readonly owner: string,
    private readonly repo: string,
  ) {}

  async analyze(): Promise<AdapterProjectState> {
    const repo = await this.get<GithubRepo>(`/repos/${this.owner}/${this.repo}`);
    return {
      summary: `Repositório ${repo.full_name} (branch padrão: ${repo.default_branch}), ${repo.open_issues_count} issue(s) aberta(s).`,
      raw: repo as unknown as Record<string, unknown>,
    };
  }

  async apply(item: RemediationItem): Promise<AdapterApplyResult> {
    const repo = await this.get<GithubRepo>(`/repos/${this.owner}/${this.repo}`);
    const defaultBranch = repo.default_branch;
    const baseSha = await this.getBranchSha(defaultBranch);

    const branch = `muriops/${slugify(item.id)}`;
    await this.ensureBranch(branch, baseSha);

    const path = `.muriops/remediation/${slugify(item.id)}.md`;
    await this.upsertFile(branch, path, renderChecklist(item));

    const pr = await this.findOrCreatePr(branch, defaultBranch, item);

    return {
      reference: pr.html_url,
      requiresApproval: true,
      message: `PR aberta em ${pr.html_url} — aguardando revisão e merge manual. O Atlas nunca faz merge sozinho.`,
    };
  }

  private async ensureBranch(branch: string, baseSha: string): Promise<void> {
    const res = await fetch(`${API_BASE}/repos/${this.owner}/${this.repo}/git/refs`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
    });
    // 422 = a ref já existe (Reference already exists) — reaproveita a branch.
    if (res.ok || res.status === 422) return;
    throw new Error(`Falha ao criar branch no GitHub: ${res.status} ${await res.text()}`);
  }

  private async getBranchSha(branch: string): Promise<string> {
    const ref = await this.get<{ object: { sha: string } }>(
      `/repos/${this.owner}/${this.repo}/git/ref/heads/${branch}`,
    );
    return ref.object.sha;
  }

  private async upsertFile(branch: string, path: string, content: string): Promise<void> {
    const existing = await fetch(
      `${API_BASE}/repos/${this.owner}/${this.repo}/contents/${path}?ref=${branch}`,
      { headers: this.headers() },
    );
    const sha = existing.ok ? ((await existing.json()) as { sha: string }).sha : undefined;

    const res = await fetch(`${API_BASE}/repos/${this.owner}/${this.repo}/contents/${path}`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify({
        message: `MuriOps: checklist de remediação (${path})`,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch,
        ...(sha ? { sha } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Falha ao gravar checklist no GitHub: ${res.status} ${await res.text()}`);
  }

  private async findOrCreatePr(
    branch: string,
    base: string,
    item: RemediationItem,
  ): Promise<GithubPr> {
    const existing = await this.get<GithubPr[]>(
      `/repos/${this.owner}/${this.repo}/pulls?head=${this.owner}:${branch}&state=all`,
    );
    if (existing.length > 0) return existing[0]!;

    return this.post<GithubPr>(`/repos/${this.owner}/${this.repo}/pulls`, {
      title: `MuriOps: ${item.title}`,
      head: branch,
      base,
      body: renderChecklist(item),
    });
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`GitHub GET ${path} falhou: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GitHub POST ${path} falhou: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }
}

function slugify(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "item";
}

function renderChecklist(item: RemediationItem): string {
  return [
    `# ${item.title}`,
    "",
    `**Categoria:** ${item.category} · **Severidade:** ${item.severity}`,
    item.filePath ? `**Arquivo sugerido:** \`${item.filePath}\`` : "",
    "",
    "## Descrição",
    item.description,
    "",
    "## Como aplicar",
    item.howTo,
    "",
    "---",
    "_Aberto automaticamente pelo MuriOps. Esta PR só é aplicada de verdade quando um humano revisa e faz o merge — o MuriOps nunca faz merge sozinho._",
  ]
    .filter(Boolean)
    .join("\n");
}
