"use client";

import type { AnalysisCategory, AnalysisScheduleFrequency } from "@qa-ai/shared";
import { CalendarClock, Loader2, Pause, Play, ShieldAlert, Swords, Github, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { ConnectRepoPrompt, useHasRepoConnection } from "@/components/connect-repo-prompt";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { AnalysisSchedule } from "@qa-ai/shared";
import {
  useAnalysisSchedules,
  useCreateAnalysisSchedule,
  useDeleteAnalysisSchedule,
  useProjects,
  useUpdateAnalysisSchedule,
} from "@/lib/queries";
import { cn, timeAgo } from "@/lib/utils";

const SCHEDULE_FREQUENCY_LABEL: Record<AnalysisScheduleFrequency, string> = {
  DAILY: "Diariamente",
  WEEKLY: "Semanalmente",
};

const SCHEDULE_CATEGORY_LABEL: Record<string, string> = {
  DEEP_SECURITY: "Segurança Avançada",
  SOURCE_SECURITY_SCAN: "Segurança via GitHub/GitLab",
};

const SCHEDULABLE_CATEGORY_OPTIONS: { value: AnalysisCategory; label: string }[] = [
  { value: "DEEP_SECURITY", label: "Segurança Avançada" },
  { value: "SOURCE_SECURITY_SCAN", label: "Segurança via GitHub/GitLab" },
];

export default function AnalysesHubPage() {
  return (
    <Suspense
      fallback={
        <div
          className="grid place-items-center py-24 text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="mt-3 text-sm">Preparando análises…</span>
        </div>
      }
    >
      <AnalysesHub />
    </Suspense>
  );
}

function AnalysesHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data: projects = [],
    isError: projectsError,
    refetch: refetchProjects,
  } = useProjects();
  const [projectId, setProjectId] = useState("");
  const [selectedType, setSelectedType] = useState<
    "qa" | "security" | "active" | "source" | null
  >(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const requestedProject = searchParams.get("projectId");
    if (requestedProject) setProjectId(requestedProject);
  }, [searchParams]);

  const selectedProject = projects.find((p) => p.id === projectId);
  const {
    hasRepoConnection,
    isLoading: connectionsLoading,
    isError: connectionsError,
  } = useHasRepoConnection(projectId);

  // Trocar de projeto pode invalidar o tipo escolhido (ex.: Teste Ativo
  // exige consentimento por projeto) — mais seguro pedir pra escolher de novo.
  function changeProject(newProjectId: string) {
    setProjectId(newProjectId);
    setSelectedType(null);
  }

  async function startSelected() {
    if (!projectId || !selectedType || !hasRepoConnection) return;
    setStarting(true);
    try {
      const categories =
        selectedType === "security"
          ? ["DEEP_SECURITY"]
          : selectedType === "active"
            ? ["ACTIVE_SECURITY_TEST"]
            : selectedType === "source"
              ? ["SOURCE_SECURITY_SCAN"]
              : undefined;
      const analysis = await api.startAnalysis(
        projectId,
        categories ? { categories } : {},
      );
      router.push(`/analyses/${analysis.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a análise.",
      );
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow="Ciclo de qualidade"
        title="Análises"
        description="Execute verificações, acompanhe o processamento e compare a evolução dos projetos."
      />

      <section className="rounded-md border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-3.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Nova análise
          </h2>
        </div>
        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-2 sm:max-w-sm">
            <label
              htmlFor="analysis-project"
              className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              Projeto
            </label>
            <select
              id="analysis-project"
              value={projectId}
              onChange={(event) => changeProject(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione um projeto…</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {projectsError ? (
              <QueryErrorState
                compact
                title="Projetos indisponíveis"
                description="Não foi possível carregar as opções."
                onRetry={() => void refetchProjects()}
              />
            ) : (
              projects.length === 0 && (
                <Link
                  href="/projects"
                  className="inline-flex text-xs text-primary hover:underline"
                >
                  Cadastre um projeto primeiro
                </Link>
              )
            )}
          </div>
          <div>
            {projectId && !connectionsLoading && !connectionsError && !hasRepoConnection ? (
              <ConnectRepoPrompt
                projectId={projectId}
                description="Nenhuma análise roda sem o projeto ter GitHub ou GitLab conectado — inclusive a Análise QA padrão. Isso garante que todo achado tenha um repositório real por trás para aplicar a correção."
              />
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={() => setSelectedType("qa")}
                disabled={!projectId}
                aria-pressed={selectedType === "qa"}
                className={cn(
                  "group relative flex flex-col gap-2.5 rounded-md border p-4 text-left transition-colors hover:border-foreground/30 disabled:pointer-events-none disabled:opacity-40",
                  selectedType === "qa"
                    ? "border-primary bg-primary/[0.04]"
                    : "border-border",
                )}
              >
                <div className="flex items-center justify-between">
                  <Play className="h-4 w-4 text-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">QA</span>
                </div>
                <span>
                  <strong className="block text-sm font-medium">
                    Análise QA padrão
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    UI/UX, performance, SEO, acessibilidade, console e rede.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("security")}
                disabled={!projectId}
                aria-pressed={selectedType === "security"}
                className={cn(
                  "group relative flex flex-col gap-2.5 rounded-md border p-4 text-left transition-colors hover:border-foreground/30 disabled:pointer-events-none disabled:opacity-40",
                  selectedType === "security"
                    ? "border-amber-400 bg-amber-500/[0.04]"
                    : "border-border",
                )}
              >
                <div className="flex items-center justify-between">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">SEC</span>
                </div>
                <span>
                  <strong className="block text-sm font-medium">
                    Análise de Segurança
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    TLS, DNS, headers, políticas e exposições indevidas.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("active")}
                disabled={!projectId || !selectedProject?.activeTestingConsent}
                aria-pressed={selectedType === "active"}
                title={
                  projectId && !selectedProject?.activeTestingConsent
                    ? "Habilite o consentimento na página do projeto primeiro"
                    : undefined
                }
                className={cn(
                  "group relative flex flex-col gap-2.5 rounded-md border p-4 text-left transition-colors hover:border-foreground/30 disabled:pointer-events-none disabled:opacity-40",
                  selectedType === "active"
                    ? "border-rose-400 bg-rose-500/[0.04]"
                    : "border-border",
                )}
              >
                <div className="flex items-center justify-between">
                  <Swords className="h-4 w-4 text-rose-400" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">PEN</span>
                </div>
                <span>
                  <strong className="block text-sm font-medium">
                    Teste Ativo Autorizado
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {projectId && !selectedProject?.activeTestingConsent
                      ? "Requer consentimento — habilite na página do projeto."
                      : "Rate-limit, enumeração de usuário e payloads de SQLi/XSS/SSRF/XXE."}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("source")}
                disabled={!projectId}
                aria-pressed={selectedType === "source"}
                className={cn(
                  "group relative flex flex-col gap-2.5 rounded-md border p-4 text-left transition-colors hover:border-foreground/30 disabled:pointer-events-none disabled:opacity-40",
                  selectedType === "source"
                    ? "border-sky-400 bg-sky-500/[0.04]"
                    : "border-border",
                )}
              >
                <div className="flex items-center justify-between">
                  <Github className="h-4 w-4 text-sky-400" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">SRC</span>
                </div>
                <span>
                  <strong className="block text-sm font-medium">
                    Segurança via GitHub/GitLab
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Segredos commitados, dependências com CVE, Dockerfile
                    inseguro e código inseguro.
                  </span>
                </span>
              </button>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={() => void startSelected()}
                disabled={
                  !projectId || !selectedType || starting || !hasRepoConnection
                }
              >
                {starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Iniciar análise
              </Button>
              {!selectedType && projectId && (
                <p className="text-xs text-muted-foreground">
                  Escolha um tipo de análise acima.
                </p>
              )}
            </div>
            {(selectedType === "qa" || selectedType === "security") && (
              <p className="mt-3 max-w-2xl text-xs leading-5 text-muted-foreground">
                Sites grandes ou muito pesados podem falhar com "Interrompida
                (API reiniciada)" — é um limite de memória do servidor
                gratuito usado hoje, não um erro do site. Se acontecer, rode a
                análise de novo; costuma completar numa segunda tentativa.
              </p>
            )}
          </div>
        </div>
      </section>

      {projectId && hasRepoConnection && <ContinuousCoveragePanel projectId={projectId} />}
    </div>
  );
}

/**
 * "Continuous Coverage" passivo (10/08/2026): agenda a reexecução sozinha
 * das categorias de segurança que não enviam requisição ativa contra o site
 * (Segurança Avançada, Segurança via GitHub/GitLab). O Teste Ativo
 * Autorizado fica de fora de propósito — decisão explícita do usuário de
 * não reenviar payloads de detecção sem um clique manual a cada vez.
 */
function ContinuousCoveragePanel({ projectId }: { projectId: string }) {
  const { data: schedules = [], isLoading } = useAnalysisSchedules(projectId);
  const createSchedule = useCreateAnalysisSchedule(projectId);
  const deleteSchedule = useDeleteAnalysisSchedule(projectId);
  const [categories, setCategories] = useState<AnalysisCategory[]>(["DEEP_SECURITY"]);
  const [frequency, setFrequency] = useState<AnalysisScheduleFrequency>("WEEKLY");

  function toggleCategory(cat: AnalysisCategory) {
    setCategories((current) =>
      current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat],
    );
  }

  function submit() {
    if (categories.length === 0) return;
    createSchedule.mutate(
      { categories, frequency },
      { onSuccess: () => setCategories(["DEEP_SECURITY"]) },
    );
  }

  return (
    <section className="rounded-md border bg-card">
      <div className="flex items-center gap-2 border-b px-5 py-3.5">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Continuous Coverage — reexecução automática
        </h2>
      </div>
      <div className="space-y-5 p-5">
        <p className="text-xs leading-5 text-muted-foreground">
          Reexecuta sozinho as checagens de segurança que só leem/observam (sem enviar
          requisição ativa contra formulários) — pra pegar uma exposição nova sem
          precisar lembrar de rodar de novo. O Teste Ativo Autorizado não entra aqui;
          ele continua exigindo um clique manual a cada execução.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : schedules.length > 0 ? (
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <ScheduleRow
                key={schedule.id}
                schedule={schedule}
                projectId={projectId}
                onDelete={() => deleteSchedule.mutate(schedule.id)}
                deleting={deleteSchedule.isPending}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-3 border-t pt-4">
          <div className="flex flex-wrap gap-3">
            {SCHEDULABLE_CATEGORY_OPTIONS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={categories.includes(value)}
                  onChange={() => toggleCategory(value)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as AnalysisScheduleFrequency)}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
          >
            {Object.entries(SCHEDULE_FREQUENCY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={categories.length === 0 || createSchedule.isPending}
            onClick={submit}
          >
            {createSchedule.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CalendarClock className="h-3.5 w-3.5" />
            )}
            Agendar
          </Button>
        </div>
      </div>
    </section>
  );
}

function ScheduleRow({
  schedule,
  projectId,
  onDelete,
  deleting,
}: {
  schedule: AnalysisSchedule;
  projectId: string;
  onDelete: () => void;
  deleting: boolean;
}) {
  const update = useUpdateAnalysisSchedule(schedule.id, projectId);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <div className="flex flex-wrap gap-1.5">
        {schedule.categories.map((c) => (
          <Badge key={c}>{SCHEDULE_CATEGORY_LABEL[c] ?? c}</Badge>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        · {SCHEDULE_FREQUENCY_LABEL[schedule.frequency]}
        {schedule.lastRunAt ? ` · última execução ${timeAgo(schedule.lastRunAt)}` : " · ainda não rodou"}
      </span>
      {!schedule.active && <Badge>Pausado</Badge>}
      <Button
        size="sm"
        variant="ghost"
        className="ml-auto"
        disabled={update.isPending}
        onClick={() => update.mutate({ active: !schedule.active })}
        title={schedule.active ? "Pausar agendamento" : "Retomar agendamento"}
      >
        {schedule.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        disabled={deleting}
        onClick={() => {
          if (confirm("Remover este agendamento?")) onDelete();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
