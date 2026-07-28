"use client";

import {
  ArrowRight,
  DraftingCompass,
  FileText,
  Loader2,
  Network,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlueprints, useDeleteBlueprint } from "@/lib/queries";
import { cn, timeAgo } from "@/lib/utils";

const MODE_META: Record<string, { icon: typeof FileText; label: string }> = {
  form: { icon: FileText, label: "Formulário" },
  canvas: { icon: Network, label: "Canvas" },
  prompt: { icon: Sparkles, label: "Prompt" },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  READY: { label: "Pronto", className: "text-emerald-400 bg-emerald-400/10" },
  PENDING: { label: "Gerando", className: "text-amber-400 bg-amber-400/10" },
  FAILED: { label: "Falhou", className: "text-red-400 bg-red-400/10" },
};

export default function BlueprintsPage() {
  const { data: items = [], isLoading, isError, refetch } = useBlueprints();
  const del = useDeleteBlueprint();

  function remove(id: string, title: string) {
    if (!confirm(`Apagar o blueprint "${title}"?`)) return;
    del.mutate(id);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow="Ciclo de qualidade"
        title="Projetar"
        description="Planeje arquitetura, testes, riscos e critérios de qualidade antes da implementação."
        actions={
          <Link href="/blueprints/new">
            <Button size="sm">
              <Plus className="h-4 w-4" /> Novo blueprint
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="divide-y overflow-hidden rounded-lg border bg-card">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState
          title="Não foi possível carregar os blueprints"
          onRetry={() => void refetch()}
        />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/15 text-primary">
              <DraftingCompass className="h-7 w-7" />
            </div>
            <div>
              <p className="font-medium">Nenhum blueprint ainda</p>
              <p className="text-sm text-muted-foreground">
                Descreva um projeto e receba arquitetura, stack, estratégia de
                teste, riscos e quality gates.
              </p>
            </div>
            <Link href="/blueprints/new">
              <Button>
                <Plus className="h-4 w-4" /> Criar o primeiro
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="mb-3">
            <h2 className="text-base font-semibold">Blueprints</h2>
            <p className="text-xs text-muted-foreground">
              {items.length} plano(s) registrado(s)
            </p>
          </div>
          <div className="divide-y overflow-hidden rounded-lg border bg-card">
            {items.map((b) => {
              const mode = MODE_META[b.mode] ?? MODE_META.prompt;
              const status = STATUS_META[b.status] ?? STATUS_META.PENDING;
              const deleting = del.isPending && del.variables === b.id;
              return (
                <div
                  key={b.id}
                  className="group grid gap-3 px-4 py-3.5 transition-colors hover:bg-accent/40 sm:grid-cols-[minmax(0,1fr)_120px_100px_70px] sm:items-center"
                >
                  <Link href={`/blueprints/${b.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium group-hover:text-primary">
                      {b.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <mode.icon className="h-3.5 w-3.5" />
                      {mode.label}
                      <span>·</span>
                      <span className="uppercase">{b.provider}</span>
                    </div>
                  </Link>
                  <span
                    className={cn(
                      "w-fit rounded-full px-2 py-0.5 text-[11px] font-medium",
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(b.updatedAt)}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={deleting}
                      onClick={() => remove(b.id, b.title)}
                      aria-label="Apagar blueprint"
                    >
                      {deleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Link
                      href={`/blueprints/${b.id}`}
                      aria-label={`Abrir ${b.title}`}
                      className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"
                    >
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
