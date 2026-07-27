"use client";

import {
  ScanSearch,
  DraftingCompass,
  Wrench,
  RefreshCw,
  LayoutDashboard,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Seção de destaques no estilo da home do GitHub (pills "Código / Planeje /
 * Colabore / Automatize / Proteja" com um mockup de produto ao lado). Aqui
 * os "pills" são os pilares reais do Elevate QA, e a imagem de cada um é um
 * screenshot de verdade do app rodando — não uma ilustração genérica.
 */
const FEATURES = [
  {
    key: "analisar",
    label: "Analisar",
    icon: ScanSearch,
    heading: "Descubra o que está quebrando sua qualidade",
    desc: "A IA navega no seu site como um usuário real e devolve uma nota de 0 a 100 por dimensão — UI, UX, performance, SEO, acessibilidade, console, rede e segurança — com evidência de cada problema encontrado.",
    img: "/screens/analisar_crop.jpg",
  },
  {
    key: "projetar",
    label: "Projetar",
    icon: DraftingCompass,
    heading: "Planeje com qualidade antes da primeira linha de código",
    desc: "Descreva o projeto que você quer construir e receba arquitetura, pirâmide de testes, quality gates e matriz de riscos — um plano técnico completo gerado por IA, pensado pra já nascer testável.",
    img: "/screens/projetar_crop.jpg",
  },
  {
    key: "aplicar",
    label: "Aplicar",
    icon: Wrench,
    heading: "Transforme o relatório em checklist de correção",
    desc: "Cada problema vira um item acionável: o que mudar, em qual arquivo e como. Baixe um documento único pro seu time ou envie o pacote pra sua IA de desenvolvimento aplicar por você.",
    img: "/screens/aplicar_crop.jpg",
  },
  {
    key: "automatizar",
    label: "Automatizar",
    icon: RefreshCw,
    heading: "Feche o loop: analisar, aplicar e reanalisar",
    desc: "A orquestração acompanha o ciclo completo por projeto — histórico de análises, aplicações geradas e o status de cada rodada — até o site passar nos critérios de qualidade que você definiu.",
    img: "/screens/automatizar_crop.jpg",
  },
  {
    key: "acompanhar",
    label: "Acompanhar",
    icon: LayoutDashboard,
    heading: "Todos os seus projetos, um painel só",
    desc: "Score médio, problemas encontrados, tempo de análise e histórico de cada site monitorado — pra saber de relance onde a atenção é mais urgente.",
    img: "/screens/acompanhar_crop.jpg",
  },
] as const;

export function FeatureShowcase() {
  const [active, setActive] = useState<(typeof FEATURES)[number]["key"]>("analisar");
  const current = FEATURES.find((f) => f.key === active) ?? FEATURES[0];

  return (
    <div>
      {/* Pills de navegação — mesma lógica visual do github.com/ */}
      <div
        role="tablist"
        aria-label="Funcionalidades do Elevate QA"
        className="mx-auto flex max-w-full flex-wrap items-center justify-center gap-2 sm:gap-3"
      >
        {FEATURES.map((f) => {
          const isActive = f.key === active;
          return (
            <button
              key={f.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(f.key)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <f.icon className="h-4 w-4" />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Painel: texto + screenshot real dentro de um "mockup de janela" */}
      <div className="glass mt-8 grid items-center gap-8 rounded-2xl p-6 md:grid-cols-2 md:p-10">
        <div>
          <h3 className="text-2xl font-semibold leading-tight sm:text-3xl">
            {current.heading}
          </h3>
          <p className="mt-4 text-muted-foreground">{current.desc}</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="relative aspect-[16/10] w-full bg-background">
            <Image
              src={current.img}
              alt={`Tela de "${current.label}" no Elevate QA`}
              fill
              className="object-cover object-top"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
