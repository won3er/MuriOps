"use client";

import type { RemediationItem } from "@qa-ai/shared";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  FileCode2,
  Loader2,
  Trash2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import {
  useDeleteRemediationPlan,
  useRemediationPlan,
  useUpdateRemediationItem,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];
const SEVERITY_LABEL: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  info: "Informativa",
};
const SEVERITY_CLASS: Record<string, string> = {
  critical: "border-red-500/40 bg-red-500/15 text-red-300",
  high: "border-orange-500/40 bg-orange-500/15 text-orange-300",
  medium: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  low: "border-slate-500/40 bg-slate-500/15 text-slate-300",
  info: "border-sky-500/40 bg-sky-500/15 text-sky-300",
};

export default function RemediationPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: plan, isLoading } = useRemediationPlan(id);
  const toggleItem = useUpdateRemediationItem(id);
  const del = useDeleteRemediationPlan();
  const [downloading, setDownloading] = useState(false);

  const sortedItems = useMemo(() => {
    const items = plan?.result?.items ?? [];
    return [...items].sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
    );
  }, [plan?.result?.items]);

  const doneCount = sortedItems.filter((i) => i.status === "done").length;

  function remove() {
    if (!plan || !confirm(`Apagar a Aplicação "${plan.title}"?`)) return;
    del.mutate(id, {
      onSuccess: () =>
        router.push(plan.projectId ? `/projects/${plan.projectId}` : "/dashboard"),
    });
  }

  async function downloadPdf() {
    if (!plan) return;
    setDownloading(true);
    try {
      await api.downloadRemediationPdf(id);
    } finally {
      setDownloading(false);
    }
  }

  function toggle(item: RemediationItem) {
    toggleItem.mutate({
      itemId: item.id,
      status: item.status === "done" ? "pending" : "done",
    });
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <p className="text-muted-foreground">Aplicação não encontrada.</p>
        <Link href="/dashboard" className="mt-4 inline-block">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </Link>
      </div>
    );
  }

  const backHref = plan.projectId
    ? `/projects/${plan.projectId}`
    : plan.sourceType === "blueprint"
      ? `/blueprints/${plan.sourceId}`
      : "/dashboard";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={backHref}
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <h1 className="flex items-center gap-2 truncate text-2xl font-semibold">
            <Wrench className="h-5 w-5 shrink-0 text-primary" />
            {plan.title}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="uppercase">IA: {plan.provider}</span>
            <span>·</span>
            <span>
              Origem: {plan.sourceType === "analysis" ? "análise" : "blueprint"}
            </span>
            {sortedItems.length > 0 && (
              <>
                <span>·</span>
                <span className="tabular">
                  {doneCount}/{sortedItems.length} aplicado(s)
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {plan.status === "READY" && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPdf}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              PDF
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={remove}
            disabled={del.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {plan.status === "FAILED" && (
        <Card>
          <CardContent className="flex items-start gap-3 pt-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-medium">Falha ao gerar</p>
              <p className="text-sm text-muted-foreground">
                {plan.error ?? "Erro desconhecido."} Verifique a chave de IA em
                Configurações e tente de novo.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {plan.status === "PENDING" && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
            <div>
              <p className="font-medium">Montando o plano de aplicação…</p>
              <p className="text-sm text-muted-foreground">
                A IA está transformando os achados num checklist acionável.
                Esta página atualiza sozinha quando terminar.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {plan.result && plan.status === "READY" && (
        <>
          {plan.result.summary && (
            <Card>
              <CardContent className="pt-5">
                <p className="text-sm leading-relaxed">{plan.result.summary}</p>
              </CardContent>
            </Card>
          )}

          {sortedItems.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Nenhuma mudança necessária — tudo certo por aqui.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedItems.map((item) => (
                <Card
                  key={item.id}
                  className={cn(item.status === "done" && "opacity-60")}
                >
                  <CardContent className="flex gap-3 py-4">
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      disabled={toggleItem.isPending}
                      aria-label={
                        item.status === "done"
                          ? "Marcar como pendente"
                          : "Marcar como feito"
                      }
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary"
                    >
                      {item.status === "done" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "font-medium",
                            item.status === "done" && "line-through",
                          )}
                        >
                          {item.title}
                        </span>
                        <Badge className={SEVERITY_CLASS[item.severity]}>
                          {SEVERITY_LABEL[item.severity] ?? item.severity}
                        </Badge>
                        <Badge className="border-border text-muted-foreground">
                          {item.category}
                        </Badge>
                        {item.filePath && (
                          <span className="tabular flex items-center gap-1 text-xs text-muted-foreground">
                            <FileCode2 className="h-3 w-3" />
                            {item.filePath}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      {item.howTo && (
                        <p className="mt-1.5 rounded-md bg-muted/50 p-2 text-xs">
                          <span className="font-medium text-foreground">
                            Como aplicar:{" "}
                          </span>
                          <span className="text-muted-foreground">
                            {item.howTo}
                          </span>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
