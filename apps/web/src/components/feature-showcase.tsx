"use client";

import {
  ArrowRight,
  Check,
  DraftingCompass,
  LayoutDashboard,
  RefreshCw,
  ScanSearch,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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
      "Filtros por risco e categoria",
    ],
    image: "/screens/analisar_crop.jpg",
    width: 1568,
    height: 545,
    route: "Análises / Relatório",
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
      "Acompanhamento de progresso",
    ],
    image: "/screens/aplicar_crop.jpg",
    width: 1568,
    height: 545,
    route: "Aplicações / Plano",
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
      "Retomada após aplicação",
    ],
    image: "/screens/automatizar_crop.jpg",
    width: 1568,
    height: 330,
    route: "Orquestrações / Execução",
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
      "Acesso rápido ao trabalho",
    ],
    image: "/screens/acompanhar_crop.jpg",
    width: 1568,
    height: 340,
    route: "Workspace / Visão geral",
  },
] as const;

type FeatureKey = (typeof FEATURES)[number]["key"];

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
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-4 py-3 md:hidden">
        <div
          role="tablist"
          aria-label="Frentes do Elevate QA"
          className="flex gap-1 overflow-x-auto"
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
                  "flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-sm",
                  selected
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <feature.icon
                  className={cn("h-4 w-4", selected && "text-primary")}
                />
                {feature.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <div
          role="tablist"
          aria-label="Frentes do Elevate QA"
          className="hidden border-r p-3 lg:block"
        >
          <p className="mb-2 px-3 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Ciclo de qualidade
          </p>
          {FEATURES.map((feature) => {
            const selected = feature.key === active;
            return (
              <button
                key={feature.key}
                id={`feature-tab-desktop-${feature.key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`feature-panel-${feature.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(feature.key)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") selectByOffset(1);
                  if (event.key === "ArrowUp") selectByOffset(-1);
                }}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors",
                  selected
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "tabular text-[10px]",
                    selected && "text-primary",
                  )}
                >
                  {feature.number}
                </span>
                <feature.icon
                  className={cn("h-4 w-4", selected && "text-primary")}
                />
                <span className="text-sm font-medium">{feature.label}</span>
                {selected && (
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-primary" />
                )}
              </button>
            );
          })}
        </div>

        <div
          key={current.key}
          id={`feature-panel-${current.key}`}
          role="tabpanel"
          aria-labelledby={`feature-tab-${current.key}`}
          className="min-w-0"
        >
          <div className="grid gap-7 p-5 sm:p-7 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-center xl:p-9">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
                <current.icon className="h-3.5 w-3.5" />
                {current.eyebrow}
              </div>
              <h3 className="mt-3 text-2xl font-semibold leading-tight">
                {current.heading}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {current.description}
              </p>
              <ul className="mt-5 space-y-2">
                {current.outcomes.map((outcome) => (
                  <li key={outcome} className="flex items-center gap-2 text-sm">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3 w-3" />
                    </span>
                    {outcome}
                  </li>
                ))}
              </ul>
              <Link
                href="/docs/guia"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Entender o fluxo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="min-w-0 overflow-hidden rounded-lg border bg-background">
              <div className="flex h-10 items-center gap-2 border-b bg-card px-3">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/35" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/35" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/35" />
                </div>
                <div className="mx-auto rounded-md border bg-background px-3 py-1 text-[10px] text-muted-foreground">
                  {current.route}
                </div>
                <span className="w-8" aria-hidden="true" />
              </div>
              <div className="flex min-h-48 items-center justify-center bg-[#090d12] p-2 sm:p-3">
                <Image
                  src={current.image}
                  alt={`Interface do Elevate QA na etapa ${current.label}`}
                  width={current.width}
                  height={current.height}
                  className="h-auto w-full rounded-sm object-contain"
                  sizes="(min-width: 1280px) 650px, (min-width: 1024px) 70vw, 100vw"
                  priority={current.key === "analisar"}
                />
              </div>
              <div className="flex items-center justify-between border-t bg-card px-3 py-2 text-[10px] text-muted-foreground">
                <span>Interface real do produto</span>
                <span>{current.number} / 05</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
