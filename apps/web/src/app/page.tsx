"use client";

import {
  ArrowRight,
  Bot,
  FileDown,
  Gauge,
  GitCompare,
  Lock,
  Search,
  ShieldAlert,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import Image from "next/image";
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
  GitCompare,
] as const;

export default function LandingPage() {
  const { hasSession } = useAuth();
  const { locale, href } = useLocale();
  const copy = LANDING_COPY[locale];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <PublicHeader />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-[760px] bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent_58%)]"
      />
      <main
        id="conteudo-principal"
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 sm:px-6"
      >
        {/* Hero — sem animação de entrada: é o candidato a LCP. */}
        <section className="relative mt-16 flex flex-col items-center text-center sm:mt-24">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-0 -z-10 h-80 w-[min(920px,100vw)] -translate-x-1/2 rounded-full border border-primary/10 bg-primary/[0.025] blur-3xl"
          />
          <span className="mb-5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            {copy.eyebrow}
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold leading-[1.1] sm:text-5xl md:text-6xl">
            {copy.heroBefore}{" "}
            <span className="text-primary">{copy.heroAccent}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            {copy.heroDescription}
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
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
          <p className="mt-6 text-xs text-muted-foreground">{copy.trustLine}</p>
        </section>

        {/* Destaques — pills + screenshot real, no espírito da home do GitHub */}
        <section className="mt-28 sm:mt-36">
          <div className="mb-9 max-w-3xl">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
              {copy.cycleEyebrow}
            </p>
            <h2 className="text-3xl font-semibold sm:text-4xl lg:text-5xl">
              {copy.cycleTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              {copy.cycleDescription}
            </p>
          </div>
          <FeatureShowcase />
        </section>

        {/* Como funciona */}
        <section className="mt-28">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold">{copy.howItWorks}</h2>
          </div>
          <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div
              aria-hidden="true"
              className="absolute left-[10%] right-[10%] top-8 -z-10 hidden h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent lg:block"
            />
            {copy.steps.map((s) => (
              <li
                key={s.n}
                className="group rounded-xl border border-border bg-card/35 p-5 transition-colors hover:border-primary/35 hover:bg-card"
              >
                <span className="tabular inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-primary/25 bg-background px-2 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {s.n}
                </span>
                <h3 className="mt-4 font-medium">{s.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {s.desc}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Destaque da Aplicação — o diferencial */}
        <section className="mt-28">
          <div className="glass relative isolate grid items-center gap-8 overflow-hidden rounded-2xl p-7 md:grid-cols-2 md:p-12">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-24 -z-20 h-96 w-96 rounded-full bg-primary/[0.08] blur-3xl"
            />
            <Image
              src="/mascot-build.png"
              alt=""
              width={1024}
              height={1536}
              sizes="280px"
              className="pointer-events-none absolute -bottom-24 left-[43%] -z-10 hidden h-auto w-64 select-none opacity-[0.12] lg:block"
            />
            <div className="relative z-10">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                <Bot className="h-3.5 w-3.5" /> {copy.application.eyebrow}
              </span>
              <h2 className="text-3xl font-semibold leading-tight">
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
            <div className="relative z-10 rounded-xl border border-border bg-background/80 p-5 shadow-[0_24px_60px_-42px_rgba(99,102,241,0.8)] backdrop-blur">
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
        <section className="mt-28">
          <div className="mb-10 grid items-end gap-6 sm:grid-cols-[minmax(0,1fr)_260px]">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
                {copy.coverage.eyebrow}
              </p>
              <h2 className="text-3xl font-semibold sm:text-4xl">
                {copy.coverage.title}
              </h2>
              <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
                {copy.coverage.description}
              </p>
            </div>
            <div className="relative hidden h-44 sm:block">
              <div
                aria-hidden="true"
                className="absolute inset-6 rounded-full bg-primary/10 blur-3xl"
              />
              <Image
                src="/mascot-investigate.png"
                alt=""
                width={1024}
                height={1536}
                sizes="240px"
                className="absolute -bottom-6 right-0 h-56 w-auto select-none object-contain"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {copy.coverage.modules.map(([label, desc], index) => {
              const Icon = MODULE_ICONS[index];
              return (
                <div
                  key={label}
                  className="group rounded-xl border border-border bg-card/25 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card"
                >
                  <span className="mb-4 grid h-9 w-9 place-items-center rounded-lg border bg-background transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <h3 className="text-sm font-medium">{label}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA final */}
        <section className="relative mt-28 overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.055] px-6 py-12 sm:px-10 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center lg:px-14 lg:py-14">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-28 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
          />
          <div className="relative z-10 max-w-2xl text-center lg:text-left">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-primary">
              {copy.cta.eyebrow}
            </p>
            <h2 className="text-balance text-3xl font-semibold sm:text-4xl">
              {copy.cta.title}
            </h2>
            <p className="mt-3 max-w-lg text-muted-foreground">
              {copy.cta.description}
            </p>
            <Link
              href={hasSession ? "/dashboard" : href("/register")}
              className="mt-7 inline-flex"
            >
              <Button size="lg">
                {hasSession ? copy.cta.dashboard : copy.cta.start}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="relative z-10 hidden h-56 lg:block">
            <Image
              src="/mascot-monitor.png"
              alt=""
              width={1536}
              height={1024}
              sizes="340px"
              className="absolute -bottom-16 right-0 h-72 w-auto select-none object-contain"
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
