"use client";

import type { RemediationScope } from "@qa-ai/shared";
import {
  ArrowRight,
  ChevronDown,
  FileSearch,
  GitBranch,
  Layers,
  Loader2,
  Plug,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { GithubConnectionPanel } from "@/components/github-connection-panel";
import { McpConnectionPanel } from "@/components/mcp-connection-panel";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import {
  FtpConnectionPanel,
  ShopifyConnectionPanel,
  WordpressConnectionPanel,
} from "@/components/platform-connection-panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCreateRemediationPlan,
  useProjects,
  useRemediationPlans,
} from "@/lib/queries";
import { cn, timeAgo } from "@/lib/utils";

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

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Gerando…",
  READY: "Pronta",
  FAILED: "Falhou",
};
const STATUS_CLASS: Record<string, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  READY: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  FAILED: "border-red-500/40 bg-red-500/15 text-red-300",
};
const SCOPE_LABEL: Record<string, string> = {
  qa: "Análise QA padrão",
  security: "Análise de Segurança",
  full: "Projeto completo",
};

/**
 * Aplicação é o executor final das mudanças vindas de Análise, Projetar e
 * Atualizar: exporta os achados num plano, conecta a plataforma real do
 * cliente (GitHub, MCP, WordPress, Shopify, FTP...) e aplica — manualmente ou
 * via ponte universal. Orquestração usa essas mesmas conexões pra automatizar
 * o ciclo analisar → plano → aplicar → reanalisar.
 */
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
  const {
    data: plans = [],
    isLoading,
    isError,
    refetch,
  } = useRemediationPlans();
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
        description="Transforme análises, blueprints e upgrades em planos rastreáveis para execução humana ou assistida."
      />

      {/* Exportar análises */}
      <Card>
        <CardContent className="space-y-5 py-6">
          <div>
            <h2 className="text-sm font-semibold">
              Criar aplicação a partir de um projeto
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
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

          <div className="grid gap-3 sm:grid-cols-3">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setScope(s.value)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  scope === s.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40",
                )}
              >
                <s.icon
                  className={cn(
                    "mb-2 h-5 w-5",
                    scope === s.value
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                />
                <p className="text-sm font-medium">{s.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
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
              className="flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <Plug className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
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
                </div>
                <p className="text-xs text-muted-foreground">
                  Plataformas externas — cada adapter registra o plano de uma
                  forma diferente:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <WordpressConnectionPanel projectId={projectId} />
                  <ShopifyConnectionPanel projectId={projectId} />
                  <FtpConnectionPanel projectId={projectId} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Orquestração — automatiza o ciclo usando estas mesmas conexões. */}
      <Link
        href={
          projectId ? `/orquestracao?projectId=${projectId}` : "/orquestracao"
        }
      >
        <Card className="border-primary/30 transition-colors hover:border-primary/60">
          <CardContent className="flex items-center gap-3 py-4">
            <GitBranch className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Abrir na Orquestração</p>
              <p className="text-sm text-muted-foreground">
                Continue o ciclo analisar → plano → aplicar → reanalisar com os
                checkpoints disponíveis no modo Manual.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {/* Histórico de aplicações */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-semibold">Histórico de aplicações</h2>
          <p className="text-xs text-muted-foreground">
            Planos criados por Análise, Projetar e Atualizar
          </p>
        </div>
        {isLoading ? (
          <div className="grid place-items-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <QueryErrorState
            title="Não foi possível carregar as aplicações"
            onRetry={() => void refetch()}
          />
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhuma Aplicação ainda. Selecione um projeto acima e exporte uma
              análise para começar.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/aplicacao/${plan.id}`}
                className="block"
              >
                <Card className="transition-colors hover:border-primary/50">
                  <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="truncate font-medium">{plan.title}</span>
                      <Badge className={STATUS_CLASS[plan.status]}>
                        {STATUS_LABEL[plan.status] ?? plan.status}
                      </Badge>
                      {plan.scope && (
                        <Badge className="border-border text-muted-foreground">
                          {SCOPE_LABEL[plan.scope]}
                        </Badge>
                      )}
                      {plan.status === "READY" && plan.itemCount > 0 && (
                        <span className="tabular text-xs text-muted-foreground">
                          {plan.doneCount}/{plan.itemCount} aplicado(s)
                        </span>
                      )}
                    </div>
                    <span className="tabular text-xs text-muted-foreground">
                      {timeAgo(plan.createdAt)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
