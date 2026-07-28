"use client";

import {
  ArrowRight,
  Bot,
  BookOpen,
  Database,
  FileCode2,
  Github,
  Lock,
  Network,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { LogoIsotype } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-2">
            <LogoIsotype className="h-8 w-8" />
            <span className="font-semibold">Elevate QA</span>
          </Link>
          <Link href="/dashboard">
            <Button size="sm">Ir para o app</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12">
        <div className="mb-12 space-y-4">
          <h1 className="text-4xl font-bold">Documentação</h1>
          <p className="text-lg text-slate-400">
            Entenda como funciona cada funcionalidade do Elevate QA e as tecnologias que usamos.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Guia de uso */}
          <Card className="border-slate-700 bg-slate-800/50 p-6 hover:border-orange-500/50 hover:bg-slate-800">
            <Link href="/docs/guia" className="group">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold group-hover:text-orange-400">
                    <BookOpen className="h-5 w-5" />
                    Guia de uso
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Aprenda a usar cada funcionalidade: Análise, Aplicação, Orquestração, Projetar e Atualizar.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-600 group-hover:translate-x-1 group-hover:text-orange-400" />
              </div>
            </Link>
          </Card>

          {/* Status das funcionalidades */}
          <Card className="border-slate-700 bg-slate-800/50 p-6 hover:border-orange-500/50 hover:bg-slate-800">
            <Link href="/docs/funcionalidades" className="group">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold group-hover:text-orange-400">
                    <Zap className="h-5 w-5" />
                    Status das funcionalidades
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Veja o que está disponível, em desenvolvimento e o que está planejado.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-600 group-hover:translate-x-1 group-hover:text-orange-400" />
              </div>
            </Link>
          </Card>

          {/* Integrações & tecnologias */}
          <Card className="border-slate-700 bg-slate-800/50 p-6 hover:border-orange-500/50 hover:bg-slate-800 md:col-span-2">
            <Link href="/docs/integracoes" className="group">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold group-hover:text-orange-400">
                    <Network className="h-5 w-5" />
                    Integrações & Tecnologias
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Conheça as tecnologias que Elevate QA suporta: WordPress, Shopify, FTP, GitHub,
                    MCP e modelos de IA (Claude, OpenAI, Gemini).
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-600 group-hover:translate-x-1 group-hover:text-orange-400" />
              </div>
            </Link>
          </Card>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/50 px-6 py-6 text-center text-sm text-slate-500">
        <p>Elevate QA © 2026 · Análise de QA para sites com IA</p>
      </footer>
    </div>
  );
}
