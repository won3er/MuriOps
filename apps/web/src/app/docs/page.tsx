import {
  ArrowRight,
  Cable,
  FileSearch,
  GitBranch,
  ListChecks,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { DocsShell } from "@/components/docs-shell";

export const metadata = {
  title: "Documentação",
  description:
    "Entenda o fluxo do Elevate QA, consulte funcionalidades e configure integrações.",
  alternates: { canonical: "/docs" },
};

const SECTIONS = [
  {
    href: "/docs/guia",
    icon: FileSearch,
    title: "Comece pelo fluxo principal",
    description:
      "Cadastre um projeto, execute uma análise e transforme os achados em um plano aplicável.",
    action: "Abrir guia de uso",
  },
  {
    href: "/docs/funcionalidades",
    icon: ListChecks,
    title: "Entenda o que está disponível",
    description:
      "Consulte o estágio real de cada módulo e o limite atual das automações.",
    action: "Ver funcionalidades",
  },
  {
    href: "/docs/integracoes",
    icon: Cable,
    title: "Escolha como aplicar",
    description:
      "Compare GitHub, MCP, WordPress, Shopify e FTP antes de conectar credenciais.",
    action: "Explorar integrações",
  },
];

export default function DocsPage() {
  return (
    <DocsShell
      title="Documentação do Elevate QA"
      description="Aprenda a operar o ciclo de qualidade, entenda o papel de cada módulo e saiba exatamente o que cada integração faz."
    >
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: FileSearch,
            label: "Analisar",
            text: "Encontre e priorize problemas.",
          },
          {
            icon: Wrench,
            label: "Aplicar",
            text: "Transforme achados em trabalho.",
          },
          {
            icon: GitBranch,
            label: "Orquestrar",
            text: "Repita o ciclo com controle.",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-4">
            <item.icon className="h-4 w-4 text-primary" />
            <h2 className="mt-3 text-sm font-semibold">{item.label}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {item.text}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Encontre sua resposta</h2>
        <div className="mt-4 divide-y overflow-hidden rounded-lg border bg-card">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group flex gap-4 px-5 py-5 hover:bg-accent/40"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border bg-muted">
                <section.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium group-hover:text-primary">
                  {section.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {section.description}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                  {section.action} <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <aside className="mt-10 rounded-lg border border-primary/25 bg-primary/[0.06] p-5">
        <h2 className="text-sm font-semibold">Antes de começar</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          O crawler funciona sem uma chave de IA. Para interpretações,
          blueprints e planos gerados por IA, configure sua própria chave em{" "}
          <strong className="text-foreground">Configurações</strong>. Sem ela, o
          sistema usa respostas determinísticas e não chama um provedor externo.
        </p>
      </aside>
    </DocsShell>
  );
}
