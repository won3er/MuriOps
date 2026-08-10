"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Clock,
  FileCode2,
  FileSearch,
  FolderKanban,
  GitBranch,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { MetricTile } from "@/components/metric-tile";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  useAnalysesList,
  useDashboard,
  useProjectRemediationPlans,
  useProjects,
  useUpgradePlans,
} from "@/lib/queries";
import { formatDuration, scoreColor, timeAgo } from "@/lib/utils";

const PLAN_STATUS: Record<string, string> = {
  PENDING: "Gerando",
  READY: "Pronto",
  FAILED: "Falhou",
};

function HistorySection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Activity;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <header className="flex items-start gap-3 border-b px-4 py-3.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border bg-background text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="divide-y">{children}</div>
    </section>
  );
}

function EmptyHistory({ children }: { children: ReactNode }) {
  return <p className="px-4 py-7 text-center text-sm text-muted-foreground">{children}</p>;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useDashboard();
  const { data: projects = [], isLoading: projectsLoading, isError: projectsError, refetch: refetchProjects } = useProjects();
  const { data: analyses = [], isLoading: analysesLoading, isError: analysesError, refetch: refetchAnalyses } = useAnalysesList();
  const { data: upgradePlans = [], isLoading: upgradesLoading, isError: upgradesError, refetch: refetchUpgrades } = useUpgradePlans();
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    if (!projectId && projects[0]) setProjectId(projects[0].id);
  }, [projectId, projects]);

  const { data: remediationPlans = [], isLoading: remediationLoading, isError: remediationError, refetch: refetchRemediation } = useProjectRemediationPlans(projectId);
  const selectedProject = projects.find((project) => project.id === projectId);
  const selectedAnalyses = analyses.filter((analysis) => analysis.projectId === projectId).slice(0, 4);
  const selectedUpgrades = upgradePlans.filter((plan) => plan.projectId === projectId).slice(0, 4);
  const hasError = statsError || projectsError || analysesError || upgradesError || remediationError;

  function retry() {
    void refetchStats();
    void refetchProjects();
    void refetchAnalyses();
    void refetchUpgrades();
    if (projectId) {
      void refetchRemediation();
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow="Workspace principal"
        title="Visão geral"
        description="Indicadores e histórico do projeto selecionado. As ações de criar e executar permanecem em suas áreas próprias."
      />

      {hasError ? (
        <QueryErrorState title="Não foi possível carregar a visão geral" onRetry={retry} />
      ) : (
        <>
          <section className="grid overflow-hidden rounded-lg border bg-card sm:grid-cols-2 xl:grid-cols-5">
            <MetricTile label="Projetos" value={stats?.totalProjects ?? "—"} icon={FolderKanban} />
            <MetricTile label="Análises" value={stats?.totalAnalyses ?? "—"} icon={Activity} />
            <MetricTile label="Score médio" value={stats?.averageScore ?? "—"} icon={BarChart3} valueClassName={stats?.averageScore != null ? scoreColor(stats.averageScore) : undefined} />
            <MetricTile label="Problemas" value={stats?.totalIssues ?? "—"} icon={AlertTriangle} />
            <MetricTile label="Tempo médio" value={formatDuration(stats?.averageDurationMs ?? 0)} icon={Clock} />
          </section>

          <section className="rounded-lg border bg-card p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Histórico por projeto</h2>
                <p className="mt-1 text-sm text-muted-foreground">Selecione um projeto para consultar suas atividades sem misturar dados de outros contextos.</p>
              </div>
              <div className="w-full sm:w-80">
                <label htmlFor="dashboard-project" className="mb-1.5 block text-xs text-muted-foreground">Projeto em foco</label>
                <select id="dashboard-project" value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={projectsLoading || projects.length === 0} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Selecione um projeto…</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </div>
            </div>
            {selectedProject && <p className="mt-4 truncate border-t pt-3 text-xs text-muted-foreground">{selectedProject.url}</p>}
          </section>

          {!projectId ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {projectsLoading ? "Carregando projetos…" : "Cadastre um projeto em Projetos para começar a acompanhar seu histórico."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              <HistorySection title="Histórico de análises" description="Análises QA e de segurança deste projeto" icon={FileSearch}>
                {analysesLoading ? <EmptyHistory>Carregando análises…</EmptyHistory> : selectedAnalyses.length === 0 ? <EmptyHistory>Nenhuma análise registrada para este projeto.</EmptyHistory> : selectedAnalyses.map((analysis) => (
                  <Link key={analysis.id} href={`/analyses/${analysis.id}`} className="group grid gap-2 px-4 py-3 hover:bg-accent/40 sm:grid-cols-[minmax(0,1fr)_74px_20px] sm:items-center">
                    <div className="min-w-0"><p className="truncate text-sm font-medium group-hover:text-primary">Análise v{analysis.version}</p><p className="mt-0.5 text-xs text-muted-foreground">{analysis.issueCount} problema(s) · {timeAgo(analysis.createdAt)}</p></div>
                    <span className={scoreColor(analysis.score?.overall ?? 0) + " text-right text-lg font-semibold tabular"}>{analysis.score?.overall ?? "—"}</span>
                    <ArrowRight className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                  </Link>
                ))}
              </HistorySection>

              <HistorySection title="Histórico de aplicações" description="Planos de remediação gerados para este projeto" icon={Wrench}>
                {remediationLoading ? <EmptyHistory>Carregando aplicações…</EmptyHistory> : remediationPlans.length === 0 ? <EmptyHistory>Nenhum plano de aplicação registrado para este projeto.</EmptyHistory> : remediationPlans.slice(0, 4).map((plan) => (
                  <Link key={plan.id} href={`/aplicacao/${plan.id}`} className="group flex items-center gap-3 px-4 py-3 hover:bg-accent/40"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium group-hover:text-primary">{plan.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{plan.doneCount}/{plan.itemCount} item(ns) concluído(s) · {timeAgo(plan.createdAt)}</p></div><Badge>{PLAN_STATUS[plan.status] ?? plan.status}</Badge><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></Link>
                ))}
              </HistorySection>

              <HistorySection title="Histórico de atualizações" description="Planos de tecnologia vinculados a este projeto" icon={FileCode2}>
                {upgradesLoading ? <EmptyHistory>Carregando atualizações…</EmptyHistory> : selectedUpgrades.length === 0 ? <EmptyHistory>Nenhum plano de atualização vinculado a este projeto.</EmptyHistory> : selectedUpgrades.map((plan) => (
                  <Link key={plan.id} href={`/atualizar/${plan.id}`} className="group flex items-center gap-3 px-4 py-3 hover:bg-accent/40"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium group-hover:text-primary">{plan.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{plan.doneCount}/{plan.itemCount} item(ns) atualizado(s) · {timeAgo(plan.createdAt)}</p></div><Badge>{PLAN_STATUS[plan.status] ?? plan.status}</Badge><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></Link>
                ))}
              </HistorySection>

              <HistorySection title="Reconciliação" description="A última análise deste projeto já foi aplicada?" icon={GitBranch}>
                <Link href={`/projects/${projectId}`} className="group flex items-center gap-3 px-4 py-3 hover:bg-accent/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium group-hover:text-primary">Ver status de reconciliação</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Itens aplicados vs. pendentes na página do projeto</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </HistorySection>
            </div>
          )}
        </>
      )}
    </div>
  );
}
