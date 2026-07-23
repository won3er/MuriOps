"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Gauge,
  Loader2,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const FEATURES = [
  { icon: ScanSearch, title: "Crawler inteligente", desc: "Descobre páginas, menus e fluxos automaticamente." },
  { icon: Gauge, title: "Performance & UX", desc: "LCP, CLS, INP, cliques e usabilidade real." },
  { icon: ShieldCheck, title: "Segurança passiva", desc: "Headers, HTTPS, CSP e configurações — sem ataques." },
  { icon: Sparkles, title: "Análise por IA", desc: "Impacto, prioridade e correção em linguagem profissional." },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
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
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center px-6">
      <header className="flex w-full items-center justify-between py-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            E
          </span>
          Elevate QA
        </div>
        <nav className="flex items-center gap-3 text-sm">
          {loading ? null : user ? (
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Entrar
              </Link>
              <Link href="/register">
                <Button size="sm">Criar conta</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Sem fade-in aqui: é o conteúdo acima da dobra (candidato a LCP) —
          animar opacity de 0 atrasa o momento em que o navegador considera
          o maior elemento como "pintado", inflando o LCP medido. */}
      <section className="mt-16 flex flex-col items-center text-center">
        <span className="mb-4 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          Sua equipe de QA, elevada por IA
        </span>
        <h1 className="max-w-3xl text-balance text-5xl font-bold leading-tight">
          Eleve qualquer site ao nível de uma{" "}
          <span className="bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">
            equipe profissional de QA
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Digite uma URL. A IA navega, explora, testa fluxos e entrega um
          relatório completo de UI, UX, performance, SEO, acessibilidade e
          segurança — pronto pra você elevar o que precisar.
        </p>

        <div className="mt-8 flex w-full max-w-xl flex-col gap-2 sm:flex-row">
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
                Iniciar análise <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </section>

      <section className="mt-24 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="glass rounded-lg p-5"
          >
            <f.icon className="mb-3 h-6 w-6 text-primary" />
            <h2 className="font-medium">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </section>

      <footer className="mt-24 py-8 text-sm text-muted-foreground">
        Elevate QA — eleve a qualidade do seu site com análise automática por IA.
      </footer>
    </main>
  );
}

function normalize(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
