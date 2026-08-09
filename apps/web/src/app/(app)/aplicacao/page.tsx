"use client";

import type { RemediationScope } from "@qa-ai/shared";
import {
  ChevronDown,
  FileSearch,
  Layers,
  Loader2,
  Plug,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { GithubConnectionPanel } from "@/components/github-connection-panel";
import { GitlabConnectionPanel } from "@/components/gitlab-connection-panel";
import { McpConnectionPanel } from "@/components/mcp-connection-panel";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCreateRemediationPlan,
  useProjects,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

const SCOPES: {
  value: RemediationScope;
  label: string;
  description: string;
  icon: typeof FileSearch;
}[] = [
  {
    value: "qa",
    label: "Análise QA padrão",
    description: "Exporta a Análise QA padrão mais recente do projeto.",
    icon: FileSearch,
  },
  {
    value: "security",
    label: "Análise de Segurança",
    description: "Exporta a Análise de Segurança mais recente do projeto.",
    icon: ShieldAlert,
  },
  {
    value: "full",
    label: "Projeto completo",
    description: "As duas análises juntas num único plano de aplicação.",
    icon: Layers,
  },
];


export default function AplicacaoPage() {
  return (
    <Suspense
      fallback={
        <div
          className="grid place-items-center py-24 text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="mt-3 text-sm">Preparando aplicações…</span>
        </div>
      }
    >
      <AplicacaoPageInner />
    </Suspense>
  );
}

function AplicacaoPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data: projects = [],
    isError: projectsError,
    refetch: refetchProjects,
  } = useProjects();
  const createPlan = useCreateRemediationPlan();

  const [projectId, setProjectId] = useState("");
  const [scope, setScope] = useState<RemediationScope>("full");
  const [connectionsOpen, setConnectionsOpen] = useState(false);

  useEffect(() => {
    const wanted = searchParams.get("projectId");
    if (wanted) setProjectId(wanted);
    if (searchParams.get("view") === "connections") setConnectionsOpen(true);
  }, [searchParams]);

  function exportar() {
    if (!projectId) return;
    createPlan.mutate(
      { sourceType: "project", sourceId: projectId, scope },
      { onSuccess: (plan) => router.push(`/aplicacao/${plan.id}`) },
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow="Ciclo de qualidade"
        title="Aplicações"
        description="Converta um resultado do MuriOps em uma lista de trabalho clara para seu time ou sua ferramenta de desenvolvimento."
      />

      <Card>
        <CardContent className="grid gap-4 py-5 text-sm md:grid-cols-3">
          <div>
            <p className="font-medium">1. Você envia um resultado</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Por exemplo: uma análise encontrou contraste ruim, erros de SEO e um header ausente.
            </p>
          </div>
          <div>
            <p className="font-medium">2. O MuriOps organiza o trabalho</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Cada achado vira um item priorizado, com evidência e orientação para quem vai executar.
            </p>
          </div>
          <div>
            <p className="font-medium">3. Seu time executa e atualiza</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Use o checklist, PDF, MCP ou uma pull request no GitHub. O MuriOps acompanha o status, mas não altera nem faz merge de código sozinho.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Exportar análises */}
      <Card>
        <CardContent className="space-y-5 py-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Criar aplicação a partir de um projeto
              </h2>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Escolha quais análises concluídas devem compor o novo plano.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label
                htmlFor="aplicacao-projeto"
                className="mb-1.5 block text-xs text-muted-foreground"
              >
                Projeto
              </label>
              <select
                id="aplicacao-projeto"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
              >
                <option value="">Selecione um projeto…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {projectsError && (
                <div className="mt-3">
                  <QueryErrorState
                    compact
                    title="Projetos indisponíveis"
                    description="Não foi possível carregar as opções."
                    onRetry={() => void refetchProjects()}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setScope(s.value)}
                className={cn(
                  "rounded-md border p-4 text-left transition-colors hover:border-foreground/30",
                  scope === s.value
                    ? "border-primary bg-primary/[0.04]"
                    : "border-border",
                )}
              >
                <div className="flex items-center justify-between">
                  <s.icon
                    className={cn(
                      "h-4 w-4",
                      scope === s.value
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                  {scope === s.value && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-2.5 text-sm font-medium">{s.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {s.description}
                </p>
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={exportar}
              disabled={!projectId || createPlan.isPending}
            >
              {createPlan.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4" />
              )}
              Gerar plano de aplicação
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conexões e integrações — aqui, não em Projetos: Aplicação é o executor final. */}
      <div>
        {!projectId ? (
          <p className="text-sm text-muted-foreground">
            Selecione um projeto para consultar e configurar as conexões
            disponíveis.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConnectionsOpen((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm transition-colors hover:border-foreground/30"
            >
              <Plug className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Conexões e integrações deste projeto
              </span>
              <ChevronDown
                className={cn(
                  "ml-auto h-4 w-4 text-muted-foreground transition-transform",
                  connectionsOpen && "rotate-180",
                )}
              />
            </button>
            {connectionsOpen && (
              <div className="mt-3 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <McpConnectionPanel projectId={projectId} />
                  <GithubConnectionPanel projectId={projectId} />
                  <GitlabConnectionPanel projectId={projectId} />
                </div>
                <p className="text-xs text-muted-foreground">
                  GitHub e GitLab registram o plano em uma pull/merge request.
                  MCP disponibiliza o contexto para a sua ferramenta de
                  desenvolvimento executar e sincronizar cada etapa. Conectar
                  GitHub ou GitLab também é obrigatório para rodar qualquer
                  análise neste projeto.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
