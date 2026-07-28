import type {
  Adapter,
  AdapterApplyResult,
  AdapterCapabilityName,
  AdapterProjectState,
  RemediationItem,
} from "@qa-ai/shared";

const API_VERSION = "2024-10";

/**
 * Adapter *push* pra Shopify. Autentica com um Admin API access token de
 * app customizado (Configurações → Apps e canais de vendas → Desenvolver
 * apps → Admin API access token — não precisa publicar na App Store).
 *
 * Mesma lógica do WordpressAdapter: a ação real e genérica que qualquer loja
 * Shopify suporta nativamente é criar/atualizar uma Page (recurso "pages" da
 * Admin REST API) em rascunho com o checklist do item, visível em Online
 * Store → Pages. Mudanças de tema/liquid/app continuam exigindo o dev.
 */
export class ShopifyAdapter implements Adapter {
  readonly kind = "SHOPIFY" as const;
  readonly mode = "push" as const;
  readonly capabilities: AdapterCapabilityName[] = ["ANALYZE", "APPLY"];

  private readonly base: string;

  constructor(
    shopDomain: string,
    private readonly accessToken: string,
  ) {
    const host = shopDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    this.base = `https://${host}/admin/api/${API_VERSION}`;
  }

  async analyze(): Promise<AdapterProjectState> {
    const shop = await this.get<{ shop: { name: string; domain: string } }>("/shop.json");
    return {
      summary: `Loja Shopify "${shop.shop.name}" (${shop.shop.domain}) acessível via Admin API.`,
      raw: shop as unknown as Record<string, unknown>,
    };
  }

  async apply(item: RemediationItem): Promise<AdapterApplyResult> {
    const handle = `atlas-qa-${slugify(item.id)}`;
    const existing = await this.findPageByHandle(handle);

    const body = {
      page: {
        title: `Atlas QA: ${item.title}`,
        handle,
        body_html: renderHtml(item),
        published: false,
      },
    };

    const res = await fetch(existing ? `${this.base}/pages/${existing.id}.json` : `${this.base}/pages.json`, {
      method: existing ? "PUT" : "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Falha ao gravar na Shopify: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { page: { id: number; handle: string } };
    const reference = `${this.base.replace("/admin/api/" + API_VERSION, "")}/admin/pages/${data.page.id}`;

    return {
      reference,
      requiresApproval: true,
      message: `Página (rascunho) criada/atualizada na Shopify com o checklist do item — revise em Online Store → Pages antes de publicar.`,
    };
  }

  private async findPageByHandle(handle: string): Promise<{ id: number } | null> {
    const data = await this.get<{ pages: { id: number; handle: string }[] }>(
      `/pages.json?handle=${handle}`,
    );
    return data.pages[0] ?? null;
  }

  private headers(): Record<string, string> {
    return {
      "X-Shopify-Access-Token": this.accessToken,
      "Content-Type": "application/json",
    };
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base}${path}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Shopify GET ${path} falhou: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }
}

function slugify(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "item";
}

// Mesmo motivo do WordpressAdapter: achados de Segurança podem citar um
// payload (ex.: um <script> refletido) encontrado no site analisado dentro
// de title/description/howTo. Sem escapar, essa citação vira HTML de
// verdade em body_html — reintroduzindo o XSS na página criada na Shopify.
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
    `<hr/><p><em>Criado automaticamente pelo Atlas QA. Mudanças de tema/app continuam exigindo o time de dev.</em></p>`,
  ]
    .filter(Boolean)
    .join("\n");
}
