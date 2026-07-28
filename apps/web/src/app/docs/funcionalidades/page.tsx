"use client";

import { ArrowLeft, CheckCircle2, Circle, Zap } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    name: "Análise QA padrão",
    status: "available",
    desc: "Crawler + Playwright analisa performance, SEO, acessibilidade, UI/UX e console/network.",
  },
  {
    name: "Análise de Segurança",
    status: "available",
    desc: "Headers, HTTPS, CSP, TLS, DNS, segredos expostos e vulnerabilidades conhecidas.",
  },
  {
    name: "Aplicação",
    status: "available",
    desc: "Transforma achados em plano de ação — execute manualmente ou via adapters.",
  },
  {
    name: "Ponte Universal (MCP/Bridge)",
    status: "available",
    desc: "Exporte planos em markdown e aplique com sua IA de dev (Claude Code, Cursor…) sem API key.",
  },
  {
    name: "Projetar (Blueprint)",
    status: "available",
    desc: "IA desenha arquitetura, stack, quality gates e roadmap para seu projeto.",
  },
  {
    name: "Atualizar (Upgrade)",
    status: "available",
    desc: "Análise de dependências: risco, breaking changes, passo a passo de migração.",
  },
  {
    name: "Orquestração (Manual)",
    status: "available",
    desc: "Automatiza ciclo: analisar → gerar plano → aplicar → reanalisar com controle manual.",
  },
  {
    name: "Adapters: WordPress",
    status: "available",
    desc: "Aplicação automática criando páginas de rascunho no WordPress via API.",
  },
  {
    name: "Adapters: Shopify",
    status: "available",
    desc: "Aplicação automática via API do Shopify.",
  },
  {
    name: "Adapters: Nuvemshop",
    status: "available",
    desc: "Aplicação automática via API oficial de Tiendanube.",
  },
  {
    name: "Adapters: FTP",
    status: "available",
    desc: "Aplicação automática em servidores FTP (Hostinger, Hostgator, etc).",
  },
  {
    name: "GitHub Integration",
    status: "available",
    desc: "Análise de repositórios e aplicação via pull requests.",
  },
  {
    name: "Orquestração (Supervisionada)",
    status: "planned",
    desc: "Executa ciclos com aprovação manual em cada iteração.",
  },
  {
    name: "Orquestração (Autônoma)",
    status: "planned",
    desc: "Ciclos totalmente automáticos com quality gates.",
  },
  {
    name: "Wix Integration",
    status: "deferred",
    desc: "Planejado — modo plano manual apenas (sem API de aplicação automática).",
  },
  {
    name: "Squarespace Integration",
    status: "deferred",
    desc: "Planejado — modo plano manual apenas (sem API de aplicação automática).",
  },
];

const STATUS_CONFIG = {
  available: { color: "text-emerald-400", label: "Disponível", icon: CheckCircle2 },
  planned: { color: "text-blue-400", label: "Em desenvolvimento", icon: Zap },
  deferred: { color: "text-amber-400", label: "Adiado", icon: Circle },
};

export default function FuncionalidadesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-2 text-orange-400 hover:text-orange-300">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold">Status das funcionalidades</h1>
          <p className="text-lg text-slate-400">
            Veja o que está disponível, em desenvolvimento e adiado.
          </p>
        </div>

        <div className="grid gap-4">
          {FEATURES.map((f) => {
            const cfg = STATUS_CONFIG[f.status as keyof typeof STATUS_CONFIG];
            const Icon = cfg.icon;
            return (
              <Card key={f.name} className="border-slate-700 bg-slate-800/50">
                <CardContent className="flex items-start gap-4 py-4">
                  <Icon className={`mt-1 h-5 w-5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{f.name}</h3>
                      <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
