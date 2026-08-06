"use client";

import {
  ArrowRight,
  Bot,
  Crosshair,
  FileDown,
  Gauge,
  GitCompare,
  Github,
  HardDrive,
  Lock,
  Search,
  ShieldAlert,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { FeatureShowcase } from "@/components/feature-showcase";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { LANDING_COPY } from "@/lib/public-copy";

const MODULE_ICONS = [
  Search,
  Gauge,
  Sparkles,
  Search,
  Lock,
  ShieldAlert,
  Terminal,
  Crosshair,
  Github,
  GitCompare,
] as const;

const INTEGRATION_ICONS = [HardDrive, Github, Terminal, Bot] as const;

/**
 * Redesign minimalista (06/08/2026): sem gradientes/blur decorativos, sem
 * mascotes na home, sem glass/shadow — bordas finas de 1px, tipografia como
 * hierarquia principal, espaço em branco no lugar de enfeite. Referência:
 * styles.refero.design. FeatureShowcase (as 6 frentes) permanece intocado
 * por pedido explícito — só o espaço ao redor mudou.
 */
export default function LandingPage() {
  const { hasSession } = useAuth();
  const { locale, href } = useLocale();
  const copy = LANDING_COPY[locale];

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main
        id="conteudo-principal"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 sm:px-6"
      >
        {/* Hero — compacto: a home deve chegar às 6 frentes sem precisar
            rolar a tela. Sem animação de entrada: candidato a LCP. */}
        <section className="flex flex-col items-center pt-10 text-center sm:pt-14">
          <span className="mb-4 text-xs font-medium uppercase tracking-wider text-primary">
            {copy.eyebrow}
          </span>
          <h1 className="max-w-2xl text-balance text-3xl font-semibold leading-[1.15] sm:text-4xl md:text-[2.75rem]">
            {copy.heroBefore}{" "}
            <span className="text-primary">{copy.heroAccent}</span>
          </h1>
          <p className="mt-4 max-w-xl text-balance text-base text-muted-foreground">
            {copy.heroDescription}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={hasSession ? "/dashboard" : href("/register")}>
              <Button size="lg">
                {hasSession ? copy.openWorkspace : copy.createWorkspace}{" "}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {!hasSession && (
              <Link href={href("/login")}>
                <Button size="lg" variant="outline">
                  {copy.signInPrompt}
                </Button>
              </Link>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{copy.trustLine}</p>
        </section>

        {/* Seis frentes — logo em seguida ao hero, sem seção intermediária,
            pra caber na primeira dobra. */}
        <section className="mt-12 sm:mt-14">
          <div className="mb-6 max-w-3xl">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-primary">
              {copy.cycleEyebrow}
            </p>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              {copy.cycleTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {copy.cycleDescription}
            </p>
          </div>
          <FeatureShowcase />
        </section>

        {/* Fluxo operacional */}
        <section className="mt-24">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-semibold">{copy.howItWorks}</h2>
            <p className="mt-2 text-base leading-7 text-muted-foreground">
              {copy.howItWorksDescription}
            </p>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {copy.steps.map((s) => (
              <li key={s.n} className="bg-background p-5">
                <span className="tabular text-xs font-medium text-primary">
                  {s.n}
                </span>
                <h3 className="mt-2 font-medium">{s.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {s.desc}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Destaque da Aplicação — o diferencial */}
        <section className="mt-24">
          <div className="grid items-center gap-8 rounded-lg border border-border p-7 md:grid-cols-2 md:p-10">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-primary">
                {copy.application.eyebrow}
              </p>
              <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">
                {copy.application.title}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {copy.application.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1">
                  <FileDown className="h-3.5 w-3.5 text-primary" />{" "}
                  {copy.application.badges[0]}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1">
                  <Bot className="h-3.5 w-3.5 text-primary" />{" "}
                  {copy.application.badges[1]}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1">
                  <Wrench className="h-3.5 w-3.5 text-primary" />{" "}
                  {copy.application.badges[2]}
                </span>
              </div>
            </div>
            {/* Mock do checklist — ilustra o resultado sem prometer nada falso. */}
            <div className="rounded-lg border border-border p-5">
              <p className="mb-4 text-xs text-muted-foreground">
                {copy.application.planStatus}
              </p>
              <ul className="space-y-3 text-sm">
                {copy.application.checklist.map((text, index) => {
                  const done = index < 2;
                  return (
                    <li key={text} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={
                          done
                            ? "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground"
                            : "mt-0.5 h-4 w-4 shrink-0 rounded-full border border-border"
                        }
                      >
                        {done ? "✓" : ""}
                      </span>
                      <span
                        className={
                          done ? "text-muted-foreground line-through" : ""
                        }
                      >
                        {text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* Módulos cobertos */}
        <section className="mt-24">
          <div className="mb-8 max-w-2xl">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
              {copy.coverage.eyebrow}
            </p>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              {copy.coverage.title}
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              {copy.coverage.description}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
            {copy.coverage.modules.map(([label, desc], index) => {
              const Icon = MODULE_ICONS[index];
              return (
                <div key={label} className="bg-background p-5">
                  <Icon className="mb-3 h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{label}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Integrações reais — o que de fato conecta e o que faz, sem enfeite. */}
        <section className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
              {copy.integrations.eyebrow}
            </p>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              {copy.integrations.title}
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              {copy.integrations.description}
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {copy.integrations.items.map(([label, desc], index) => {
              const Icon = INTEGRATION_ICONS[index];
              return (
                <div key={label} className="bg-background p-5">
                  <Icon className="mb-3 h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{label}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Entrada no sistema — estrutura sóbria, sem estética de campanha. */}
        <section className="my-24 rounded-lg border border-border p-8 sm:p-12">
          <div className="mx-auto max-w-xl text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-primary">
              {copy.cta.eyebrow}
            </p>
            <h2 className="text-balance text-2xl font-semibold leading-tight sm:text-3xl">
              {copy.cta.title}
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              {copy.cta.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm text-muted-foreground">
              <span>Projeto e contexto</span>
              <span>Análise não invasiva</span>
              <span>Histórico técnico</span>
            </div>
            <div className="mt-7">
              <Link href={hasSession ? "/dashboard" : href("/register")}>
                <Button>
                  {hasSession ? copy.cta.dashboard : copy.cta.start}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
