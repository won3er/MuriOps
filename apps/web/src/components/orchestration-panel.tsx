"use client";

import type { AutonomyLevel } from "@qa-ai/shared";
import { useState } from "react";
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QueryErrorState } from "@/components/query-error-state";
import { ActionError } from "@/components/action-error";
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
  FTP: "FTP",
};

const AUTONOMY_OPTIONS: {
  value: AutonomyLevel;
  label: string;
  hint: string;
  disabled?: boolean;
}[] = [
  {
    value: "MANUAL",
    label: "Manual",
    hint: "Para a cada iteração e espera você aprovar antes de reanalisar.",
  },
  {
    value: "SUPERVISED",
    label: "Supervisionado",
    hint: "Segue sozinho quando a aplicação dá certo; para pra revisão se algum item falhar ou se a nota piorar.",
  },
  {
    value: "AUTONOMOUS",
    label: "Autônomo",
    hint: "Segue sozinho até bater os quality gates ou o limite de iterações.",
  },
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
  const {
    data: gates = [],
    isLoading: gatesLoading,
    isError: gatesError,
    refetch: refetchGates,
  } = useQualityGates(projectId);
  const createGate = useCreateQualityGate(projectId);
  const deleteGate = useDeleteQualityGate(projectId);
  const {
    data: runs = [],
    isLoading: runsLoading,
    isError: runsError,
    refetch: refetchRuns,
  } = useOrchestrationRuns(projectId);
  const createRun = useCreateOrchestrationRun(projectId);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const {
    data: connections = [],
    isLoading: connectionsLoading,
    isError: connectionsError,
    refetch: refetchConnections,
  } = useAdapterConnections(projectId);
  const [adapterConnectionId, setAdapterConnectionId] = useState("");

  const activeRunId = selectedRunId ?? runs[0]?.id ?? null;
  const {
    data: run,
    isLoading: runLoading,
    isError: runError,
    refetch: refetchRun,
  } = useOrchestrationRun(activeRunId ?? "");
  const {
    data: events = [],
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useOrchestrationEvents(activeRunId ?? "");
  const approve = useApproveOrchestrationRun(activeRunId ?? "");
  const cancel = useCancelOrchestrationRun(activeRunId ?? "");

  const [minScore, setMinScore] = useState("80");
  const [label, setLabel] = useState("");

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <span className="font-medium">Nível de autonomia</span>
          <div
            className="grid gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Nível de autonomia"
          >
            {AUTONOMY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={autonomyLevel === opt.value}
                disabled={opt.disabled || updateAutonomy.isPending}
                onClick={() =>
                  updateAutonomy.mutate({
                    id: projectId,
                    autonomyLevel: opt.value,
                  })
                }
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
            {AUTONOMY_OPTIONS.find((o) => o.value === autonomyLevel)?.hint}
          </p>
          <p className="text-xs text-muted-foreground">
            Seguir sozinho exige uma conexão que aplique de verdade (GitHub,
            WordPress, Shopify ou FTP). Com MCP/ponte, ou sem conexão, quem
            aplica é sua ferramenta de desenvolvimento — a execução retoma
            automaticamente quando os itens forem marcados como feitos.
          </p>
          <ActionError
            error={updateAutonomy.error}
            message="Não foi possível atualizar o nível de autonomia."
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <span className="font-medium">Quality gates</span>
          <div className="space-y-2">
            {gatesLoading ? (
              <p
                className="flex items-center gap-2 text-sm text-muted-foreground"
                role="status"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando gates…
              </p>
            ) : gatesError ? (
              <QueryErrorState
                compact
                title="Quality gates indisponíveis"
                onRetry={() => void refetchGates()}
              />
            ) : gates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum gate configurado — a execução passa direto na primeira
                análise.
              </p>
            ) : null}
            {!gatesError &&
              gates.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 break-words">
                    {g.label ?? g.category ?? "Score geral"} · mínimo{" "}
                    {g.minScore}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deleteGate.isPending}
                    onClick={() => deleteGate.mutate(g.id)}
                  >
                    {deleteGate.isPending && deleteGate.variables === g.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Remover
                  </Button>
                </div>
              ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
            <div className="space-y-1">
              <label
                htmlFor="gate-label"
                className="text-xs text-muted-foreground"
              >
                Rótulo (opcional)
              </label>
              <Input
                id="gate-label"
                placeholder="Ex.: Pronto para publicar"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="gate-score"
                className="text-xs text-muted-foreground"
              >
                Score mínimo
              </label>
              <Input
                id="gate-score"
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="self-end"
              disabled={
                createGate.isPending ||
                !Number.isFinite(Number(minScore)) ||
                Number(minScore) < 0 ||
                Number(minScore) > 100
              }
              onClick={() => {
                const score = Number(minScore);
                if (!Number.isFinite(score)) return;
                createGate.mutate(
                  {
                    category: null,
                    minScore: score,
                    label: label.trim() || undefined,
                  },
                  { onSuccess: () => setLabel("") },
                );
              }}
            >
              {createGate.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Adicionar gate
            </Button>
          </div>
          <ActionError
            error={createGate.error || deleteGate.error}
            message="Não foi possível atualizar os quality gates."
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-medium">Execuções</span>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <label htmlFor="run-connection" className="sr-only">
                Conexão usada na execução
              </label>
              <select
                id="run-connection"
                value={adapterConnectionId}
                onChange={(e) => setAdapterConnectionId(e.target.value)}
                className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-xs"
                title="Conexão usada para registrar os itens na plataforma; deixe em branco para aplicação manual ou via MCP/ponte"
                disabled={connectionsLoading || connectionsError}
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
                {createRun.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {createRun.isPending ? "Iniciando…" : "Iniciar execução"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Conexões push registram o checklist na plataforma escolhida, mas não
            garantem a correção técnica. Sem conexão — ou com MCP — você aplica
            pela sua ferramenta de desenvolvimento; a execução retoma quando os
            itens do plano forem marcados como feitos.
          </p>

          {connectionsError && (
            <QueryErrorState
              compact
              title="Conexões indisponíveis"
              description="Você ainda pode iniciar uma execução manual."
              onRetry={() => void refetchConnections()}
            />
          )}

          {runsLoading ? (
            <p
              className="flex items-center gap-2 text-sm text-muted-foreground"
              role="status"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando execuções…
            </p>
          ) : runsError ? (
            <QueryErrorState
              compact
              title="Execuções indisponíveis"
              onRetry={() => void refetchRuns()}
            />
          ) : runs.length > 0 ? (
            <div
              className="flex flex-wrap gap-1.5"
              role="tablist"
              aria-label="Execuções"
            >
              {runs.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={activeRunId === r.id}
                  onClick={() => setSelectedRunId(r.id)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs",
                    activeRunId === r.id
                      ? "border-primary bg-primary/10"
                      : "border-border",
                  )}
                >
                  {timeAgo(r.createdAt)} · {STATUS_LABEL[r.status] ?? r.status}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
              Nenhuma execução iniciada para este projeto.
            </p>
          )}

          <ActionError
            error={createRun.error}
            message="Não foi possível iniciar a execução."
          />

          {activeRunId && runLoading ? (
            <div
              className="flex items-center gap-2 rounded-md border p-4 text-sm text-muted-foreground"
              role="status"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando execução…
            </div>
          ) : runError ? (
            <QueryErrorState
              compact
              title="Não foi possível carregar a execução"
              onRetry={() => void refetchRun()}
            />
          ) : run ? (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={STATUS_CLASS[run.status] ?? ""}>
                  {STATUS_LABEL[run.status] ?? run.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Iteração {run.iteration}/{run.maxIterations}
                </span>
                {run.status === "AWAITING_APPLY" && (
                  <Button
                    size="sm"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate()}
                  >
                    {approve.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {approve.isPending ? "Aprovando…" : "Aprovar e reanalisar"}
                  </Button>
                )}
                {["QUEUED", "AWAITING_APPLY", "AWAITING_OBSERVATION"].includes(
                  run.status,
                ) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate()}
                  >
                    {cancel.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {cancel.isPending ? "Cancelando…" : "Cancelar"}
                  </Button>
                )}
                {[
                  "ANALYZING",
                  "EVALUATING_GATES",
                  "PLANNING",
                  "APPLYING",
                  "REANALYZING",
                ].includes(run.status) && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              {run.status === "AWAITING_APPLY" && (
                <p className="text-xs text-muted-foreground">
                  Confirme que as mudanças foram publicadas antes de aprovar. A
                  próxima iteração dispara uma nova análise com o mesmo escopo
                  para medir o efeito das correções.
                </p>
              )}
              <ActionError
                error={run.error}
                message="A execução foi interrompida por um erro."
              />
              <div className="space-y-1.5">
                {eventsLoading ? (
                  <p
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                    role="status"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Carregando eventos…
                  </p>
                ) : eventsError ? (
                  <QueryErrorState
                    compact
                    title="Eventos indisponíveis"
                    onRetry={() => void refetchEvents()}
                  />
                ) : events.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum evento registrado até o momento.
                  </p>
                ) : (
                  events.map((e) => (
                    <div key={e.id} className="flex items-start gap-2 text-xs">
                      <span className="mt-0.5 whitespace-nowrap text-muted-foreground">
                        {timeAgo(e.createdAt)}
                      </span>
                      <span>{e.message}</span>
                    </div>
                  ))
                )}
              </div>
              <ActionError
                error={approve.error || cancel.error}
                message="Não foi possível concluir a ação na execução."
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
