"use client";

import type { DashboardStats, ProjectWithStats } from "@qa-ai/shared";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Clock,
  FileSearch,
  FolderKanban,
  GitBranch,
  Plus,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MetricTile } from "@/components/metric-tile";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { cn, formatDuration, scoreColor, timeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, projectList] = await Promise.all([
        api.dashboard(),
        api.listProjects(),
      ]);
      setStats(dashboard);
      setProjects(projectList);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const orderedProjects = [...projects].sort((a, b) => {
    if (a.lastAnalysisAt === null) return -1;
    if (b.lastAnalysisAt === null) return 1;
    return a.lastAnalysisAt < b.lastAnalysisAt ? 1 : -1;
  });
  const attentionProjects = projects.filter(
    (project) => project.lastScore === null || project.lastScore < 60,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow="Workspace principal"
        title="Visão geral"
        description="Acompanhe a saúde dos projetos e continue o ciclo de qualidade de onde parou."
        actions={
          <>
            <Link href="/analyses">
              <Button variant="outline" size="sm">
                <FileSearch className="h-3.5 w-3.5" /> Nova análise
              </Button>
            </Link>
            <Link href="/projects">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" /> Novo projeto
              </Button>
            </Link>
          </>
        }
      />

      {error ? (
        <QueryErrorState
          title="Não foi possível carregar a visão geral"
          onRetry={() => void loadDashboard()}
        />
      ) : (
        <>
          <section className="grid overflow-hidden rounded-lg border bg-card sm:grid-cols-2 xl:grid-cols-5">
            <MetricTile
              label="Projetos"
              value={stats?.totalProjects ?? "—"}
              icon={FolderKanban}
            />
            <MetricTile
              label="Análises"
              value={stats?.totalAnalyses ?? "—"}
              icon={Activity}
            />
            <MetricTile
              label="Score médio"
              value={stats?.averageScore ?? "—"}
              icon={BarChart3}
              valueClassName={
                stats?.averageScore != null
                  ? scoreColor(stats.averageScore)
                  : undefined
              }
            />
            <MetricTile
              label="Problemas"
              value={stats?.totalIssues ?? "—"}
              icon={AlertTriangle}
            />
            <MetricTile
              label="Tempo médio"
              value={formatDuration(stats?.averageDurationMs ?? 0)}
              icon={Clock}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Projetos</h2>
                  <p className="text-xs text-muted-foreground">
                    Ordenados pela atividade mais recente
                  </p>
                </div>
                <Link
                  href="/projects"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Ver todos
                </Link>
              </div>

              <div className="overflow-hidden rounded-lg border bg-card">
                {loading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Carregando projetos…
                  </div>
                ) : orderedProjects.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-12 text-center">
                    <FolderKanban className="mb-3 h-6 w-6 text-muted-foreground" />
                    <p className="font-medium">
                      Seu workspace ainda está vazio
                    </p>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Cadastre o primeiro site para começar a acompanhar sua
                      qualidade.
                    </p>
                    <Link href="/projects" className="mt-4">
                      <Button size="sm">
                        <Plus className="h-3.5 w-3.5" /> Criar projeto
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y">
                    {orderedProjects.slice(0, 7).map((project) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="group grid gap-3 px-4 py-3.5 transition-colors hover:bg-accent/50 sm:grid-cols-[minmax(0,1fr)_110px_130px_24px] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium group-hover:text-primary">
                            {project.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {project.url}
                          </p>
                        </div>
                        <div className="flex items-baseline gap-2 sm:block">
                          <span
                            className={cn(
                              "tabular text-lg font-semibold",
                              project.lastScore !== null
                                ? scoreColor(project.lastScore)
                                : "text-muted-foreground",
                            )}
                          >
                            {project.lastScore ?? "—"}
                          </span>
                          <span className="text-[10px] text-muted-foreground sm:ml-1">
                            score
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>{project.analysisCount} análise(s)</p>
                          <p>{timeAgo(project.lastAnalysisAt)}</p>
                        </div>
                        <ArrowRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-5">
              <section>
                <h2 className="mb-3 text-base font-semibold">
                  Atenção necessária
                </h2>
                <Card>
                  <CardContent className="py-4">
                    {attentionProjects.length === 0 ? (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-400" />
                        <div>
                          <p className="text-sm font-medium">
                            Tudo sob controle
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Nenhum projeto está sem análise ou com score
                            crítico.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="tabular text-2xl font-semibold text-amber-400">
                          {attentionProjects.length}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          projeto(s) sem análise ou com score abaixo de 60
                        </p>
                        <Link
                          href="/projects"
                          className="mt-3 inline-flex text-xs text-primary hover:underline"
                        >
                          Revisar projetos
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>

              <section>
                <h2 className="mb-3 text-base font-semibold">Acesso rápido</h2>
                <div className="overflow-hidden rounded-lg border bg-card">
                  {[
                    {
                      href: "/analyses",
                      label: "Rodar análise",
                      icon: FileSearch,
                    },
                    {
                      href: "/aplicacao",
                      label: "Ver aplicações",
                      icon: Wrench,
                    },
                    {
                      href: "/orquestracao",
                      label: "Acompanhar orquestrações",
                      icon: GitBranch,
                    },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-accent/50"
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{item.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
