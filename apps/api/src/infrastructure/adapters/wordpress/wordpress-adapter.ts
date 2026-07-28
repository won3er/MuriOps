import type {
  Adapter,
  AdapterApplyResult,
  AdapterCapabilityName,
  AdapterProjectState,
  RemediationItem,
} from "@qa-ai/shared";

/**
 * Adapter *push* pro WordPress. Autentica via Application Password (Usuário
 * → Perfil → Senhas de aplicativo, nativo do WP desde a 5.6 — não precisa de
 * plugin extra) e usa a REST API oficial (`/wp-json/wp/v2`).
 *
 * Mesma filosofia do GithubAdapter: `RemediationItem` só carrega instrução,
 * não um diff de código. A ação real e verificável que qualquer instalação
 * WordPress padrão suporta é criar/atualizar uma Página em rascunho com o
 * checklist — fica visível em Páginas → Todas as páginas, rastreável pelo
 * time, sem exigir migrations, plugin ou acesso a arquivo. Correções que
 * envolvem tema/plugin/código continuam exigindo o time de dev.
 */
export class WordpressAdapter implements Adapter {
  readonly kind = "WORDPRESS" as const;
  readonly mode = "push" as const;
  readonly capabilities: AdapterCapabilityName[] = ["ANALYZE", "APPLY"];

  private readonly base: string;

  constructor(
    siteUrl: string,
    private readonly username: string,
    private readonly appPassword: string,
  ) {
    this.base = siteUrl.replace(/\/+$/, "");
  }

  async analyze(): Promise<AdapterProjectState> {
    const res = await fetch(`${this.base}/wp-json`);
    if (!res.ok) {
      throw new Error(`Não foi possível ler ${this.base}/wp-json (${res.status}) — confira a URL do site.`);
    }
    const info = (await res.json()) as { name?: string; description?: string };
    return {
      summary: `Site WordPress "${info.name ?? this.base}" acessível via REST API.`,
      raw: info as unknown as Record<string, unknown>,
    };
  }

  async apply(item: RemediationItem): Promise<AdapterApplyResult> {
    const slug = `atlas-qa-${slugify(item.id)}`;
    const existing = await this.findPageBySlug(slug);

    const payload = {
      title: `MuriOps: ${item.title}`,
      slug,
      status: "draft",
      content: renderHtml(item),
    };

    const res = await fetch(
      existing ? `${this.base}/wp-json/wp/v2/pages/${existing.id}` : `${this.base}/wp-json/wp/v2/pages`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      throw new Error(`Falha ao gravar no WordPress: ${res.status} ${await res.text()}`);
    }
    const page = (await res.json()) as { id: number; link: string };

    return {
      reference: page.link,
      requiresApproval: true,
      message: `Página de rascunho criada em ${page.link} com o checklist do item — revise e publique no WordPress quando aplicado.`,
    };
  }

  private async findPageBySlug(slug: string): Promise<{ id: number } | null> {
    const res = await fetch(`${this.base}/wp-json/wp/v2/pages?slug=${slug}&status=draft,publish`, {
      headers: this.headers(),
    });
    if (!res.ok) return null;
    const pages = (await res.json()) as { id: number }[];
    return pages[0] ?? null;
  }

  private headers(): Record<string, string> {
    const token = Buffer.from(`${this.username}:${this.appPassword}`).toString("base64");
    return {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
    };
  }
}

function slugify(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "item";
}

// Achados de Segurança podem legitimamente citar um payload encontrado no
// site analisado (ex.: um <script> refletido usado como prova de um XSS) no
// meio de title/description/howTo. Sem escapar, esse texto vira HTML de
// verdade na página criada aqui — ou seja, o próprio relatório de segurança
// reintroduziria o XSS na página de rascunho do WordPress do cliente. Escapa
// tudo que vem do RemediationItem antes de montar o HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(item: RemediationItem): string {
  return [
    `<p><strong>Categoria:</strong> ${escapeHtml(item.category)} · <strong>Severidade:</strong> ${escapeHtml(item.severity)}</p>`,
    item.filePath ? `<p><strong>Local sugerido:</strong> <code>${escapeHtml(item.filePath)}</code></p>` : "",
    `<h3>Descrição</h3><p>${escapeHtml(item.description)}</p>`,
    `<h3>Como aplicar</h3><p>${escapeHtml(item.howTo)}</p>`,
    `<hr/><p><em>Criado automaticamente pelo MuriOps. Esta página é só o registro do que precisa ser feito — publicar/ajustar o WordPress em si continua manual.</em></p>`,
  ]
    .filter(Boolean)
    .join("\n");
}
