"use client";

import { Info, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { OrchestrationPanel } from "@/components/orchestration-panel";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { useProjects } from "@/lib/queries";

/**
 * Orquestração automatiza o ciclo analisar → plano → aplicar → reanalisar.
 * Depende de Análise (pra analisar/reanalisar) e de Aplicação (pra aplicar,
 * usando as conexões configuradas lá) — ela não aplica nada sozinha, só
 * decide quando e quantas vezes repetir o ciclo, dentro do nível de
 * autonomia escolhido pra cada projeto.
 */
export default function OrquestracaoPage() {
  return (
    <Suspense
      fallback={
        <div
          className="grid place-items-center py-24 text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="mt-3 text-sm">Preparando orquestrações…</span>
        </div>
      }
    >
      <OrquestracaoPageInner />
    </Suspense>
  );
}

function OrquestracaoPageInner() {
  const searchParams = useSearchParams();
  const { data: projects = [], isLoading, isError, refetch } = useProjects();
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    const wanted = searchParams.get("projectId");
    if (wanted) setProjectId(wanted);
  }, [searchParams]);

  const project = projects.find((p) => p.id === projectId);

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow="Ciclo de qualidade"
        title="Orquestrações"
        description="Coordene análise, quality gates, plano, aplicação e reanálise dentro de uma execução rastreável."
      />

      <aside className="flex gap-3 rounded-lg border border-primary/25 bg-primary/[0.06] p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm leading-6 text-muted-foreground">
          <strong className="text-foreground">Manual</strong> espera sua
          aprovação a cada iteração.{" "}
          <strong className="text-foreground">Supervisionado</strong> segue
          sozinho enquanto a aplicação der certo e a nota não piorar.{" "}
          <strong className="text-foreground">Autônomo</strong> segue até bater
          os quality gates ou o limite de iterações. Em todos, os adapters
          registram checklists ou rascunhos — a publicação final continua sendo
          humana.
        </p>
      </aside>

      <Card>
        <CardContent className="space-y-2 py-6">
          <label
            htmlFor="orquestracao-projeto"
            className="mb-1.5 block text-sm font-medium"
          >
            Projeto
          </label>
          <select
            id="orquestracao-projeto"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm sm:max-w-sm"
            disabled={isLoading || isError}
          >
            <option value="">Selecione um projeto…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {isLoading && (
            <p
              className="flex items-center gap-2 text-xs text-muted-foreground"
              role="status"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Carregando projetos…
            </p>
          )}
          {isError && (
            <QueryErrorState
              compact
              title="Projetos indisponíveis"
              description="Não foi possível carregar as opções de orquestração."
              onRetry={() => void refetch()}
            />
          )}
        </CardContent>
      </Card>

      {isLoading || isError ? null : project ? (
        <OrchestrationPanel
          projectId={project.id}
          autonomyLevel={project.autonomyLevel}
        />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Selecione um projeto para consultar quality gates, conexões e
            execuções. As conexões são configuradas em Aplicações.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
