"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GuiaPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-2 text-orange-400 hover:text-orange-300">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold">Como usar o Elevate QA</h1>
          <p className="text-lg text-slate-400">
            Guia passo a passo de cada funcionalidade da plataforma.
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-2xl font-semibold">1. Análise</h2>
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="pt-6">
                <p className="mb-4 text-slate-300">
                  Analisa um site em busca de problemas de QA, performance, SEO, acessibilidade e segurança.
                </p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li>• Selecione um projeto na seção <strong>Análise</strong></li>
                  <li>• Escolha entre <strong>Análise QA padrão</strong> ou <strong>Análise de Segurança</strong></li>
                  <li>• Aguarde a conclusão (alguns minutos)</li>
                  <li>• Revise o relatório com notas por dimensão</li>
                  <li>• Clique em <strong>Enviar para Aplicação</strong> quando pronto</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">2. Aplicação</h2>
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="pt-6">
                <p className="mb-4 text-slate-300">
                  Transforma análises, blueprints e planos de atualização em checklists aplicáveis.
                </p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li>• A seção <strong>Aplicação</strong> é o executor final de tudo</li>
                  <li>• Exporte planos em PDF ou markdown para passar à sua IA de desenvolvimento</li>
                  <li>• Use a <strong>ponte universal</strong>: copie o pacote e cole no Claude Code, Windsurf, Cursor…</li>
                  <li>• Marque itens como "Feito" conforme aplica as mudanças</li>
                  <li>• Conecte adapters (WordPress, Shopify, FTP…) para aplicação automática</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">3. Orquestração</h2>
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="pt-6">
                <p className="mb-4 text-slate-300">
                  Automatiza o ciclo: analisar → avaliar → gerar plano → aplicar → reanalisar.
                </p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li>• Selecione um projeto e escolha uma conexão (GitHub, WordPress, MCP…)</li>
                  <li>• Defina o nível de autonomia (atualmente apenas Manual está disponível)</li>
                  <li>• A execução passa por iterações até passar nos quality gates ou parar</li>
                  <li>• Com conexão push (GitHub, WordPress…), aplicação é automática</li>
                  <li>• Com MCP ou ponte, sua IA de dev marca os itens, e a orquestração retoma sozinha</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">4. Projetar</h2>
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="pt-6">
                <p className="mb-4 text-slate-300">
                  A IA desenha um plano técnico completo para seu projeto: stack, riscos, quality gates, roadmap.
                </p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li>• Descreva o projeto (problema, escopo, restrições)</li>
                  <li>• A IA gera arquitetura, tecnologias recomendadas e estratégia de teste</li>
                  <li>• Revise o plano e baixe em PDF se quiser</li>
                  <li>• Clique em <strong>Enviar para Aplicação</strong> para converter em checklist de mudanças</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">5. Atualizar</h2>
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="pt-6">
                <p className="mb-4 text-slate-300">
                  Cole um package.json e a IA gera um plano de atualização de dependências com análise de risco.
                </p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li>• Cole seu package.json na seção <strong>Atualizar</strong></li>
                  <li>• A IA avalia risco, breaking changes e passos de migração</li>
                  <li>• Marque itens como feitos conforme realiza as atualizações</li>
                  <li>• Ou clique em <strong>Enviar para Aplicação</strong> para unificar com o executor final</li>
                </ul>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
