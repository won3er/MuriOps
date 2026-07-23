"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateProject, useDeleteProject, useProjects } from "@/lib/queries";
import { cn, scoreColor, timeAgo } from "@/lib/utils";

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
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
    deleteMutation.mutate(id);
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setError(null);
    createMutation.mutate(
      { name, url },
      {
        onSuccess: () => {
          setName("");
          setUrl("");
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : "Falha ao criar projeto"),
      },
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Projetos</h1>
        <p className="text-muted-foreground">
          Cadastre sites para analisar e monitorar.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form
            onSubmit={create}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input
                placeholder="Meu site"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">URL</label>
              <Input
                placeholder="https://exemplo.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Criar
                </>
              )}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 pt-5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Card key={p.id} className="h-full transition-colors hover:border-primary/50">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.url}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  {p.lastScore !== null && (
                    <span
                      className={cn("text-xl font-bold", scoreColor(p.lastScore))}
                    >
                      {p.lastScore}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={
                      deleteMutation.isPending && deleteMutation.variables === p.id
                    }
                    onClick={() => removeProject(p.id, p.name)}
                    aria-label="Apagar projeto"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === p.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
              <Link href={`/projects/${p.id}`}>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.analysisCount} análise(s)</span>
                  <span>{timeAgo(p.lastAnalysisAt)}</span>
                </div>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}
