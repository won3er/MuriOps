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
import { useLocale } from "@/lib/locale-context";
import { FEATURE_COPY, PREVIEW_COPY } from "@/lib/public-copy";
import { cn } from "@/lib/utils";

const FEATURE_VISUALS = [
  {
    key: "analisar",
    number: "01",
    icon: ScanSearch,
    accent: "from-[#6e40c9]/55 via-[#6366f1]/22 to-[#2f81f7]/30",
    glow: "bg-[#8250df]/25",
  },
  {
    key: "projetar",
    number: "02",
    icon: DraftingCompass,
    accent: "from-[#1f6feb]/45 via-[#6366f1]/20 to-[#2ea043]/24",
    glow: "bg-[#2f81f7]/20",
  },
  {
    key: "aplicar",
    number: "03",
    icon: Wrench,
    accent: "from-[#238636]/36 via-[#6366f1]/20 to-[#2f81f7]/26",
    glow: "bg-[#3fb950]/16",
  },
  {
    key: "automatizar",
    number: "04",
    icon: RefreshCw,
    accent: "from-[#bf8700]/28 via-[#6366f1]/20 to-[#2f81f7]/28",
    glow: "bg-[#d29922]/14",
  },
  {
    key: "acompanhar",
    number: "05",
    icon: LayoutDashboard,
    accent: "from-[#2f81f7]/38 via-[#6366f1]/20 to-[#8250df]/32",
    glow: "bg-[#6366f1]/20",
  },
] as const;

type FeatureKey = (typeof FEATURE_VISUALS)[number]["key"];

const ACTIVE_NAV_ITEM: Record<FeatureKey, number> = {
  analisar: 2,
  projetar: 3,
  aplicar: 4,
  automatizar: 5,
  acompanhar: 0,
};

type PreviewData = {
  title: string;
  badge: string;
  metric: string;
  metricLabel: string;
  rows: readonly (readonly string[])[];
};

const PREVIEW_UI_COPY = {
  en: {
    channels: "GitHub · MCP · PDF",
    orchestrationHint: "Run with checkpoints and controlled resume.",
    activeProjects: "active projects",
    needAttention: "need attention",
  },
  pt: {
    channels: "GitHub · MCP · PDF",
    orchestrationHint: "Execução com checkpoints e retomada controlada.",
    activeProjects: "projetos ativos",
    needAttention: "pedem atenção",
  },
  es: {
    channels: "GitHub · MCP · PDF",
    orchestrationHint: "Ejecución con puntos de control y reanudación controlada.",
    activeProjects: "proyectos activos",
    needAttention: "requieren atención",
  },
} as const;

