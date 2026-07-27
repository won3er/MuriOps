"use client";

import { GitBranch } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { OrchestrationPanel } from "@/components/orchestration-panel";
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
    <Suspense fallback={null}>
      <OrquestracaoPageInner />
    </Suspense>
  );
}

function OrquestracaoPageInner() {
  const searchParams = useSearchParams();
  const { data: projects = [] } = useProjects();
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    const wanted = searchParams.get("projectId");
    if (wanted) setProjectId(wanted);
  }, [searchParams]);

  const project = projects.find((p) => p.id === projectId);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <GitBranch className="h-6 w-6 text-primary" /> Orquestração
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Automatiza o ciclo de QA: analisa o projeto, verifica os quality
          gates, gera um plano se algo não passar, aplica via as conexões
          configuradas em Aplicação e reanalisa — repetindo até bater a meta
          ou até esgotar as tentativas. O quanto ela pode agir sozinha
          depende do nível de autonomia do projeto.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-2 py-6">
          <label
            htmlFor="orquestracao-projeto"
            className="mb-1.5 block text-xs text-muted-foreground"
          >
            Projeto
          </label>
          <select
            id="orquestracao-projeto"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm sm:max-w-sm"
          >
            <option value="">Selecione um projeto…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {project ? (
        <OrchestrationPanel projectId={project.id} autonomyLevel={project.autonomyLevel} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Selecione um projeto acima para configurar a orquestração. Se ele
            ainda não tiver uma conexão em Aplicação (GitHub, WordPress...),
            configure lá antes de rodar — é o que a Orquestração usa pra
            aplicar de verdade.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
