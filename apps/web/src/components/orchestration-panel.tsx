"use client";

import type { AutonomyLevel } from "@qa-ai/shared";
import { useState } from "react";
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useAdapterConnections,
  useApproveOrchestrationRun,
  useCancelOrchestrationRun,
  useCreateOrchestrationRun,
  useCreateQualityGate,
  useDeleteQualityGate,
  useOrchestrationEvents,
  useOrchestrationRun,
  useOrchestrationRuns,
  useQualityGates,
  useUpdateProjectAutonomy,
} from "@/lib/queries";
import { cn, timeAgo } from "@/lib/utils";

const CONNECTION_KIND_LABEL: Record<string, string> = {
  GITHUB: "GitHub",
  MCP: "MCP",
  WORDPRESS: "WordPress",
  SHOPIFY: "Shopify",
  NUVEMSHOP: "Nuvemshop",
  FTP: "FTP",
};

const AUTONOMY_OPTIONS: { value: AutonomyLevel; label: string; disabled?: boolean }[] = [
  { value: "MANUAL", label: "Manual" },
  { value: "SUPERVISED", label: "Supervisionado (em breve)", disabled: true },
  { value: "AUTONOMOUS", label: "Autônomo (em breve)", disabled: true },
];

const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Na fila",
  ANALYZING: "Analisando",
  EVALUATING_GATES: "Avaliando quality gates",
  PLANNING: "Gerando plano",
  AWAITING_APPLY: "Aguardando aprovação",
  APPLYING: "Aplicando",
  AWAITING_OBSERVATION: "Aguardando mudança no adapter",
  REANALYZING: "Reanalisando",
  PASSED: "Passou nos quality gates",
  STOPPED: "Parado",
  FAILED: "Falhou",
};

const STATUS_CLASS: Record<string, string> = {
  PASSED: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  STOPPED: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  FAILED: "border-red-500/40 bg-red-500/15 text-red-300",
  AWAITING_APPLY: "border-sky-500/40 bg-sky-500/15 text-sky-300",
};

/**
 * Painel "Orquestração" (Fase 3): nível de autonomia, quality gates, e o
 * loop analisar → plano → aplicar → reanalisar em si, com timeline e
 * aprovação humana quando parado em AWAITING_APPLY.
 */
export function OrchestrationPanel({
  projectId,
  autonomyLevel,
}: {
  projectId: string;
  autonomyLevel: AutonomyLevel;
}) {
  const updateAutonomy = useUpdateProjectAutonomy();
  const { data: gates = [] } = useQualityGates(projectId);
  const createGate = useCreateQualityGate(projectId);
  const deleteGate = useDeleteQualityGate(projectId);
  const { data: runs = [] } = useOrchestrationRuns(projectId);
  const createRun = useCreateOrchestrationRun(projectId);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: connections = [] } = useAdapterConnections(projectId);
  const [adapterConnectionId, setAdapterConnectionId] = useState("");

  const activeRunId = selectedRunId ?? runs[0]?.id ?? null;
  const { data: run } = useOrchestrationRun(activeRunId ?? "");
  const { data: events = [] } = useOrchestrationEvents(activeRunId ?? "");
  const approve = useApproveOrchestrationRun(activeRunId ?? "");
  const cancel = useCancelOrchestrationRun(activeRunId ?? "");

  const [minScore, setMinScore] = useState("80");
  const [label, setLabel] = useState("");

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <span className="font-medium">Nível de autonomia</span>
          <div className="flex flex-wrap gap-2">
            {AUTONOMY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={opt.disabled || updateAutonomy.isPending}
                onClick={() => updateAutonomy.mutate({ id: projectId, autonomyLevel: opt.value })}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  autonomyLevel === opt.value
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground",
                  opt.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Manual: toda aplicação de mudança espera sua aprovação antes de
            reanalisar. Os demais níveis ainda não executam sozinhos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <span className="font-medium">Quality gates</span>
          <div className="space-y-2">
            {gates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum gate configurado — a execução passa direto na primeira análise.
              </p>
            )}
            {gates.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>
                  {g.label ?? g.category ?? "Score geral"} · mínimo {g.minScore}
                </span>
                <Button size="sm" variant="outline" onClick={() => deleteGate.mutate(g.id)}>
                  Remover
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              className="w-40"
              placeholder="rótulo (opcional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <Input
              className="w-28"
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={createGate.isPending}
              onClick={() => {
                const score = Number(minScore);
                if (!Number.isFinite(score)) return;
                createGate.mutate(
                  { category: null, minScore: score, label: label.trim() || undefined },
                  { onSuccess: () => setLabel("") },
                );
              }}
            >
              Adicionar gate (score geral)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-medium">Execuções</span>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={adapterConnectionId}
                onChange={(e) => setAdapterConnectionId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background/60 px-2 text-xs"
                title="Conexão usada pra aplicar automaticamente (deixe em branco pra aplicação manual ou via MCP/ponte)"
              >
                <option value="">Sem conexão (manual / MCP / ponte)</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {CONNECTION_KIND_LABEL[c.kind] ?? c.kind}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={createRun.isPending}
                onClick={() =>
                  createRun.mutate(
                    adapterConnectionId ? { adapterConnectionId } : {},
                    {
                      onSuccess: (r) => setSelectedRunId(r.id),
                    },
                  )
                }
              >
                <Play className="h-3.5 w-3.5" /> Iniciar execução
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Com conexão push (GitHub, WordPress, Shopify, Nuvemshop, FTP) o
            Atlas aplica sozinho a cada iteração. Sem conexão — ou com MCP —
            você aplica pela sua própria IA de dev (ex.: Claude Code
            conectado via MCP em Aplicação); a execução retoma sozinha
            assim que todos os itens forem marcados como feitos.
          </p>

          {runs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {runs.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRunId(r.id)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs",
                    activeRunId === r.id ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  {timeAgo(r.createdAt)} · {STATUS_LABEL[r.status] ?? r.status}
                </button>
              ))}
            </div>
          )}

          {run && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={STATUS_CLASS[run.status] ?? ""}>
                  {STATUS_LABEL[run.status] ?? run.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Iteração {run.iteration}/{run.maxIterations}
                </span>
                {run.status === "AWAITING_APPLY" && (
                  <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate()}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar e reanalisar
                  </Button>
                )}
                {["QUEUED", "AWAITING_APPLY", "AWAITING_OBSERVATION"].includes(run.status) && (
                  <Button size="sm" variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                    <XCircle className="h-3.5 w-3.5" /> Cancelar
                  </Button>
                )}
                {["ANALYZING", "EVALUATING_GATES", "PLANNING", "APPLYING", "REANALYZING"].includes(
                  run.status,
                ) && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              {run.status === "AWAITING_APPLY" && (
                <p className="text-xs text-muted-foreground">
                  Antes de aprovar: se você aplicou as correções fora do Atlas
                  QA (deploy manual, PR mesclado etc.), rode uma nova análise
                  no projeto primeiro. "Aprovar" reavalia a análise mais
                  recente que já existir — ele não dispara uma análise nova
                  sozinho.
                </p>
              )}
              {run.error && <p className="text-sm text-muted-foreground">{run.error}</p>}
              <div className="space-y-1.5">
                {events.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 whitespace-nowrap text-muted-foreground">
                      {timeAgo(e.createdAt)}
                    </span>
                    <span>{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