function AnalysisPreview({ preview }: { preview: PreviewData }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[130px_minmax(0,1fr)]">
      <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
        <p className="font-mono text-3xl font-semibold text-white">{preview.metric}</p>
        <p className="mt-1 text-[10px] text-[#8b949e]">{preview.metricLabel}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-[#6366f1] to-[#58a6ff]" />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
        {preview.rows.map(([label, score, detail]) => (
          <div key={label} className="grid gap-1 border-b border-white/[0.07] px-3.5 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_72px_110px] sm:items-center">
            <span className="truncate text-xs font-medium text-[#e6edf3]">{label}</span>
            <span className="font-mono text-[10px] text-[#3fb950]">{score}</span>
            <span className="truncate text-[10px] text-[#8b949e]">{detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlueprintPreview({ preview }: { preview: PreviewData }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
        <p className="text-[10px] uppercase tracking-[0.13em] text-[#8b949e]">Quality gates</p>
        <p className="mt-2 font-mono text-3xl font-semibold text-white">{preview.metric}</p>
        <p className="mt-1 text-[10px] text-[#8b949e]">{preview.metricLabel}</p>
        <div className="mt-5 space-y-2">
          <span className="block h-1.5 w-full rounded bg-[#6366f1]/70" />
          <span className="block h-1.5 w-4/5 rounded bg-white/15" />
          <span className="block h-1.5 w-3/5 rounded bg-white/10" />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
        {preview.rows.map(([label, status, detail]) => (
          <div key={label} className="grid gap-1 border-b border-white/[0.07] px-3.5 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_100px_120px] sm:items-center">
            <span className="text-xs font-medium text-[#e6edf3]">{label}</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-[#3fb950]"><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>
            <span className="text-[10px] text-[#8b949e]">{detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicationPreview({ preview, channels }: { preview: PreviewData; channels: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.07] pb-3">
        <span className="text-xs font-medium text-[#e6edf3]">{preview.metric} {preview.metricLabel}</span>
        <span className="text-[10px] text-[#8b949e]">{channels}</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {preview.rows.map(([label, status, detail], index) => {
          const done = index === 0;
          return (
            <div key={label} className="grid grid-cols-[16px_minmax(0,1fr)_64px] items-center gap-2">
              <span className={cn("grid h-4 w-4 place-items-center rounded-full border text-[9px]", done ? "border-[#3fb950] bg-[#238636] text-white" : "border-white/20 text-transparent")} aria-hidden="true">✓</span>
              <span className={cn("truncate text-xs", done ? "text-[#8b949e] line-through" : "text-[#e6edf3]")}>{label}</span>
              <span className="text-right text-[10px] text-[#a5b4fc]">{status || detail}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrchestrationPreview({ preview, hint }: { preview: PreviewData; hint: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[130px_minmax(0,1fr)]">
      <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
        <p className="font-mono text-3xl font-semibold text-white">{preview.metric}</p>
        <p className="mt-1 text-[10px] text-[#8b949e]">{preview.metricLabel}</p>
        <p className="mt-5 text-[10px] leading-4 text-[#a5b4fc]">{hint}</p>
      </div>
      <ol className="relative space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <span aria-hidden="true" className="absolute bottom-7 left-[21px] top-7 w-px bg-white/10" />
        {preview.rows.map(([label, status, detail], index) => (
          <li key={label} className="relative grid grid-cols-[16px_minmax(0,1fr)_104px] items-center gap-2">
            <span className={cn("relative z-10 h-2.5 w-2.5 rounded-full", index < 2 ? "bg-[#3fb950]" : "border border-[#d29922] bg-[#0d1117]")} />
            <span className="truncate text-xs font-medium text-[#e6edf3]">{label}</span>
            <span className={cn("text-right text-[10px]", index < 2 ? "text-[#3fb950]" : "text-[#d29922]")}>{status} · {detail}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function OverviewPreview({ preview, activeProjects, needAttention }: { preview: PreviewData; activeProjects: string; needAttention: string }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3"><p className="font-mono text-xl font-semibold text-white">{preview.metric}</p><p className="mt-1 text-[9px] text-[#8b949e]">{preview.metricLabel}</p></div>
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3"><p className="font-mono text-xl font-semibold text-white">3</p><p className="mt-1 text-[9px] text-[#8b949e]">{activeProjects}</p></div>
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3"><p className="font-mono text-xl font-semibold text-white">2</p><p className="mt-1 text-[9px] text-[#8b949e]">{needAttention}</p></div>
      </div>
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
        {preview.rows.map(([label, status, detail]) => (
          <div key={label} className="grid gap-1 border-b border-white/[0.07] px-3.5 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_84px_100px] sm:items-center">
            <span className="truncate text-xs font-medium text-[#e6edf3]">{label}</span>
            <span className="text-[10px] text-[#3fb950]">{status}</span>
            <span className="text-right font-mono text-[10px] text-[#8b949e]">{detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductPreview({ feature }: { feature: FeatureKey }) {
  const { locale } = useLocale();
  const featureCopy = FEATURE_COPY[locale];
  const preview = PREVIEW_COPY[locale][feature];
  const uiCopy = PREVIEW_UI_COPY[locale];

  return (
    <div className="grid min-h-64 bg-[#0d1117] lg:grid-cols-[190px_minmax(0,1fr)]">
      <aside className="hidden border-r border-white/10 bg-[#090d12] p-4 lg:block">
        <div className="flex items-center gap-2 border-b border-white/10 pb-4 text-xs font-semibold text-white">
          <LogoMark className="h-6 w-6" />
          Muri<span className="-ml-2 text-[#818cf8]">Ops</span>
        </div>
        <div className="mt-5 space-y-1.5">
          {featureCopy.sideNav.map((item, index) => (
            <div
              key={item}
              className={cn(
                "rounded-md px-2.5 py-2 text-[11px]",
                index === ACTIVE_NAV_ITEM[feature]
                  ? "border border-[#6366f1]/20 bg-[#6366f1]/10 text-white"
                  : "text-[#8b949e]",
              )}
            >
              {item}
            </div>
          ))}
        </div>
      </aside>

      <div className="min-w-0 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#8b949e]">
              {featureCopy.workspace}
            </p>
            <h4 className="mt-1 text-base font-semibold text-white sm:text-lg">
              {preview.title}
            </h4>
          </div>
          <span className="rounded-full border border-[#6366f1]/25 bg-[#6366f1]/10 px-2.5 py-1 text-[10px] font-medium text-[#a5b4fc]">
            {preview.badge}
          </span>
        </div>

        <div className="mt-5">
          {feature === "analisar" && <AnalysisPreview preview={preview} />}
          {feature === "projetar" && <BlueprintPreview preview={preview} />}
          {feature === "aplicar" && <ApplicationPreview preview={preview} channels={uiCopy.channels} />}
          {feature === "automatizar" && <OrchestrationPreview preview={preview} hint={uiCopy.orchestrationHint} />}
          {feature === "acompanhar" && <OverviewPreview preview={preview} activeProjects={uiCopy.activeProjects} needAttention={uiCopy.needAttention} />}
        </div>

      </div>
    </div>
  );
}

export function FeatureShowcase() {
  const { locale, href } = useLocale();
  const copy = FEATURE_COPY[locale];
  const features = FEATURE_VISUALS.map((visual, index) => ({
    ...visual,
    ...copy.features[index],
    key: visual.key,
  }));
  const [active, setActive] = useState<FeatureKey>("analisar");
  const current =
    features.find((feature) => feature.key === active) ?? features[0];

  function selectByOffset(offset: number) {
    const index = features.findIndex((feature) => feature.key === active);
    const next = (index + offset + features.length) % features.length;
    setActive(features[next].key);
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
                {copy.outcomeEyebrow}
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
                href={href("/docs/guia")}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#a5b4fc] hover:text-white"
              >
                {copy.understandFlow} <ArrowRight className="h-3.5 w-3.5" />
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
        aria-label={copy.tabsAria}
        className="mx-auto mt-5 flex max-w-3xl gap-1 overflow-x-auto rounded-xl border bg-card/90 p-1.5 shadow-sm backdrop-blur sm:justify-center sm:rounded-full"
      >
        {features.map((feature) => {
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
