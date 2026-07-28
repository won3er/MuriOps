"use client";

import {
  ArrowRight,
  DraftingCompass,
  LayoutDashboard,
  RefreshCw,
  ScanSearch,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    key: "analisar",
    number: "01",
    label: "Analisar",
    icon: ScanSearch,
    eyebrow: "Diagnóstico",
    heading: "Encontre problemas com evidências, não com suposições",
    description:
      "O crawler percorre o site e reúne achados de UI/UX, performance, SEO, acessibilidade, console, rede e segurança em um relatório priorizado.",
    outcomes: [
      "Score por dimensão",
      "Evidências por achado",
      "Filtros por risco",
    ],
    image: "/screens/analisar_crop.jpg",
    width: 1568,
    height: 545,
    route: "Análises / Relatório",
    accent: "from-[#6e40c9]/55 via-[#6366f1]/22 to-[#2f81f7]/30",
    glow: "bg-[#8250df]/25",
  },
  {
    key: "projetar",
    number: "02",
    label: "Projetar",
    icon: DraftingCompass,
    eyebrow: "Planejamento",
    heading: "Leve qualidade para o projeto antes da implementação",
    description:
      "Descreva o produto e gere uma base técnica com arquitetura, estratégia de testes, riscos, quality gates e roadmap para orientar o desenvolvimento.",
    outcomes: [
      "Arquitetura e stack",
      "Matriz de riscos",
      "Estratégia de testes",
    ],
    image: "/screens/projetar_crop.jpg",
    width: 1568,
    height: 545,
    route: "Projetar / Blueprint",
    accent: "from-[#1f6feb]/45 via-[#6366f1]/20 to-[#2ea043]/24",
    glow: "bg-[#2f81f7]/20",
  },
  {
    key: "aplicar",
    number: "03",
    label: "Aplicar",
    icon: Wrench,
    eyebrow: "Execução",
    heading: "Converta recomendações em trabalho rastreável",
    description:
      "Análises, blueprints e upgrades viram checklists com contexto, prioridade e instruções para execução humana ou assistida pela sua ferramenta de desenvolvimento.",
    outcomes: [
      "Checklist priorizado",
      "PDF e ponte universal",
      "Progresso ao vivo",
    ],
    image: "/screens/aplicar_crop.jpg",
    width: 1568,
    height: 545,
    route: "Aplicações / Plano",
    accent: "from-[#238636]/36 via-[#6366f1]/20 to-[#2f81f7]/26",
    glow: "bg-[#3fb950]/16",
  },
  {
    key: "automatizar",
    number: "04",
    label: "Automatizar",
    icon: RefreshCw,
    eyebrow: "Orquestração",
    heading: "Repita o ciclo com checkpoints e critérios claros",
    description:
      "A Orquestração organiza analisar, avaliar, gerar plano, aplicar e reanalisar. No modo atual, você mantém o controle dos checkpoints e das aprovações.",
    outcomes: [
      "Quality gates",
      "Histórico por iteração",
      "Retomada controlada",
    ],
    image: "/screens/automatizar_crop.jpg",
    width: 1568,
    height: 330,
    route: "Orquestrações / Execução",
    accent: "from-[#bf8700]/28 via-[#6366f1]/20 to-[#2f81f7]/28",
    glow: "bg-[#d29922]/14",
  },
  {
    key: "acompanhar",
    number: "05",
    label: "Acompanhar",
    icon: LayoutDashboard,
    eyebrow: "Gestão",
    heading: "Veja onde agir sem perder o contexto dos projetos",
    description:
      "O workspace reúne scores, análises recentes, aplicações e projetos que exigem atenção para orientar a próxima decisão da equipe.",
    outcomes: [
      "Visão consolidada",
      "Projetos prioritários",
      "Próxima ação clara",
    ],
    image: "/screens/acompanhar_crop.jpg",
    width: 1568,
    height: 340,
    route: "Workspace / Visão geral",
    accent: "from-[#2f81f7]/38 via-[#6366f1]/20 to-[#8250df]/32",
    glow: "bg-[#6366f1]/20",
  },
] as const;

type FeatureKey = (typeof FEATURES)[number]["key"];

