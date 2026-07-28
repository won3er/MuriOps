"use client";

import { ArrowRight, Globe2, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateProject, useDeleteProject, useProjects } from "@/lib/queries";
import { cn, scoreColor, timeAgo } from "@/lib/utils";

export default function ProjectsPage() {
  const { data: projects = [], isLoading, isError, refetch } = useProjects();
  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function removeProject(id: string, projectName: string) {
    if (
      !confirm(
        `Apagar o projeto "${projectName}"? Todas as análises, problemas e evidências relacionados serão apagados permanentemente.`,
      )
    )
      return;
    setError(null);
    deleteMutation.mutate(id, {
      onError: (err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível apagar o projeto.",
        ),
    });
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setError(null);
    createMutation.mutate(
      { name: name.trim(), url: url.trim() },
      {
        onSuccess: () => {
          setName("");
          setUrl("");
        },
        onError: (err) =>
          setError(
            err instanceof Error ? err.message : "Falha ao criar projeto",
          ),
      },
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow="Workspace"
        title="Projetos"
        description="Organize os sites que serão analisados e acompanhe a qualidade de cada um."
      />

      <section className="rounded-lg border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Cadastrar projeto</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Informe uma URL pública que você administra ou tem autorização para
            testar.
          </p>
        </div>
        <div className="p-5">
          <form
            onSubmit={create}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:items-end"
          >
            <div className="space-y-1.5">
              <label htmlFor="project-name" className="text-sm font-medium">
                Nome
              </label>
              <Input
                id="project-name"
                placeholder="Meu site"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="project-url" className="text-sm font-medium">
                URL
              </label>
              <Input
                id="project-url"
                type="url"
                inputMode="url"
                placeholder="https://exemplo.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={createMutation.isPending || !name.trim() || !url.trim()}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Criando…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Criar projeto
                </>
              )}
            </Button>
          </form>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 border-b p-4 last:border-b-0">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState
          title="Não foi possível carregar os projetos"
          onRetry={() => void refetch()}
        />
      ) : projects.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          Nenhum projeto cadastrado. Use o formulário acima para criar o
          primeiro.
        </div>
      ) : (
        <div>
          <div className="mb-3">
            <h2 className="text-base font-semibold">Projetos do workspace</h2>
            <p className="text-xs text-muted-foreground">
              {projects.length} projeto(s) cadastrado(s)
            </p>
          </div>
          <div className="divide-y overflow-hidden rounded-lg border bg-card">
            {projects.map((p) => (
              <div
                key={p.id}
                className="group grid gap-3 px-4 py-3.5 hover:bg-accent/40 sm:grid-cols-[minmax(0,1fr)_100px_140px_72px] sm:items-center"
              >
                <Link
                  href={`/projects/${p.id}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border bg-muted">
                    <Globe2 className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium group-hover:text-primary">
                      {p.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.url}
                    </span>
                  </span>
                </Link>
                {p.lastScore !== null && (
                  <span
                    className={cn(
                      "tabular text-lg font-semibold",
                      scoreColor(p.lastScore),
                    )}
                  >
                    {p.lastScore}
                  </span>
                )}
                <div className="text-xs text-muted-foreground">
                  <p>{p.analysisCount} análise(s)</p>
                  <p>{timeAgo(p.lastAnalysisAt)}</p>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={
                      deleteMutation.isPending &&
                      deleteMutation.variables === p.id
                    }
                    onClick={() => removeProject(p.id, p.name)}
                    aria-label="Apagar projeto"
                  >
                    {deleteMutation.isPending &&
                    deleteMutation.variables === p.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Link
                    href={`/projects/${p.id}`}
                    aria-label={`Abrir ${p.name}`}
                    className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"
                  >
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
