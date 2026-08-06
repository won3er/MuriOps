"use client";

import type { CriticalFlowFrequency, CriticalFlowStep, CriticalFlowStepAction } from "@qa-ai/shared";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  Plus,
  Radar,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useCreateCriticalFlow,
  useCriticalFlows,
  useDeleteCriticalFlow,
  useFlowRuns,
  useProjects,
  useRunCriticalFlowNow,
} from "@/lib/queries";
import { cn, timeAgo } from "@/lib/utils";

const FREQUENCY_LABEL: Record<CriticalFlowFrequency, string> = {
  EVERY_15_MIN: "A cada 15 min",
  EVERY_HOUR: "A cada 1 hora",
  DAILY: "Diariamente",
};

const ACTION_LABEL: Record<CriticalFlowStepAction, string> = {
  NAVIGATE: "Navegar até",
  CLICK: "Clicar em",
  FILL: "Preencher",
  SELECT: "Selecionar opção em",
  WAIT_FOR_SELECTOR: "Esperar aparecer",
  ASSERT_TEXT: "Verificar texto em",
  ASSERT_URL: "Verificar URL",
};

function emptyStep(): CriticalFlowStep {
  return { action: "NAVIGATE", value: "" };
}

export default function CriticalFlowsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid place-items-center py-24 text-muted-foreground" role="status">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="mt-3 text-sm">Preparando monitoramento…</span>
        </div>
      }
    >
      <CriticalFlowsHub />
    </Suspense>
  );
}

