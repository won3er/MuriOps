"use client";

import type { UpgradeItem } from "@qa-ai/shared";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpCircle,
  Bot,
  CheckCircle2,
  Circle,
  ClipboardCopy,
  Download,
  FileCode2,
  Loader2,
  Network,
  PackageSearch,
  ShieldCheck,
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
  useCreateRemediationPlan,
  useDeleteUpgradePlan,
  useUpdateUpgradeItem,
  useUpgradePlan,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

const RISK_ORDER = ["critical", "high", "medium", "low"];
const RISK_LABEL: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};
const RISK_CLASS: Record<string, string> = {
  critical: "border-red-500/40 bg-red-500/15 text-red-300",
  high: "border-orange-500/40 bg-orange-500/15 text-orange-300",
  medium: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  low: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
};

export default function UpgradePlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: plan, isLoading, isError, refetch } = useUpgradePlan(id);
  const toggleItem = useUpdateUpgradeItem(id);
  const del = useDeleteUpgradePlan();
  const createRemediation = useCreateRemediationPlan();
  const [downloading, setDownloading] = useState(false);
  const [bridgeAction, setBridgeAction] = useState<"copy" | "download" | null>(
    null,
  );

  const orderedItems = useMemo(() => {
    const items = plan?.result?.items ?? [];
    const order = plan?.result?.recommendedOrder ?? [];
    if (order.length === 0) {
      return [...items].sort(
        (a, b) =>
          RISK_ORDER.indexOf(a.riskLevel) - RISK_ORDER.indexOf(b.riskLevel),
      );
    }
    const byId = new Map(items.map((i) => [i.id, i]));
    const sorted = order
      .map((oid) => byId.get(oid))
      .filter((i): i is UpgradeItem => !!i);
    const rest = items.filter((i) => !order.includes(i.id));
    return [...sorted, ...rest];
  }, [plan?.result?.items, plan?.result?.recommendedOrder]);

  const doneCount = orderedItems.filter((i) => i.status === "done").length;

  function remove() {
    if (!plan || !confirm(`Apagar a Atualização "${plan.title}"?`)) return;
    del.mutate(id, {
      onSuccess: () =>
        router.push(
          plan.projectId ? `/projects/${plan.projectId}` : "/atualizar",
        ),
    });
  }

  async function downloadPdf() {
    if (!plan) return;
    setDownloading(true);
    try {
      await api.downloadUpgradePdf(id);
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
      await api.downloadUpgradeBridge(id);
      toast.success("Pacote Markdown preparado para download");
    } catch {
      toast.error("Não foi possível gerar o pacote Markdown");
    } finally {
      setBridgeAction(null);
    }
  }

  function sendToApplication() {
    if (!plan) return;
    createRemediation.mutate(
      { sourceType: "upgrade", sourceId: plan.id },
      { onSuccess: (rp) => router.push(`/aplicacao/${rp.id}`) },
    );
  }

  /** Leva um plano "não pronto" pro Projetar já com o contexto preenchido. */
  function sendToBlueprint() {
    if (!plan?.result?.readiness) return;
    const { reasoning, blockers } = plan.result.readiness;
    const promptText = [
      `O plano de atualização "${plan.title}" foi avaliado como NÃO PRONTO para aplicar com segurança.`,
      "",
      `Avaliação: ${reasoning}`,
      "",
      "O que falta resolver antes de atualizar as dependências:",
      ...blockers.map((b) => `- ${b}`),
      "",
      "Desenhe um plano para colocar este projeto em condições de receber a atualização com segurança (testes, CI, ambiente de staging conforme aplicável).",
    ].join("\n");
    const params = new URLSearchParams({
      prompt: promptText,
      title: `Prontidão para atualizar — ${plan.title}`,
    });
    if (plan.projectId) params.set("projectId", plan.projectId);
    router.push(`/blueprints/new?${params.toString()}`);
  }

  /** Copia o pacote pra colar direto no chat da IA (Claude Code, Windsurf...). */
  async function copyBridge() {
    setBridgeAction("copy");
    try {
      const text = await api.fetchUpgradeBridge(id);
      await navigator.clipboard.writeText(text);
      toast.success("Pacote copiado — cole na sua IA de desenvolvimento");
    } catch {
      toast.error("Não foi possível copiar o pacote");
    } finally {
      setBridgeAction(null);
    }
  }

  function toggle(item: UpgradeItem) {
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
          title="Não foi possível carregar esta atualização"
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <p className="text-muted-foreground">Atualização não encontrada.</p>
        <Link href="/atualizar" className="mt-4 inline-block">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/atualizar"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <h1 className="flex items-start gap-2 break-words text-2xl font-semibold">
            <ArrowUpCircle className="h-5 w-5 shrink-0 text-primary" />
            {plan.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="uppercase">IA: {plan.provider}</span>
            {plan.result?.overallRisk && (
              <>
                <span>·</span>
                <Badge className={RISK_CLASS[plan.result.overallRisk]}>
                  Risco geral:{" "}
                  {RISK_LABEL[plan.result.overallRisk] ??
                    plan.result.overallRisk}
                </Badge>
              </>
            )}
            {orderedItems.length > 0 && (
              <>
                <span>·</span>
                <span className="tabular">
                  {doneCount}/{orderedItems.length} atualizado(s)
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
              onClick={sendToApplication}
              disabled={createRemediation.isPending}
              title="Transforma este plano de atualização num checklist de mudanças aplicáveis"
            >
              {createRemediation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wrench className="h-3.5 w-3.5" />
              )}
              Enviar para Aplicação
            </Button>
          )}
          {plan.status === "READY" && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPdf}
              disabled={downloading}
              title="Documento único com todas as atualizações, para aplicar manualmente"
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
            aria-label="Apagar plano de atualização"
            title="Apagar plano de atualização"
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
              <p className="font-medium">
                Não deu para gerar o plano de atualização
              </p>
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
              <p className="font-medium">Analisando as dependências…</p>
              <p className="text-sm text-muted-foreground">
                A IA está avaliando risco, breaking changes e o passo a passo de
                migração de cada pacote. Esta página atualiza sozinha quando
                terminar.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {plan.result && plan.status === "READY" && (
        <>
          {/* Ponte universal — atualização direta via IA do ambiente de dev */}
          <Card className="border-primary/30">
            <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">
                    Atualizar direto no desenvolvimento
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Copie o pacote e cole na sua IA de desenvolvimento (Claude
                    Code, Windsurf, Codex, Cursor…). Ela migra as dependências
                    na ordem recomendada e marca cada item como “Feito” aqui, em
                    tempo real.
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

          {plan.result.readiness && (
            <Card
              className={cn(
                plan.result.readiness.ready
                  ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                  : "border-amber-500/30 bg-amber-500/[0.06]",
              )}
            >
              <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  {plan.result.readiness.ready ? (
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                  )}
                  <div className="space-y-2">
                    <p className="font-medium">
                      {plan.result.readiness.ready
                        ? "Projeto pronto para receber esta atualização"
                        : "Projeto ainda não está pronto para esta atualização"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {plan.result.readiness.reasoning}
                    </p>
                    {plan.result.readiness.blockers.length > 0 && (
                      <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                        {plan.result.readiness.blockers.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                {!plan.result.readiness.ready && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={sendToBlueprint}
                    title="Leva este contexto para Projetar, para desenhar a rede de segurança que falta"
                  >
                    <Network className="h-3.5 w-3.5" />
                    Enviar para Projetar
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {orderedItems.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Nenhuma dependência precisou de atenção — tudo em dia.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orderedItems.map((item, idx) => (
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
                        <span className="tabular text-xs text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <span
                          className={cn(
                            "flex items-center gap-1.5 font-medium",
                            item.status === "done" && "line-through",
                          )}
                        >
                          <PackageSearch className="h-3.5 w-3.5 text-muted-foreground" />
                          {item.packageName}
                        </span>
                        <span className="tabular text-xs text-muted-foreground">
                          {item.currentVersion} → {item.targetVersion}
                        </span>
                        <Badge className={RISK_CLASS[item.riskLevel]}>
                          {RISK_LABEL[item.riskLevel] ?? item.riskLevel}
                        </Badge>
                        {item.filePath && (
                          <span className="tabular flex min-w-0 items-start gap-1 break-all text-xs text-muted-foreground">
                            <FileCode2 className="mt-0.5 h-3 w-3 shrink-0" />
                            {item.filePath}
                          </span>
                        )}
                      </div>
                      {item.breakingChanges.length > 0 && (
                        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                          {item.breakingChanges.map((bc) => (
                            <li key={bc}>{bc}</li>
                          ))}
                        </ul>
                      )}
                      {item.migrationSteps && (
                        <p className="mt-1.5 rounded-md bg-muted/50 p-2 text-xs">
                          <span className="font-medium text-foreground">
                            Como migrar:{" "}
                          </span>
                          <span className="text-muted-foreground">
                            {item.migrationSteps}
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
