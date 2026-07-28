import { Readable } from "node:stream";
import { Client } from "basic-ftp";
import type {
  Adapter,
  AdapterApplyResult,
  AdapterCapabilityName,
  AdapterProjectState,
  RemediationItem,
} from "@qa-ai/shared";

/**
 * Adapter *push* genérico por FTP/FTPS — cobre hosts com acesso direto a
 * arquivo e sem API própria de aplicação (Hostinger, Hostgator, e qualquer
 * cPanel/hospedagem compartilhada). Credenciais são as mesmas do FTP do
 * painel de hospedagem (Hostinger: hPanel → Arquivos → Contas FTP; Hostgator:
 * cPanel → Contas FTP).
 *
 * Como não há "diff" estruturado (RemediationItem só carrega instrução),
 * aplicar aqui grava um arquivo de checklist real dentro do próprio site
 * (`<remotePath>/atlas-qa/<item>.md`) — visível por quem tem acesso ao
 * servidor, e author itativo o suficiente pra fixar em WordPress/HTML
 * estático hospedados nesses provedores. Edição de código-fonte em si
 * continua manual.
 */
export class FtpAdapter implements Adapter {
  readonly kind = "FTP" as const;
  readonly mode = "push" as const;
  readonly capabilities: AdapterCapabilityName[] = ["ANALYZE", "APPLY"];

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly user: string,
    private readonly password: string,
    private readonly secure: boolean,
    private readonly remotePath: string,
  ) {}

  async analyze(): Promise<AdapterProjectState> {
    const client = new Client();
    try {
      await client.access({
        host: this.host,
        port: this.port,
        user: this.user,
        password: this.password,
        secure: this.secure,
      });
      const list = await client.list(this.remotePath || "/");
      return {
        summary: `Conectado via FTP em ${this.host}:${this.port} — ${list.length} item(ns) em "${this.remotePath || "/"}".`,
        raw: { entries: list.map((e) => e.name) },
      };
    } finally {
      client.close();
    }
  }

  async apply(item: RemediationItem): Promise<AdapterApplyResult> {
    const client = new Client();
    try {
      await client.access({
        host: this.host,
        port: this.port,
        user: this.user,
        password: this.password,
        secure: this.secure,
      });

      const dir = joinPath(this.remotePath, "atlas-qa");
      await client.ensureDir(dir);
      // ensureDir muda o cwd remoto pro diretório criado/existente — volta à raiz configurada.
      await client.cd("/").catch(() => {});

      const fileName = `${slugify(item.id)}.md`;
      const filePath = joinPath(dir, fileName);
      const content = renderMarkdown(item);

      await client.uploadFrom(Readable.from(Buffer.from(content, "utf8")), filePath);

      return {
        reference: filePath,
        requiresApproval: true,
        message: `Checklist gravado em ${filePath} via FTP — o time de dev aplica a correção real e pode marcar o item como feito depois.`,
      };
    } finally {
      client.close();
    }
  }
}

function joinPath(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join("/")
    .replace(/\/{2,}/g, "/");
}

function slugify(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "item";
}

function renderMarkdown(item: RemediationItem): string {
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
    "_Gravado automaticamente pelo MuriOps via FTP. Este arquivo é só o registro do que precisa ser feito — editar o código-fonte real continua manual._",
  ]
    .filter(Boolean)
    .join("\n");
}
