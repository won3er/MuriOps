"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const INTEGRATIONS = [
  {
    category: "Aplicação Automática (Push)",
    items: [
      {
        name: "WordPress",
        desc: "Cria páginas de rascunho com o checklist de mudanças via API REST + Application Password.",
      },
      {
        name: "Shopify",
        desc: "Aplicação automática via Admin REST API de Shopify.",
      },
      {
        name: "FTP",
        desc: "Escreve arquivos markdown diretamente em servidores FTP (Hostinger, Hostgator, etc).",
      },
      {
        name: "GitHub",
        desc: "Cria pull requests com as mudanças propostas.",
      },
    ],
  },
  {
    category: "Integração com IA",
    items: [
      {
        name: "Claude (Anthropic)",
        desc: "Configure sua chave de API em Configurações. Elevate usa Claude para gerar planos de análise, blueprint e atualização.",
      },
      {
        name: "OpenAI",
        desc: "Suporta modelos como GPT-4. Configure em Configurações.",
      },
      {
        name: "Gemini (Google)",
        desc: "Integração com modelos Gemini Flash. Configure em Configurações.",
      },
      {
        name: "MCP (Model Context Protocol)",
        desc: "Conecte seu próprio servidor MCP — permite usar sua IA do VS Code (Claude Code, Windsurf, Cursor…) sem compartilhar API keys.",
      },
    ],
  },
  {
    category: "Ponte Universal",
    items: [
      {
        name: "Claude Code",
        desc: "Acesse planos de remediação via MCP ou pelo markdown exportado. Marque itens como feitos em tempo real.",
      },
      {
        name: "Windsurf",
        desc: "Suporte via ponte universal — copie o markdown e cole no chat da IA.",
      },
      {
        name: "Cursor",
        desc: "Aplicação manual via pacote markdown da ponte universal.",
      },
      {
        name: "Codex",
        desc: "Qualquer IA de dev que entenda markdown — exporte e integre como precisar.",
      },
    ],
  },
];

export default function IntegracaoesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-2 text-orange-400 hover:text-orange-300">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold">Integrações & Tecnologias</h1>
          <p className="text-lg text-slate-400">
            Conheça as plataformas, provedores de IA e pontes que Elevate QA suporta.
          </p>
        </div>

        <div className="space-y-12">
          {INTEGRATIONS.map((section) => (
            <section key={section.category}>
              <h2 className="mb-6 text-2xl font-semibold text-orange-400">{section.category}</h2>
              <div className="grid gap-4">
                {section.items.map((item) => (
                  <Card key={item.name} className="border-slate-700 bg-slate-800/50">
                    <CardContent className="py-4">
                      <h3 className="font-medium text-slate-100">{item.name}</h3>
                      <p className="mt-2 text-sm text-slate-400">{item.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}

          <section className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
            <h2 className="mb-4 font-semibold text-orange-400">Princípio: Traga sua própria chave</h2>
            <p className="text-slate-400">
              Elevate QA não armazena chaves de API no servidor. Cada organização configura sua própria chave
              de IA em Configurações, criptografada e salva apenas no banco. Sem chave, os análises degradam
              para resultados determinísticos (sem IA real) — nunca existe fallback silencioso.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
