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
import Link from "next/link";
import { FeatureShowcase } from "@/components/feature-showcase";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const STEPS = [
  {
    n: "01",
    title: "Cole a URL",
    desc: "Sem instalar nada, sem plugin, sem acesso ao seu código.",
  },
  {
    n: "02",
    title: "A IA analisa",
    desc: "Crawler explora as páginas e os analisadores levantam os problemas.",
  },
  {
    n: "03",
    title: "Leia o relatório",
    desc: "Nota por dimensão, problemas priorizados e evidência de cada um.",
  },
  {
    n: "04",
    title: "Aplique as correções",
    desc: "Exporte a Aplicação e corrija — manualmente ou via IA de dev.",
  },
];

const MODULES = [
  {
    icon: Search,
    label: "Crawler inteligente",
    desc: "Descobre páginas, menus e fluxos sozinho.",
  },
  {
    icon: Gauge,
    label: "Performance",
    desc: "LCP, CLS, INP e tempo de carregamento real.",
  },
  {
    icon: Sparkles,
    label: "UI & UX",
    desc: "Hierarquia, contraste, alvos de clique e usabilidade.",
  },
  {
    icon: Search,
    label: "SEO",
    desc: "Títulos, meta, canonical, Open Graph, sitemap e robots.",
  },
  {
    icon: Lock,
    label: "Acessibilidade",
    desc: "Labels, alt, foco e navegação por teclado (WCAG).",
  },
  {
    icon: ShieldAlert,
    label: "Segurança",
    desc: "Headers, HTTPS, CSP, TLS, DNS e segredos expostos.",
  },
  {
    icon: Terminal,
    label: "Console & Rede",
    desc: "Erros de JS, requisições quebradas e recursos pesados.",
  },
  {
    icon: GitCompare,
    label: "Comparação de versões",
    desc: "O que foi corrigido, o que surgiu e o que persiste.",
  },
];

export default function LandingPage() {
  const { hasSession } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main
        id="conteudo-principal"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6"
      >
        {/* Hero — sem animação de entrada: é o candidato a LCP. */}
        <section className="mt-16 flex flex-col items-center text-center sm:mt-24">
          <span className="mb-5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            Gestão contínua de qualidade digital
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold leading-[1.1] sm:text-5xl md:text-6xl">
            Qualidade deixa de ser relatório e vira{" "}
            <span className="text-primary">processo de gestão</span>
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            Organize projetos, execute análises, transforme achados em planos e
            acompanhe cada ciclo de melhoria em um workspace conectado.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href={hasSession ? "/dashboard" : "/register"}>
              <Button size="lg">
                {hasSession ? "Abrir workspace" : "Criar meu workspace"}{" "}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {!hasSession && (
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Já tem conta? Entrar
                </Button>
              </Link>
            )}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Comece sem cartão · Use sua própria chave de IA · Mantenha o
            controle das aprovações
          </p>
        </section>

        {/* Destaques — pills + screenshot real, no espírito da home do GitHub */}
        <section className="mt-28">
          <div className="mb-8 max-w-2xl">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
              Um ciclo conectado
            </p>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Cinco frentes, um só workspace
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Do primeiro diagnóstico ao acompanhamento das melhorias, cada
              etapa preserva o contexto do projeto e prepara a próxima decisão.
            </p>
          </div>
          <FeatureShowcase />
        </section>

        {/* Como funciona */}
        <section className="mt-28">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold">Como funciona</h2>
          </div>
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-xl border border-border p-5">
                <span className="tabular text-sm font-semibold text-primary">
                  {s.n}
                </span>
                <h3 className="mt-2 font-medium">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Destaque da Aplicação — o diferencial */}
        <section className="mt-28">
          <div className="glass grid items-center gap-8 rounded-2xl p-8 md:grid-cols-2 md:p-12">
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                <Bot className="h-3.5 w-3.5" /> Aplicação
              </span>
              <h2 className="text-3xl font-semibold leading-tight">
                O relatório não para no PDF
              </h2>
              <p className="mt-4 text-muted-foreground">
                A Aplicação transforma os achados em um plano de mudanças
                concreto: o que alterar, em qual arquivo e como. Baixe em um
                documento único para o seu time, ou envie o pacote para a IA que
                você já usa para programar — ela aplica as correções e marca
                cada item como feito aqui, em tempo real.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1">
                  <FileDown className="h-3.5 w-3.5 text-primary" /> Documento
                  único
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1">
                  <Bot className="h-3.5 w-3.5 text-primary" /> Pacote para IA de
                  dev
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1">
                  <Wrench className="h-3.5 w-3.5 text-primary" /> Checklist ao
                  vivo
                </span>
              </div>
            </div>
            {/* Mock do checklist — ilustra o resultado sem prometer nada falso. */}
            <div className="rounded-xl border border-border bg-card/60 p-5">
              <p className="mb-4 text-xs text-muted-foreground">
                Plano de aplicação · 2 de 3 aplicados
              </p>
              <ul className="space-y-3 text-sm">
                {[
                  { t: "Adicionar meta description", done: true },
                  { t: "Corrigir contraste do botão principal", done: true },
                  { t: "Definir Content-Security-Policy", done: false },
                ].map((it) => (
                  <li key={it.t} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={
                        it.done
                          ? "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground"
                          : "mt-0.5 h-4 w-4 shrink-0 rounded-full border border-border"
                      }
                    >
                      {it.done ? "✓" : ""}
                    </span>
                    <span
                      className={
                        it.done ? "text-muted-foreground line-through" : ""
                      }
                    >
                      {it.t}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Módulos cobertos */}
        <section className="mt-28">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold">O que a análise cobre</h2>
            <p className="mt-2 text-muted-foreground">
              Oito frentes rodando em cada varredura, com evidência anexada.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-border p-5"
              >
                <m.icon className="mb-3 h-5 w-5 text-primary" />
                <h3 className="text-sm font-medium">{m.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="mt-28 flex flex-col items-center rounded-2xl border border-primary/25 bg-primary/[0.06] px-6 py-14 text-center">
          <h2 className="max-w-2xl text-balance text-3xl font-semibold">
            Descubra o que está travando a qualidade do seu site
          </h2>
          <p className="mt-3 max-w-lg text-muted-foreground">
            A primeira análise leva alguns minutos e não exige nenhuma mudança
            no seu projeto.
          </p>
          <Link href={hasSession ? "/dashboard" : "/register"} className="mt-7">
            <Button size="lg">
              {hasSession ? "Ir para o Dashboard" : "Começar agora"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
