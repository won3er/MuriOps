import type {
  Adapter,
  AdapterApplyResult,
  AdapterCapabilityName,
  AdapterProjectState,
  RemediationItem,
} from "@qa-ai/shared";

const API_BASE = "https://api.nuvemshop.com.br/v1";

/**
 * Adapter *push* pra Nuvemshop/Tiendanube. Autentica com o Store ID + um
 * Access Token de app privado (Painel → Meus apps → gerar app privado — o
 * mesmo mecanismo usado por integrações internas, sem precisar publicar na
 * loja de apps).
 *
 * Mesma lógica dos outros adapters de e-commerce: cria/atualiza uma Página
 * (recurso nativo `pages` da API v1) despublicada com o checklist do item —
 * visível no painel em Minha loja → Páginas. Mudanças de tema/checkout
 * continuam exigindo o dev.
 */
export class NuvemshopAdapter implements Adapter {
  readonly kind = "NUVEMSHOP" as const;
  readonly mode = "push" as const;
  readonly capabilities: AdapterCapabilityName[] = ["ANALYZE", "APPLY"];

  constructor(
    private readonly storeId: string,
    private readonly accessToken: string,
  ) {}

  async analyze(): Promise<AdapterProjectState> {
    const store = await this.get<{ name: Record<string, string>; url: string }>("/store");
    return {
      summary: `Loja Nuvemshop "${store.name?.pt ?? store.url}" acessível via API.`,
      raw: store as unknown as Record<string, unknown>,
    };
  }

  async apply(item: RemediationItem): Promise<AdapterApplyResult> {
    const title = `Atlas QA: ${item.title}`;
    const existing = await this.findPageByTitle(title);

    const body = {
      name: { pt: title, es: title, en: title },
      content: { pt: renderHtml(item), es: renderHtml(item), en: renderHtml(item) },
      published: false,
    };

    const res = await fetch(
      existing ? `${API_BASE}/${this.storeId}/pages/${existing.id}` : `${API_BASE}/${this.storeId}/pages`,
      {
        method: existing ? "PUT" : "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      throw new Error(`Falha ao gravar na Nuvemshop: ${res.status} ${await res.text()}`);
    }
    const page = (await res.json()) as { id: number };

    return {
      reference: `https://${this.storeId}.mitiendanube.com/admin/pages/${page.id}`,
      requiresApproval: true,
      message: `Página (despublicada) criada/atualizada na Nuvemshop com o checklist do item — revise no painel antes de publicar.`,
    };
  }

  private async findPageByTitle(title: string): Promise<{ id: number } | null> {
    const pages = await this.get<{ id: number; name: Record<string, string> }[]>("/pages");
    return pages.find((p) => Object.values(p.name ?? {}).includes(title)) ?? null;
  }

  private headers(): Record<string, string> {
    return {
      Authentication: `bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Atlas QA (contato@elevate-qa.app)",
    };
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}/${this.storeId}${path}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Nuvemshop GET ${path} falhou: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }
}

function renderHtml(item: RemediationItem): string {
  return [
    `<p><strong>Categoria:</strong> ${item.category} · <strong>Severidade:</strong> ${item.severity}</p>`,
    item.filePath ? `<p><strong>Local sugerido:</strong> <code>${item.filePath}</code></p>` : "",
    `<h3>Descrição</h3><p>${item.description}</p>`,
    `<h3>Como aplicar</h3><p>${item.howTo}</p>`,
    `<hr/><p><em>Criado automaticamente pelo Atlas QA. Mudanças de tema/checkout continuam exigindo o time de dev.</em></p>`,
  ]
    .filter(Boolean)
    .join("\n");
}
