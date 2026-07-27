"use client";

import {
  ArrowRight,
  Bot,
  FileDown,
  Gauge,
  GitCompare,
  Loader2,
  Lock,
  Search,
  ShieldAlert,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeatureShowcase } from "@/components/feature-showcase";
import { LogoIsotype } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const STEPS = [
  { n: "01", title: "Cole a URL", desc: "Sem instalar nada, sem plugin, sem acesso ao seu código." },
  { n: "02", title: "A IA analisa", desc: "Crawler explora as páginas e os analisadores levantam os problemas." },
  { n: "03", title: "Leia o relatório", desc: "Nota por dimensão, problemas priorizados e evidência de cada um." },
  { n: "04", title: "Aplique as correções", desc: "Exporte a Aplicação e corrija — manualmente ou via IA de dev." },
];

const MODULES = [
  { icon: Search, label: "Crawler inteligente", desc: "Descobre páginas, menus e fluxos sozinho." },
  { icon: Gauge, label: "Performance", desc: "LCP, CLS, INP e tempo de carregamento real." },
  { icon: Sparkles, label: "UI & UX", desc: "Hierarquia, contraste, alvos de clique e usabilidade." },
  { icon: Search, label: "SEO", desc: "Títulos, meta, canonical, Open Graph, sitemap e robots." },
  { icon: Lock, label: "Acessibilidade", desc: "Labels, alt, foco e navegação por teclado (WCAG)." },
  { icon: ShieldAlert, label: "Segurança", desc: "Headers, HTTPS, CSP, TLS, DNS e segredos expostos." },
  { icon: Terminal, label: "Console & Rede", desc: "Erros de JS, requisições quebradas e recursos pesados." },
  { icon: GitCompare, label: "Comparação de versões", desc: "O que foi corrigido, o que surgiu e o que persiste." },
];

export default function LandingPage() {
  const { user, hasSession } = useAuth();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (!url.trim()) return;
    if (!user) {
      router.push(`/register?url=${encodeURIComponent(url)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const project = await api.createProject({
        name: new URL(normalize(url)).hostname,
        url: normalize(url),
      });
      const analysis = await api.startAnalysis(project.id);
      router.push(`/analyses/${analysis.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao iniciar análise");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6">
      {/* O header decide na hora entre "Dashboard" e "Entrar" — usa apenas o
          token salvo no navegador, sem esperar resposta da API. */}
      <header className="flex w-full items-center justify-between py-6">
        <Link href="/" aria-label="Elevate QA — página inicial">
          <LogoIsotype className="h-10 w-10" />
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {hasSession ? (
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Entrar
              </Link>
              <Link href="/register">
                <Button size="sm">Criar conta</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero — sem animação de entrada: é o candidato a LCP. */}
      <section className="mt-14 flex flex-col items-center text-center sm:mt-20">
        <span className="mb-5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          Analisar · Projetar · Aplicar
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-bold leading-[1.1] sm:text-5xl md:text-6xl">
          Sua equipe de QA,{" "}
          <span className="text-primary">do diagnóstico à correção</span>
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
          Cole uma URL e a IA testa seu site inteiro — UI, performance, SEO,
          acessibilidade e segurança. Depois entrega o plano de correção pronto
          para você aplicar, ou para sua IA de desenvolvimento aplicar por você.
        </p>

        <div className="mt-9 flex w-full max-w-xl flex-col gap-2 sm:flex-row">
          <Input
            aria-label="URL do site a analisar"
            placeholder="https://seusite.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            className="h-12 flex-1 text-base"
          />
          <Button size="lg" onClick={handleStart} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Analisar meu site <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <p className="mt-3 text-xs text-muted-foreground">
          Grátis para começar · Sem instalar nada no seu site
        </p>
      </section>

      {/* Destaques — pills + screenshot real, no espírito da home do GitHub */}
      <section className="mt-28">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold">Cinco frentes, uma ferramenta</h2>
          <p className="mt-2 text-muted-foreground">
            Da primeira varredura até o loop de reanálise automática — tudo
            dentro do mesmo produto.
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
              A Aplicação transforma os achados em um plano de mudanças concreto:
              o que alterar, em qual arquivo e como. Baixe em um documento único
              para o seu time, ou envie o pacote para a IA que você já usa para
              programar — ela aplica as correções e marca cada item como feito
              aqui, em tempo real.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1">
                <FileDown className="h-3.5 w-3.5 text-primary" /> Documento único
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1">
                <Bot className="h-3.5 w-3.5 text-primary" /> Pacote para IA de dev
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1">
                <Wrench className="h-3.5 w-3.5 text-primary" /> Checklist ao vivo
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
                  <span className={it.done ? "text-muted-foreground line-through" : ""}>
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
            <div key={m.label} className="rounded-xl border border-border p-5">
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
          A primeira análise leva alguns minutos e não exige nenhuma mudança no
          seu projeto.
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

function normalize(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
