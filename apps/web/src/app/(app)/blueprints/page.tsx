"use client";

import {
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlueprints, useDeleteBlueprint } from "@/lib/queries";
import { cn, timeAgo } from "@/lib/utils";

const MODE_META: Record<
  string,
  { icon: typeof FileText; label: string }
> = {
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
  const { data: items = [], isLoading } = useBlueprints();
  const del = useDeleteBlueprint();

  function remove(id: string, title: string) {
    if (!confirm(`Apagar o blueprint "${title}"?`)) return;
    del.mutate(id);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Projetar</h1>
          <p className="text-muted-foreground">
            Planos de desenvolvimento com QA embutido, gerados por IA.
          </p>
        </div>
        <Link href="/blueprints/new">
          <Button>
            <Plus className="h-4 w-4" /> Novo blueprint
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 pt-5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => {
            const mode = MODE_META[b.mode] ?? MODE_META.prompt;
            const status = STATUS_META[b.status] ?? STATUS_META.PENDING;
            const deleting = del.isPending && del.variables === b.id;
            return (
              <Card
                key={b.id}
                className="h-full transition-colors hover:border-primary/50"
              >
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/blueprints/${b.id}`} className="min-w-0 flex-1">
                      <p className="truncate font-medium">{b.title}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <mode.icon className="h-3.5 w-3.5" />
                        {mode.label}
                        <span>·</span>
                        <span className="uppercase">{b.provider}</span>
                      </div>
                    </Link>
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
                  </div>
                  <Link href={`/blueprints/${b.id}`}>
                    <div className="mt-4 flex items-center justify-between">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          status.className,
                        )}
                      >
                        {status.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(b.updatedAt)}
                      </span>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
