import { ArrowRight, Check, CircleAlert } from "lucide-react";
import Link from "next/link";
import { DocsShell } from "@/components/docs-shell";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Guia de uso",
  description:
    "Aprenda a cadastrar projetos, executar análises e transformar achados em aplicações.",
  alternates: { canonical: "/docs/guia" },
};

const STEPS = [
  {
    number: "01",
    title: "Cadastre o projeto",
    description:
      "Em Projetos, informe um nome e a URL pública que será analisada.",
    items: [
      "Use uma URL que você administra ou tem autorização para testar.",
      "Confirme que o site pode ser acessado sem uma sessão privada.",
      "O projeto será o contexto para análises, aplicações e orquestrações.",
    ],
  },
  {
    number: "02",
    title: "Execute uma análise",
    description: "Em Análises, escolha o projeto e o tipo de verificação.",
    items: [
      "Análise QA padrão cobre UI/UX, performance, SEO, acessibilidade, console e rede.",
      "Análise de Segurança executa verificações específicas de segurança.",
      "Aguarde a conclusão antes de comparar scores ou criar uma aplicação.",
    ],
  },
  {
    number: "03",
    title: "Revise os achados",
    description: "Abra o relatório e avalie prioridade, evidências e contexto.",
    items: [
      "Scores ajudam a observar tendência; não substituem a revisão dos achados.",
      "Problemas podem ser filtrados por categoria, severidade e status.",
      "Revise recomendações de IA antes de aplicá-las em produção.",
    ],
  },
  {
    number: "04",
    title: "Envie para Aplicação",
    description: "Converta a análise concluída em um checklist de remediação.",
    items: [
      "Baixe o plano em PDF para execução manual.",
      "Use a ponte universal ou MCP com sua ferramenta de desenvolvimento.",
      "Conecte uma plataforma apenas depois de entender o que o adapter realmente grava.",
    ],
  },
  {
    number: "05",
    title: "Reanalise e acompanhe",
    description: "Meça o resultado das mudanças e continue o ciclo.",
    items: [
      "Na autonomia Manual, você mantém o controle dos checkpoints.",
      "A orquestração pode retomar quando os itens da ponte forem concluídos.",
      "Modos Supervisionado e Autônomo ainda não estão disponíveis.",
    ],
  },
];

export default function GuiaPage() {
  return (
    <DocsShell
      title="Guia de uso"
      description="O caminho recomendado para sair de uma URL cadastrada até um ciclo mensurável de melhoria."
      eyebrow="Primeiros passos"
    >
      <aside className="mb-9 flex gap-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-4">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-sm leading-6 text-muted-foreground">
          Algumas integrações registram um checklist ou rascunho na plataforma
          conectada. Isso cria rastreabilidade, mas não significa que o código
          do site foi corrigido.
        </p>
      </aside>

      <ol className="space-y-8">
        {STEPS.map((step) => (
          <li
            key={step.number}
            className="grid gap-4 sm:grid-cols-[52px_minmax(0,1fr)]"
          >
            <span className="tabular text-sm font-semibold text-primary">
              {step.number}
            </span>
            <div className="border-b pb-8">
              <h2 className="text-xl font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
              <ul className="mt-4 space-y-2.5">
                {step.items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-6">
                    <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link href="/register">
          <Button>
            Criar conta <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/docs/integracoes">
          <Button variant="outline">Comparar integrações</Button>
        </Link>
      </div>
    </DocsShell>
  );
}
