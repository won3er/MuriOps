"use client";

import {
  ArrowRight,
  FileSearch,
  Loader2,
  Play,
  ShieldAlert,
  Swords,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { AnalysisStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAnalysesList, useProjects } from "@/lib/queries";
import { cn, formatDuration, scoreColor, timeAgo } from "@/lib/utils";

function isSecurityAudit(categories: string[]): boolean {
  return categories.length === 1 && categories[0] === "DEEP_SECURITY";
}

function isActiveTest(categories: string[]): boolean {
  return categories.length === 1 && categories[0] === "ACTIVE_SECURITY_TEST";
}

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
  const {
    data: analyses = [],
    isLoading,
    isError,
    refetch,
  } = useAnalysesList();
  const [projectId, setProjectId] = useState("");
  const [selectedType, setSelectedType] = useState<
    "qa" | "security" | "active" | null
  >(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const requestedProject = searchParams.get("projectId");
    if (requestedProject) setProjectId(requestedProject);
  }, [searchParams]);

  const selectedProject = projects.find((p) => p.id === projectId);

  // Trocar de projeto pode invalidar o tipo escolhido (ex.: Teste Ativo
  // exige consentimento por projeto) — mais seguro pedir pra escolher de novo.
  function changeProject(newProjectId: string) {
    setProjectId(newProjectId);
    setSelectedType(null);
  }

  async function startSelected() {
    if (!projectId || !selectedType) return;
    setStarting(true);
    try {
      const categories =
        selectedType === "security"
          ? ["DEEP_SECURITY"]
          : selectedType === "active"
            ? ["ACTIVE_SECURITY_TEST"]
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

  const activeCount = analyses.filter((analysis) =>
    ["QUEUED", "CRAWLING", "ANALYZING", "AI_REVIEW"].includes(analysis.status),
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow="Ciclo de qualidade"
        title="Análises"
        description="Execute verificações, acompanhe o processamento e compare a evolução dos projetos."
      />

      <section className="rounded-lg border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Nova análise</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Selecione o projeto e escolha o escopo adequado.
          </p>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
          <div>
            <label
              htmlFor="analysis-project"
              className="mb-1.5 block text-sm font-medium"
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
              <div className="mt-3">
                <QueryErrorState
                  compact
                  title="Projetos indisponíveis"
                  description="Não foi possível carregar as opções."
                  onRetry={() => void refetchProjects()}
                />
              </div>
            ) : (
              projects.length === 0 && (
                <Link
                  href="/projects"
                  className="mt-2 inline-flex text-xs text-primary hover:underline"
                >
                  Cadastre um projeto primeiro
                </Link>
              )
            )}
          </div>
          <div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <button
                type="button"
                onClick={() => setSelectedType("qa")}
                disabled={!projectId}
                aria-pressed={selectedType === "qa"}
                className={cn(
                  "group flex gap-3 rounded-md border p-4 text-left hover:border-primary/50 hover:bg-accent/30 disabled:pointer-events-none disabled:opacity-50",
                  selectedType === "qa" && "border-primary bg-primary/[0.06]",
                )}
              >
                <Play className="h-5 w-5 text-primary" />
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
                  "group flex gap-3 rounded-md border p-4 text-left hover:border-primary/50 hover:bg-accent/30 disabled:pointer-events-none disabled:opacity-50",
                  selectedType === "security" &&
                    "border-amber-400 bg-amber-500/[0.06]",
                )}
              >
                <ShieldAlert className="h-5 w-5 text-amber-400" />
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
                  "group flex gap-3 rounded-md border p-4 text-left hover:border-primary/50 hover:bg-accent/30 disabled:pointer-events-none disabled:opacity-50",
                  selectedType === "active" &&
                    "border-rose-400 bg-rose-500/[0.06]",
                )}
              >
                <Swords className="h-5 w-5 text-rose-400" />
                <span>
                  <strong className="block text-sm font-medium">
                    Teste Ativo Autorizado
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {projectId && !selectedProject?.activeTestingConsent
                      ? "Requer consentimento — habilite na página do projeto."
                      : "Rate-limit, enumeração de usuário e payloads de detecção."}
                  </span>
                </span>
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={() => void startSelected()}
                disabled={!projectId || !selectedType || starting}
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
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold">Histórico</h2>
            <p className="text-xs text-muted-foreground">
              {activeCount > 0
                ? `${activeCount} análise(s) em andamento`
                : `${analyses.length} análise(s) registrada(s)`}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card">
          {isLoading ? (
            <div className="grid place-items-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : isError ? (
            <QueryErrorState
              title="Não foi possível carregar o histórico"
              onRetry={() => void refetch()}
            />
          ) : analyses.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileSearch className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">
                Nenhuma análise executada
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecione um projeto acima para iniciar.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {analyses.map((analysis) => {
                const security = isSecurityAudit(analysis.categories);
                const active = isActiveTest(analysis.categories);
                return (
                  <Link
                    key={analysis.id}
                    href={`/analyses/${analysis.id}`}
                    className="group grid gap-3 px-4 py-3.5 hover:bg-accent/40 sm:grid-cols-[minmax(0,1fr)_180px_80px_20px] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {analysis.projectName}
                        </span>
                        <span className="tabular text-xs text-muted-foreground">
                          v{analysis.version}
                        </span>
                        <AnalysisStatusBadge status={analysis.status} />
                        {security && (
                          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                            Segurança
                          </Badge>
                        )}
                        {active && (
                          <Badge className="border-rose-500/30 bg-rose-500/10 text-rose-300">
                            Teste ativo
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {analysis.projectUrl}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>
                        {analysis.issueCount} problema(s) ·{" "}
                        {analysis.pagesDiscovered} página(s)
                      </p>
                      <p>
                        {formatDuration(analysis.durationMs)} ·{" "}
                        {timeAgo(analysis.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "tabular text-right text-lg font-semibold",
                        analysis.score
                          ? scoreColor(analysis.score.overall)
                          : "text-muted-foreground",
                      )}
                    >
                      {analysis.score?.overall ?? "—"}
                    </span>
                    <ArrowRight className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