function ProductPreview({ feature }: { feature: FeatureKey }) {
  const preview = {
    analisar: {
      title: "Análise QA padrão",
      badge: "Concluída",
      metric: "92",
      metricLabel: "score geral",
      rows: [
        ["UI/UX", "88", "3 achados"],
        ["Acessibilidade", "94", "1 achado"],
        ["Performance", "91", "2 achados"],
      ],
    },
    projetar: {
      title: "Blueprint do produto",
      badge: "Gerado pela IA",
      metric: "6",
      metricLabel: "quality gates",
      rows: [
        ["Arquitetura", "Definida", "Next.js + Fastify"],
        ["Estratégia de testes", "Pronta", "4 camadas"],
        ["Riscos", "Priorizados", "8 mapeados"],
      ],
    },
    aplicar: {
      title: "Plano de aplicação",
      badge: "Em progresso",
      metric: "68%",
      metricLabel: "concluído",
      rows: [
        ["Corrigir contraste do CTA", "Feito", "Alta"],
        ["Reduzir JavaScript inicial", "Em curso", "Alta"],
        ["Revisar hierarquia de títulos", "Pendente", "Média"],
      ],
    },
    automatizar: {
      title: "Ciclo de orquestração",
      badge: "Iteração 02",
      metric: "4/5",
      metricLabel: "etapas",
      rows: [
        ["Analisar", "Concluído", "92 pontos"],
        ["Avaliar gates", "Concluído", "6 aprovados"],
        ["Reanalisar", "Aguardando", "Próxima etapa"],
      ],
    },
    acompanhar: {
      title: "Saúde do workspace",
      badge: "Atualizado agora",
      metric: "87",
      metricLabel: "média geral",
      rows: [
        ["Loja principal", "Saudável", "94 pontos"],
        ["Portal de clientes", "Atenção", "72 pontos"],
        ["Documentação", "Saudável", "91 pontos"],
      ],
    },
  }[feature];

  return (
    <div className="grid min-h-64 bg-[#0d1117] lg:grid-cols-[190px_minmax(0,1fr)]">
      <aside className="hidden border-r border-white/10 bg-[#090d12] p-4 lg:block">
        <div className="flex items-center gap-2 border-b border-white/10 pb-4 text-xs font-semibold text-white">
          <LogoMark className="h-6 w-6" />
          Muri<span className="-ml-2 text-[#818cf8]">Ops</span>
        </div>
        <div className="mt-5 space-y-1.5">
          {["Visão geral", "Projetos", "Análises", "Aplicações"].map(
            (item, index) => (
              <div
                key={item}
                className={cn(
                  "rounded-md px-2.5 py-2 text-[11px]",
                  index === 2
                    ? "border border-[#6366f1]/20 bg-[#6366f1]/10 text-white"
                    : "text-[#8b949e]",
                )}
              >
                {item}
              </div>
            ),
          )}
        </div>
      </aside>

      <div className="min-w-0 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#8b949e]">
              Workspace principal
            </p>
            <h4 className="mt-1 text-base font-semibold text-white sm:text-lg">
              {preview.title}
            </h4>
          </div>
          <span className="rounded-full border border-[#6366f1]/25 bg-[#6366f1]/10 px-2.5 py-1 text-[10px] font-medium text-[#a5b4fc]">
            {preview.badge}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[130px_minmax(0,1fr)]">
          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <p className="font-mono text-3xl font-semibold text-white">
              {preview.metric}
            </p>
            <p className="mt-1 text-[10px] text-[#8b949e]">
              {preview.metricLabel}
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-[#6366f1] to-[#58a6ff]" />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
            {preview.rows.map(([label, status, detail], index) => (
              <div
                key={label}
                className="grid gap-1 border-b border-white/[0.07] px-3.5 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_90px_110px] sm:items-center"
              >
                <span className="truncate text-xs font-medium text-[#e6edf3]">
                  {label}
                </span>
                <span
                  className={cn(
                    "text-[10px]",
                    index === 1 ? "text-[#d29922]" : "text-[#3fb950]",
                  )}
                >
                  ●&nbsp; {status}
                </span>
                <span className="truncate text-[10px] text-[#8b949e]">
                  {detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-white/[0.07] bg-[#161b22]/70 px-3.5 py-2.5">
          <span className="text-[10px] text-[#8b949e]">
            Próxima decisão recomendada
          </span>
          <span className="text-[10px] font-medium text-[#a5b4fc]">
            Revisar detalhes →
          </span>
        </div>
      </div>
    </div>
  );
}

export function FeatureShowcase() {
  const [active, setActive] = useState<FeatureKey>("analisar");
  const current =
    FEATURES.find((feature) => feature.key === active) ?? FEATURES[0];

  function selectByOffset(offset: number) {
    const index = FEATURES.findIndex((feature) => feature.key === active);
    const next = (index + offset + FEATURES.length) % FEATURES.length;
    setActive(FEATURES[next].key);
  }

  return (
    <div>
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-px shadow-[0_30px_100px_-45px_rgba(99,102,241,0.7)] sm:rounded-[28px]",
          current.accent,
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full blur-3xl",
            current.glow,
          )}
          aria-hidden="true"
        />
        <div className="relative overflow-hidden rounded-[calc(1rem-1px)] bg-[#0d1117]/95 sm:rounded-[calc(1.75rem-1px)]">
          <div
            key={`copy-${current.key}`}
            id={`feature-panel-${current.key}`}
            role="tabpanel"
            aria-labelledby={`feature-tab-${current.key}`}
            className="feature-stage-enter grid gap-6 px-5 pb-7 pt-6 sm:px-8 sm:pb-9 sm:pt-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-end lg:px-10"
          >
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#a5b4fc]">
                <current.icon className="h-4 w-4" />
                {current.number} · {current.eyebrow}
              </div>
              <h3 className="mt-3 text-balance text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-[2rem]">
                {current.heading}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#8b949e] sm:text-base sm:leading-7">
                {current.description}
              </p>
            </div>

            <div className="lg:justify-self-end">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8b949e]">
                O que você leva desta etapa
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {current.outcomes.map((outcome) => (
                  <li
                    key={outcome}
                    className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs text-[#c9d1d9]"
                  >
                    {outcome}
                  </li>
                ))}
              </ul>
              <Link
                href="/docs/guia"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#a5b4fc] hover:text-white"
              >
                Entender o fluxo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="px-3 pb-3 sm:px-5 sm:pb-5 lg:px-7 lg:pb-7">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#010409] shadow-[0_24px_80px_-35px_rgba(0,0,0,0.95)] sm:rounded-2xl">
              <div className="flex h-11 items-center gap-3 border-b border-white/10 bg-[#161b22] px-3 sm:px-4">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#30363d]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#30363d]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#30363d]" />
                </div>
                <div className="mx-auto flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-[#0d1117] px-3 py-1 text-[10px] text-[#8b949e] sm:text-xs">
                  <LogoMark className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{current.route}</span>
                </div>
                <div className="flex w-11 justify-end" aria-hidden="true">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3fb950] shadow-[0_0_12px_rgba(63,185,80,0.75)]" />
                </div>
              </div>

              <div
                key={`image-${current.key}`}
                className="feature-stage-enter relative overflow-hidden bg-[#090d12]"
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b to-transparent",
                    current.accent,
                  )}
                  aria-hidden="true"
                />
                <div className="relative z-0">
                  <ProductPreview feature={current.key} />
                </div>
                <div
                  className="pointer-events-none absolute inset-0 z-20 ring-1 ring-inset ring-white/[0.04]"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Frentes do MuriOps"
        className="mx-auto mt-5 flex max-w-3xl gap-1 overflow-x-auto rounded-xl border bg-card/90 p-1.5 shadow-sm backdrop-blur sm:justify-center sm:rounded-full"
      >
        {FEATURES.map((feature) => {
          const selected = feature.key === active;
          return (
            <button
              key={feature.key}
              id={`feature-tab-${feature.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`feature-panel-${feature.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(feature.key)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") selectByOffset(1);
                if (event.key === "ArrowLeft") selectByOffset(-1);
              }}
              className={cn(
                "group relative flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors sm:rounded-full",
                selected
                  ? "bg-foreground font-medium text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <feature.icon className="h-4 w-4" />
              <span>{feature.label}</span>
              <span
                className={cn(
                  "hidden text-[10px] tabular-nums lg:inline",
                  selected ? "text-background/60" : "text-muted-foreground/60",
                )}
              >
                {feature.number}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
