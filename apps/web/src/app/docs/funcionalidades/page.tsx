import { CheckCircle2, Clock3, PauseCircle } from "lucide-react";
import { DocsShell } from "@/components/docs-shell";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Status das funcionalidades",
  description:
    "Consulte o que está disponível, em evolução ou planejado no MuriOps.",
  alternates: { canonical: "/docs/funcionalidades" },
};

const GROUPS = [
  {
    title: "Analisar e planejar",
    items: [
      [
        "Análise QA padrão",
        "Disponível",
        "Crawler com verificações de UI/UX, performance, SEO, acessibilidade, console e rede.",
      ],
      [
        "Análise de Segurança",
        "Disponível",
        "Verificações aprofundadas de headers, HTTPS, CSP, TLS, DNS e exposição indevida.",
      ],
      [
        "Projetar",
        "Disponível",
        "Blueprint com arquitetura, stack, riscos, estratégia de testes, quality gates e roadmap.",
      ],
      [
        "Atualizar",
        "Disponível",
        "Plano de atualização de dependências a partir de um package.json.",
      ],
    ],
  },
  {
    title: "Aplicar e acompanhar",
    items: [
      [
        "Aplicação",
        "Disponível",
        "Transforma análises, blueprints e upgrades em checklists de remediação.",
      ],
      [
        "PDF e ponte universal",
        "Disponível",
        "Exportação para execução humana ou por uma IA de desenvolvimento.",
      ],
      [
        "Servidor MCP por projeto",
        "Disponível",
        "Permite consultar o plano e atualizar itens por protocolo MCP.",
      ],
      [
        "Orquestração Manual",
        "Disponível",
        "Executa o ciclo com checkpoints e retomada após a aplicação dos itens.",
      ],
      [
        "Orquestração Supervisionada",
        "Em desenvolvimento",
        "Prevista para aprovações explícitas entre as etapas.",
      ],
      [
        "Orquestração Autônoma",
        "Em desenvolvimento",
        "Prevista para ciclos automáticos limitados por quality gates.",
      ],
    ],
  },
  {
    title: "Conexões",
    items: [
      [
        "GitHub",
        "Disponível",
        "Cria branch, checklist rastreável e pull request; não altera o código nem faz merge.",
      ],
      [
        "WordPress",
        "Disponível",
        "Cria ou atualiza uma página em rascunho com o checklist; mudanças de tema continuam manuais.",
      ],
      [
        "Shopify",
        "Disponível",
        "Cria uma página não publicada com o checklist; não edita tema ou Liquid.",
      ],
      [
        "FTP/FTPS",
        "Disponível",
        "Grava um arquivo Markdown no servidor; não modifica automaticamente o código existente.",
      ],
      [
        "Wix, Squarespace e Webnode",
        "Adiado",
        "Sem adapter de aplicação real; reconsiderar apenas se houver uma API adequada.",
      ],
    ],
  },
] as const;

const STATUS = {
  Disponível: {
    icon: CheckCircle2,
    className: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  },
  "Em desenvolvimento": {
    icon: Clock3,
    className: "border-sky-500/35 bg-sky-500/10 text-sky-300",
  },
  Adiado: {
    icon: PauseCircle,
    className: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  },
};

export default function FuncionalidadesPage() {
  return (
    <DocsShell
      title="Status das funcionalidades"
      description="Uma visão honesta do que pode ser usado hoje, do que ainda está em desenvolvimento e dos limites de cada integração."
      eyebrow="Produto"
    >
      <div className="mb-8 flex flex-wrap gap-2">
        {Object.entries(STATUS).map(([label, config]) => (
          <Badge key={label} className={config.className}>
            <config.icon className="h-3 w-3" /> {label}
          </Badge>
        ))}
      </div>

      <div className="space-y-10">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 text-lg font-semibold">{group.title}</h2>
            <div className="divide-y overflow-hidden rounded-lg border bg-card">
              {group.items.map(([name, status, description]) => {
                const config = STATUS[status];
                return (
                  <div
                    key={name}
                    className="grid gap-2 px-4 py-4 sm:grid-cols-[200px_minmax(0,1fr)_auto] sm:items-start"
                  >
                    <h3 className="text-sm font-medium">{name}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                    <Badge className={config.className}>
                      <config.icon className="h-3 w-3" /> {status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </DocsShell>
  );
}