function CriticalFlowsHub() {
  const searchParams = useSearchParams();
  const { data: projects = [], isError: projectsError, refetch: refetchProjects } = useProjects();
  const [projectId, setProjectId] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const requested = searchParams.get("projectId");
    if (requested) setProjectId(requested);
  }, [searchParams]);

  const {
    data: flows = [],
    isLoading: flowsLoading,
    isError: flowsError,
    refetch: refetchFlows,
  } = useCriticalFlows(projectId);

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow="QA operacional"
        title="Fluxos Críticos"
        description="Monitore jornadas de negócio (login, checkout, formulário de lead) rodando de forma automática — pra pegar uma quebra que faz a empresa perder vendas antes que um cliente reclame."
      />

      <section className="rounded-lg border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Selecione o projeto</h2>
        </div>
        <div className="p-5">
          <select
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value);
              setFormOpen(false);
            }}
            className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecione um projeto…</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {projectsError ? (
            <div className="mt-3 max-w-sm">
              <QueryErrorState
                compact
                title="Projetos indisponíveis"
                description="Não foi possível carregar as opções."
                onRetry={() => void refetchProjects()}
              />
            </div>
          ) : (
            projects.length === 0 && (
              <Link href="/projects" className="mt-2 inline-flex text-xs text-primary hover:underline">
                Cadastre um projeto primeiro
              </Link>
            )
          )}
        </div>
      </section>

      {projectId && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Fluxos deste projeto</h2>
              <p className="text-xs text-muted-foreground">
                {flows.length} fluxo(s) cadastrado(s)
              </p>
            </div>
            <Button size="sm" onClick={() => setFormOpen((v) => !v)}>
              <Plus className="h-3.5 w-3.5" /> Novo fluxo
            </Button>
          </div>

          {formOpen && (
            <CreateFlowForm projectId={projectId} onDone={() => setFormOpen(false)} />
          )}

          {flowsError ? (
            <QueryErrorState compact title="Fluxos indisponíveis" onRetry={() => void refetchFlows()} />
          ) : flowsLoading ? (
            <div className="grid place-items-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : flows.length === 0 ? (
            <div className="flex flex-col items-center rounded-lg border bg-card px-6 py-12 text-center">
              <Radar className="mb-3 h-6 w-6 text-muted-foreground" />
              <p className="font-medium">Nenhum fluxo crítico cadastrado</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Crie um fluxo descrevendo os passos de uma jornada importante (ex.: login, checkout).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {flows.map((flow) => (
                <FlowCard key={flow.id} flow={flow} projectId={projectId} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function FlowCard({
  flow,
  projectId,
}: {
  flow: import("@qa-ai/shared").CriticalFlow;
  projectId: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: runs = [] } = useFlowRuns(open ? flow.id : "");
  const runNow = useRunCriticalFlowNow(flow.id, projectId);
  const remove = useDeleteCriticalFlow(projectId);

  const statusBadge =
    flow.lastRunStatus === "PASSED" ? (
      <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Passou
      </Badge>
    ) : flow.lastRunStatus === "FAILED" ? (
      <Badge className="border-red-500/40 bg-red-500/15 text-red-300">
        <AlertTriangle className="mr-1 h-3 w-3" /> Falhou
      </Badge>
    ) : (
      <Badge>Nunca rodou</Badge>
    );

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/40"
      >
        <Activity className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{flow.name}</span>
            {statusBadge}
            {!flow.active && <Badge>Pausado</Badge>}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {flow.startUrl} · {FREQUENCY_LABEL[flow.frequency]} · {flow.steps.length} passo(s)
            {flow.lastRunAt ? ` · última execução ${timeAgo(flow.lastRunAt)}` : ""}
          </p>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={runNow.isPending}
              onClick={() => runNow.mutate()}
            >
              {runNow.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Rodar agora
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={remove.isPending}
              onClick={() => {
                if (confirm(`Apagar o fluxo "${flow.name}"?`)) remove.mutate(flow.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Apagar
            </Button>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Passos</p>
            <ol className="space-y-1 text-xs">
              {flow.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-muted-foreground">
                  <span className="tabular w-4 shrink-0">{i + 1}.</span>
                  <span>
                    {step.label ? `${step.label} — ` : ""}
                    {ACTION_LABEL[step.action]}
                    {step.selector ? ` "${step.selector}"` : ""}
                    {step.value ? ` = "${step.value}"` : ""}
                    {step.expected ? ` (esperado: "${step.expected}")` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Execuções recentes</p>
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma execução ainda.</p>
            ) : (
              <div className="divide-y rounded-md border">
                {runs.map((run) => (
                  <div key={run.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <span
                      className={cn(
                        "font-medium",
                        run.status === "PASSED" && "text-emerald-400",
                        run.status === "FAILED" && "text-red-400",
                      )}
                    >
                      {run.status === "PASSED" ? "Passou" : run.status === "FAILED" ? "Falhou" : run.status}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {run.errorMessage ?? (run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "")}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{timeAgo(run.startedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateFlowForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const create = useCreateCriticalFlow(projectId);
  const [name, setName] = useState("");
  const [startUrl, setStartUrl] = useState("");
  const [frequency, setFrequency] = useState<CriticalFlowFrequency>("EVERY_HOUR");
  const [alertEmail, setAlertEmail] = useState("");
  const [steps, setSteps] = useState<CriticalFlowStep[]>([emptyStep()]);

  function updateStep(index: number, patch: Partial<CriticalFlowStep>) {
    setSteps((current) => current.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function submit() {
    if (!name.trim() || !startUrl.trim()) return;
    await create.mutateAsync({
      name: name.trim(),
      startUrl: startUrl.trim(),
      steps,
      frequency,
      alertEmail: alertEmail.trim() || undefined,
    });
    onDone();
  }

  return (
    <div className="mb-4 space-y-4 rounded-lg border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nome do fluxo</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex.: Checkout — cartão de crédito"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">URL inicial</label>
          <input
            value={startUrl}
            onChange={(e) => setStartUrl(e.target.value)}
            placeholder="https://exemplo.com/checkout"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Frequência</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as CriticalFlowFrequency)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            E-mail de alerta (opcional)
          </label>
          <input
            value={alertEmail}
            onChange={(e) => setAlertEmail(e.target.value)}
            placeholder="time@empresa.com"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Passos</label>
          <Button size="sm" variant="outline" onClick={() => setSteps((s) => [...s, emptyStep()])}>
            <Plus className="h-3.5 w-3.5" /> Passo
          </Button>
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
              <span className="tabular w-5 shrink-0 text-xs text-muted-foreground">{i + 1}.</span>
              <select
                value={step.action}
                onChange={(e) => updateStep(i, { action: e.target.value as CriticalFlowStepAction })}
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                {Object.entries(ACTION_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                value={step.selector ?? ""}
                onChange={(e) => updateStep(i, { selector: e.target.value })}
                placeholder="seletor CSS (ex.: #email)"
                className="h-9 w-40 rounded-md border border-input bg-background px-2 text-xs"
              />
              <input
                value={step.value ?? ""}
                onChange={(e) => updateStep(i, { value: e.target.value })}
                placeholder="valor / URL"
                className="h-9 w-40 rounded-md border border-input bg-background px-2 text-xs"
              />
              <input
                value={step.expected ?? ""}
                onChange={(e) => updateStep(i, { expected: e.target.value })}
                placeholder="esperado (opcional)"
                className="h-9 w-36 rounded-md border border-input bg-background px-2 text-xs"
              />
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={steps.length <= 1}
                onClick={() => setSteps((s) => s.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" disabled={create.isPending || !name.trim() || !startUrl.trim()} onClick={submit}>
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Criar fluxo
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
