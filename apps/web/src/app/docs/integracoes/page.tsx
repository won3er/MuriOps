import {
  Bot,
  Check,
  Code2,
  KeyRound,
  PlugZap,
  ShieldCheck,
} from "lucide-react";
import { DocsShell } from "@/components/docs-shell";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Integrações e tecnologias",
  description:
    "Conheça as integrações do MuriOps com GitHub, MCP, WordPress, Shopify e FTP.",
  alternates: { canonical: "/docs/integracoes" },
};

const CONNECTIONS = [
  {
    name: "GitHub",
    mode: "Push com aprovação",
    does: "Cria uma branch, grava o checklist em .atlas-qa/remediation e abre uma pull request.",
    limit: "Não implementa a correção de código e nunca faz merge.",
  },
  {
    name: "WordPress",
    mode: "Registro em rascunho",
    does: "Cria ou atualiza uma página em rascunho pela API REST usando Application Password.",
    limit: "Não altera tema, plugin ou arquivos do site.",
  },
  {
    name: "Shopify",
    mode: "Registro em rascunho",
    does: "Cria uma página não publicada com o checklist usando a Admin API.",
    limit: "Não altera tema, Liquid ou aplicativos.",
  },
  {
    name: "FTP/FTPS",
    mode: "Arquivo rastreável",
    does: "Grava um Markdown em atlas-qa/ no caminho remoto configurado.",
    limit: "Não edita automaticamente os arquivos existentes.",
  },
] as const;

export default function IntegracoesPage() {
  return (
    <DocsShell
      title="Integrações e tecnologias"
      description="Entenda quais dados são necessários, o que cada conexão executa e onde ainda existe uma etapa humana."
      eyebrow="Conectividade"
    >
      <section>
        <div className="mb-4 flex items-center gap-2">
          <PlugZap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Adapters de aplicação</h2>
        </div>
        <div className="divide-y overflow-hidden rounded-lg border bg-card">
          {CONNECTIONS.map((connection) => (
            <article
              key={connection.name}
              className="grid gap-3 px-5 py-5 sm:grid-cols-[140px_minmax(0,1fr)]"
            >
              <div>
                <h3 className="font-medium">{connection.name}</h3>
                <Badge className="mt-2 border-primary/30 bg-primary/10 text-primary">
                  {connection.mode}
                </Badge>
              </div>
              <div className="space-y-2 text-sm leading-6">
                <p className="flex gap-2">
                  <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>{connection.does}</span>
                </p>
                <p className="text-muted-foreground">
                  <strong className="font-medium text-foreground">
                    Limite:
                  </strong>{" "}
                  {connection.limit}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            IA e ferramentas de desenvolvimento
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-5">
            <KeyRound className="h-4 w-4 text-primary" />
            <h3 className="mt-3 font-medium">Provedor de IA da organização</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Configure uma chave de Claude, OpenAI ou Gemini. A chave é
              criptografada antes de ser armazenada no banco e usada somente
              para as operações solicitadas.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <Code2 className="h-4 w-4 text-primary" />
            <h3 className="mt-3 font-medium">MCP e ponte universal</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Codex, Claude Code, Cursor, Windsurf ou outra ferramenta pode ler
              o plano e atualizar o checklist sem usar uma chave de IA do
              MuriOps.
            </p>
          </div>
        </div>
      </section>

      <aside className="mt-10 flex gap-3 rounded-lg border border-primary/25 bg-primary/[0.06] p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">
            Princípio: credenciais sob controle
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            O MuriOps não usa uma chave compartilhada do servidor como
            fallback. Sem uma chave própria configurada, as funções de IA
            degradam para respostas determinísticas. Tokens de plataforma e
            chaves de IA devem ser revogados na origem quando você quiser
            encerrar o acesso.
          </p>
        </div>
      </aside>
    </DocsShell>
  );
}
