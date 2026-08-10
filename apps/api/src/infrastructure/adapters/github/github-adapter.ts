import type {
  Adapter,
  AdapterApplyOptions,
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
 * plano (como MCP/ponte manual), o próprio MuriOps age no GitHub. Mas
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

  async apply(item: RemediationItem, options?: AdapterApplyOptions): Promise<AdapterApplyResult> {
    const repo = await this.get<GithubRepo>(`/repos/${this.owner}/${this.repo}`);
    const defaultBranch = repo.default_branch;
    const baseSha = await this.getBranchSha(defaultBranch);

    const branch = `muriops/${slugify(item.id)}`;
    await this.ensureBranch(branch, baseSha);

    const path = `.muriops/remediation/${slugify(item.id)}.md`;

    // Auto-Fix [10/08/2026]: tenta ANTES de escrever o checklist, pra já
    // poder mencionar no próprio checklist se a correção real foi aplicada
    // ou não. Best-effort — qualquer falha aqui não impede o checklist/PR.
    const autoFixApplied = options?.generateFix
      ? await this.tryAutoFix(branch, item, options.generateFix)
      : false;

    await this.upsertFile(branch, path, renderChecklist(item, autoFixApplied));

    const pr = await this.findOrCreatePr(branch, defaultBranch, item, autoFixApplied);

    return {
      reference: pr.html_url,
      requiresApproval: true,
      message: autoFixApplied
        ? `PR aberta em ${pr.html_url} com uma sugestão de correção real já commitada na branch — revise com atenção antes do merge. O MuriOps nunca faz merge sozinho.`
        : `PR aberta em ${pr.html_url} — aguardando revisão e merge manual. O MuriOps nunca faz merge sozinho.`,
      autoFixApplied,
    };
  }

  /**
   * Auto-Fix: só tenta corrigir um arquivo que JÁ EXISTE no repositório
   * (nunca cria arquivo novo por adivinhação da IA). Qualquer falha —
   * arquivo não encontrado, IA sem confiança, erro de rede — é engolida
   * aqui e devolve `false`; o checklist/PR sempre sai, com ou sem Auto-Fix.
   */
  private async tryAutoFix(
    branch: string,
    item: RemediationItem,
    generateFix: NonNullable<AdapterApplyOptions["generateFix"]>,
  ): Promise<boolean> {
    if (!item.filePath) return false;
    try {
      const current = await this.getFileContent(item.filePath, branch);
      if (current === null) return false;
      const fix = await generateFix(current);
      if (!fix?.newContent || fix.newContent === current) return false;
      await this.upsertFile(branch, item.filePath, fix.newContent);
      return true;
    } catch {
      return false;
    }
  }

  /** Lê o conteúdo de um arquivo do repositório numa branch/ref específica — null se não existir. */
  async getFileContent(path: string, ref: string): Promise<string | null> {
    try {
      const res = await fetch(
        `${API_BASE}/repos/${this.owner}/${this.repo}/contents/${path
          .split("/")
          .map(encodeURIComponent)
          .join("/")}?ref=${encodeURIComponent(ref)}`,
        { headers: this.headers() },
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

  /**
   * Comenta numa PR existente — usado pelo PR Security Reviews automático
   * (acionado por webhook, ver pr-review.service.ts). GitHub trata PRs como
   * Issues para fins de comentário, por isso é o endpoint `/issues/:number/comments`
   * mesmo sendo uma pull request.
   */
  async commentOnPullRequest(prNumber: number, body: string): Promise<void> {
    await this.post(`/repos/${this.owner}/${this.repo}/issues/${prNumber}/comments`, { body });
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
    autoFixApplied: boolean,
  ): Promise<GithubPr> {
    const existing = await this.get<GithubPr[]>(
      `/repos/${this.owner}/${this.repo}/pulls?head=${this.owner}:${branch}&state=all`,
    );
    if (existing.length > 0) return existing[0]!;

    return this.post<GithubPr>(`/repos/${this.owner}/${this.repo}/pulls`, {
      title: `MuriOps: ${item.title}`,
      head: branch,
      base,
      body: renderChecklist(item, autoFixApplied),
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

function renderChecklist(item: RemediationItem, autoFixApplied = false): string {
  return [
    `# ${item.title}`,
    "",
    `**Categoria:** ${item.category} · **Severidade:** ${item.severity}`,
    item.filePath ? `**Arquivo sugerido:** \`${item.filePath}\`` : "",
    "",
    autoFixApplied
      ? "🤖 **Auto-Fix:** uma sugestão de correção real foi gerada pela IA e já está commitada nesta branch (veja o diff da PR). Revise com atenção — é uma sugestão, não uma correção confirmada — antes do merge."
      : "",
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
