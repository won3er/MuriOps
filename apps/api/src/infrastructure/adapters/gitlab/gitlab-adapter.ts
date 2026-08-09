import type {
  Adapter,
  AdapterApplyResult,
  AdapterCapabilityName,
  AdapterProjectState,
  RemediationItem,
} from "@qa-ai/shared";

const API_BASE = "https://gitlab.com/api/v4";

interface GitlabProject {
  path_with_namespace: string;
  default_branch: string;
  open_issues_count: number;
  id: number;
}

interface GitlabMr {
  iid: number;
  web_url: string;
}

/**
 * Adapter GitLab — espelha exatamente `GithubAdapter` (mesmo comportamento,
 * mesma filosofia de nunca fazer merge sozinho): abre uma branch com um
 * checklist rastreável e um Merge Request referenciando o item. Autenticado
 * por Personal/Project Access Token colado pelo usuário (não OAuth) — mesmo
 * padrão do GitHub, decisão deliberada pra não depender de criar um App
 * OAuth externo.
 */
export class GitlabAdapter implements Adapter {
  readonly kind = "GITLAB" as const;
  readonly mode = "push" as const;
  readonly capabilities: AdapterCapabilityName[] = ["ANALYZE", "APPLY", "OBSERVE"];

  private readonly encodedPath: string;

  constructor(
    private readonly token: string,
    private readonly projectPath: string,
  ) {
    this.encodedPath = encodeURIComponent(projectPath);
  }

  async analyze(): Promise<AdapterProjectState> {
    const project = await this.get<GitlabProject>(`/projects/${this.encodedPath}`);
    return {
      summary: `Projeto ${project.path_with_namespace} (branch padrão: ${project.default_branch}), ${project.open_issues_count} issue(s) aberta(s).`,
      raw: project as unknown as Record<string, unknown>,
    };
  }

  async apply(item: RemediationItem): Promise<AdapterApplyResult> {
    const project = await this.get<GitlabProject>(`/projects/${this.encodedPath}`);
    const defaultBranch = project.default_branch;

    const branch = `muriops/${slugify(item.id)}`;
    await this.ensureBranch(branch, defaultBranch);

    const path = `.muriops/remediation/${slugify(item.id)}.md`;
    await this.upsertFile(branch, path, renderChecklist(item));

    const mr = await this.findOrCreateMr(branch, defaultBranch, item);

    return {
      reference: mr.web_url,
      requiresApproval: true,
      message: `Merge Request aberto em ${mr.web_url} — aguardando revisão e merge manual. O MuriOps nunca faz merge sozinho.`,
    };
  }

  private async ensureBranch(branch: string, ref: string): Promise<void> {
    const res = await fetch(
      `${API_BASE}/projects/${this.encodedPath}/repository/branches`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ branch, ref }),
      },
    );
    // 400 = a branch já existe — reaproveita.
    if (res.ok || res.status === 400) return;
    throw new Error(`Falha ao criar branch no GitLab: ${res.status} ${await res.text()}`);
  }

  private async upsertFile(branch: string, path: string, content: string): Promise<void> {
    const encodedFilePath = encodeURIComponent(path);
    const existing = await fetch(
      `${API_BASE}/projects/${this.encodedPath}/repository/files/${encodedFilePath}?ref=${branch}`,
      { headers: this.headers() },
    );

    const body = {
      branch,
      content,
      commit_message: `MuriOps: checklist de remediação (${path})`,
    };

    const method = existing.ok ? "PUT" : "POST";
    const res = await fetch(
      `${API_BASE}/projects/${this.encodedPath}/repository/files/${encodedFilePath}`,
      { method, headers: this.headers(), body: JSON.stringify(body) },
    );
    if (!res.ok) throw new Error(`Falha ao gravar checklist no GitLab: ${res.status} ${await res.text()}`);
  }

  private async findOrCreateMr(
    branch: string,
    target: string,
    item: RemediationItem,
  ): Promise<GitlabMr> {
    const existing = await this.get<GitlabMr[]>(
      `/projects/${this.encodedPath}/merge_requests?source_branch=${encodeURIComponent(branch)}&state=all`,
    );
    if (existing.length > 0) return existing[0]!;

    return this.post<GitlabMr>(`/projects/${this.encodedPath}/merge_requests`, {
      source_branch: branch,
      target_branch: target,
      title: `MuriOps: ${item.title}`,
      description: renderChecklist(item),
    });
  }

  private headers(): Record<string, string> {
    return {
      "PRIVATE-TOKEN": this.token,
      "Content-Type": "application/json",
    };
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`GitLab GET ${path} falhou: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GitLab POST ${path} falhou: ${res.status} ${await res.text()}`);
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
    "_Aberto automaticamente pelo MuriOps. Este MR só é aplicado de verdade quando um humano revisa e faz o merge — o MuriOps nunca faz merge sozinho._",
  ]
    .filter(Boolean)
    .join("\n");
}
