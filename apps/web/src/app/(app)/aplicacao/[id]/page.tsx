"use client";

import type { RemediationItem } from "@qa-ai/shared";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Circle,
  ClipboardCopy,
  Download,
  FileCode2,
  Loader2,
  Trash2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QueryErrorState } from "@/components/query-error-state";
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
  const { data: plan, isLoading, isError, refetch } = useRemediationPlan(id);
  const toggleItem = useUpdateRemediationItem(id);
  const del = useDeleteRemediationPlan();
  const [downloading, setDownloading] = useState(false);
  const [bridgeAction, setBridgeAction] = useState<"copy" | "download" | null>(
    null,
  );

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
        router.push(
          plan.projectId ? `/projects/${plan.projectId}` : "/dashboard",
        ),
    });
  }

  async function downloadPdf() {
    if (!plan) return;
    setDownloading(true);
    try {
      await api.downloadRemediationPdf(id);
      toast.success("Documento preparado para download");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível baixar o documento.",
      );
    } finally {
      setDownloading(false);
    }
  }

  /** Baixa o pacote da ponte universal (.md) pra entregar à IA de dev. */
  async function downloadBridge() {
    setBridgeAction("download");
    try {
      await api.downloadRemediationBridge(id);
      toast.success("Pacote Markdown preparado para download");
    } catch {
      toast.error("Não foi possível gerar o pacote Markdown");
    } finally {
      setBridgeAction(null);
    }
  }

  /** Copia o pacote pra colar direto no chat da IA (Claude Code, Windsurf...). */
  async function copyBridge() {
    setBridgeAction("copy");
    try {
      const text = await api.fetchRemediationBridge(id);
      await navigator.clipboard.writeText(text);
      toast.success("Pacote copiado — cole na sua IA de desenvolvimento");
    } catch {
      toast.error("Não foi possível copiar o pacote");
    } finally {
      setBridgeAction(null);
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

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <QueryErrorState
          title="Não foi possível carregar esta aplicação"
          onRetry={() => void refetch()}
        />
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

  const backHref =
    plan.sourceType === "blueprint" && !plan.projectId
      ? `/blueprints/${plan.sourceId}`
      : plan.sourceType === "upgrade"
        ? `/atualizar/${plan.sourceId}`
        : "/aplicacao";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={backHref}
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <h1 className="flex items-start gap-2 break-words text-2xl font-semibold">
            <Wrench className="h-5 w-5 shrink-0 text-primary" />
            {plan.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="uppercase">IA: {plan.provider}</span>
            <span>·</span>
            <span>
              Origem:{" "}
              {plan.sourceType === "analysis"
                ? "análise"
                : plan.sourceType === "blueprint"
                  ? "blueprint"
                  : plan.sourceType === "upgrade"
                    ? "atualização de dependências"
                    : plan.scope === "qa"
                      ? "projeto · Análise QA padrão"
                      : plan.scope === "security"
                        ? "projeto · Análise de Segurança"
                        : "projeto · completo"}
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
        <div className="flex flex-wrap gap-2">
          {plan.status === "READY" && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPdf}
              disabled={downloading}
              title="Documento único com todas as mudanças, para aplicar manualmente"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Baixar documento
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={remove}
            disabled={del.isPending}
            aria-label="Apagar plano de aplicação"
            title="Apagar plano de aplicação"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {plan.status === "FAILED" && (
        <Card>
          <CardContent className="flex items-start gap-3 pt-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-medium">Não deu para gerar a Aplicação</p>
              <p className="text-sm text-muted-foreground">
                A IA configurada não respondeu corretamente. Confira a chave de
                API em Configurações e tente de novo.
              </p>
              {plan.error && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none hover:text-foreground">
                    Detalhe técnico
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-black/30 p-2 font-mono text-[11px]">
                    {plan.error}
                  </pre>
                </details>
              )}
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
                A IA está transformando os achados num checklist acionável. Esta
                página atualiza sozinha quando terminar.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {plan.result && plan.status === "READY" && (
        <>
          {/* Ponte universal — aplicação direta via IA do ambiente de dev */}
          <Card className="border-primary/30">
            <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">
                    Aplicar direto no desenvolvimento
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Copie o pacote e cole na sua IA de desenvolvimento (Claude
                    Code, Windsurf, Codex, Cursor…). Ela aplica as mudanças e
                    marca cada item como “Feito” aqui, em tempo real.
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">
                <Button
                  size="sm"
                  onClick={copyBridge}
                  disabled={bridgeAction !== null}
                >
                  {bridgeAction === "copy" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ClipboardCopy className="h-3.5 w-3.5" />
                  )}
                  {bridgeAction === "copy" ? "Copiando…" : "Copiar pacote"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadBridge}
                  disabled={bridgeAction !== null}
                >
                  {bridgeAction === "download" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {bridgeAction === "download" ? "Baixando…" : "Baixar .md"}
                </Button>
              </div>
            </CardContent>
          </Card>

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
                          <span className="tabular flex min-w-0 items-start gap-1 break-all text-xs text-muted-foreground">
                            <FileCode2 className="mt-0.5 h-3 w-3 shrink-0" />
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
