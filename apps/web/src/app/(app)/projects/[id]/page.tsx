"use client";

import type { Analysis, ProjectWithStats } from "@qa-ai/shared";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Globe2,
  Loader2,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnalysisStatusBadge } from "@/components/status-badge";
import { MetricTile } from "@/components/metric-tile";
import { LocalNav, PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { ActionError } from "@/components/action-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useProjectRemediationPlans, useReconciliation } from "@/lib/queries";
import { cn, formatDuration, scoreColor, timeAgo } from "@/lib/utils";

const RECONCILIATION_STATUS: Record<
  string,
  { label: string; className: string }
> = {
  no_analysis: {
    label: "Sem análise ainda",
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
  },
  no_plan: {
    label: "Sem Aplicação gerada",
    className: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  },
  pending_items: {
    label: "Itens pendentes",
    className: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  },
  applied_gate_failing: {
    label: "Aplicado, mas abaixo do gate",
    className: "border-red-500/40 bg-red-500/15 text-red-300",
  },
  all_applied: {
    label: "Em dia",
    className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  },
};

const PLAN_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Gerando…",
    className: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  },
  READY: {
    label: "Pronta",
    className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  },
  FAILED: {
    label: "Falhou",
    className: "border-red-500/40 bg-red-500/15 text-red-300",
  },
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectWithStats | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [analysesError, setAnalysesError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [consentFormOpen, setConsentFormOpen] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [consentError, setConsentError] = useState<unknown>(null);
  const {
    data: remediationPlans = [],
    isError: remediationError,
    refetch: refetchRemediation,
  } = useProjectRemediationPlans(id);
  const { data: reconciliation, isLoading: reconciliationLoading } =
    useReconciliation(id);

  async function loadProject() {
    setLoading(true);
    setLoadError(null);
    setAnalysesError(null);
    const [projectResult, analysesResult] = await Promise.allSettled([
      api.getProject(id),
      api.projectAnalyses(id),
    ]);

    if (projectResult.status === "fulfilled") {
      setProject(projectResult.value);
    } else {
      setLoadError(projectResult.reason);
    }

    if (analysesResult.status === "fulfilled") {
      setAnalyses(analysesResult.value);
    } else {
      setAnalysesError(analysesResult.reason);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadProject();
  }, [id]);

  async function removeAnalysis(analysisId: string, version: number) {
    if (
      !confirm(`Apagar a análise v${version}? Essa ação não pode ser desfeita.`)
    )
      return;
    setDeletingId(analysisId);
    setActionError(null);
    try {
      await api.deleteAnalysis(analysisId);
      setAnalyses((current) =>
        current.filter((analysis) => analysis.id !== analysisId),
      );
    } catch (error) {
      setActionError(error);
    } finally {
      setDeletingId(null);
    }
  }

  async function removeProject() {
    if (
      !confirm(
        `Apagar o projeto "${project?.name}"? Isso remove todas as análises, aplicações e conexões associadas.`,
      )
    )
      return;
    setDeletingProject(true);
    setActionError(null);
    try {
      await api.deleteProject(id);
      router.push("/projects");
    } catch (error) {
      setActionError(error);
      setDeletingProject(false);
    }
  }

  async function grantActiveTestingConsent() {
    setSavingConsent(true);
    setConsentError(null);
    try {
      const updated = await api.updateActiveTestingConsent(id, true);
      setProject((current) => (current ? { ...current, ...updated } : current));
      setConsentFormOpen(false);
    } catch (error) {
      setConsentError(error);
    } finally {
      setSavingConsent(false);
    }
  }

  async function revokeActiveTestingConsent() {
    if (!confirm("Revogar o consentimento de Teste Ativo Autorizado para este projeto?"))
      return;
    setSavingConsent(true);
    setConsentError(null);
    try {
      const updated = await api.updateActiveTestingConsent(id, false);
      setProject((current) => (current ? { ...current, ...updated } : current));
    } catch (error) {
      setConsentError(error);
    } finally {
      setSavingConsent(false);
    }
  }

  if (loading) {
    return (
      <div
        className="grid place-items-center py-24 text-muted-foreground"
        role="status"
      >
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="mt-3 text-sm">Carregando projeto…</span>
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <QueryErrorState
          title="Não foi possível carregar este projeto"
          onRetry={() => void loadProject()}
        />
      </div>
    );
  }

  const recentAnalyses = [...analyses]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 6);
  const latestAnalysis = recentAnalyses[0];
  const completedAnalyses = analyses.filter(
    (analysis) => analysis.status === "COMPLETED",
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Projetos", href: "/projects" },
          { label: project?.name ?? "Carregando…" },
        ]}
        title={project?.name ?? "Projeto"}
        description={
          project ? (
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 truncate hover:text-foreground"
            >
              <Globe2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{project.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : (
            "Carregando informações do projeto…"
          )
        }
        actions={
          <>
            <Link href={`/aplicacao?projectId=${id}`}>
              <Button variant="outline" size="sm">
                <Settings2 className="h-3.5 w-3.5" /> Conexões
              </Button>
            </Link>
            <Link href={`/analyses?projectId=${id}`}>
              <Button size="sm">
                <FileSearch className="h-3.5 w-3.5" /> Nova análise
              </Button>
            </Link>
          </>
        }
      />

      {(analysesError || remediationError) && (
        <QueryErrorState
          compact
          title="Parte dos dados está indisponível"
          description="O projeto foi carregado, mas alguns históricos não puderam ser consultados."
          onRetry={() => {
            void loadProject();
            void refetchRemediation();
          }}
        />
      )}

      <ActionError
        error={actionError}
        message="Não foi possível concluir a exclusão. Tente novamente."
      />

      <LocalNav
        items={[
          { label: "Visão geral", href: `/projects/${id}`, active: true },
          {
            label: "Análises",
            href: `/analyses?projectId=${id}`,
            count: analyses.length,
          },
          {
            label: "Aplicações",
            href: `/aplicacao?projectId=${id}`,
            count: remediationPlans.length,
          },
          {
            label: "Conexões",
            href: `/aplicacao?projectId=${id}&view=connections`,
          },
        ]}
      />

      <section className="grid overflow-hidden rounded-lg border bg-card sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Score atual"
          value={project?.lastScore ?? "—"}
          icon={Activity}
          valueClassName={
            project?.lastScore !== null && project?.lastScore !== undefined
              ? scoreColor(project.lastScore)
              : undefined
          }
          detail={
            project?.lastAnalysisAt
              ? `Atualizado ${timeAgo(project.lastAnalysisAt)}`
              : "Sem análise"
          }
        />
        <MetricTile
          label="Análises concluídas"
          value={completedAnalyses}
          icon={FileSearch}
          detail={`${analyses.length} execução(ões) no total`}
        />
        <MetricTile
          label="Aplicações"
          value={remediationPlans.length}
          icon={Wrench}
          detail={`${remediationPlans.filter((plan) => plan.status === "READY").length} pronta(s)`}
        />
        <MetricTile
          label="Última atividade"
          value={
            project?.lastAnalysisAt ? timeAgo(project.lastAnalysisAt) : "—"
          }
          icon={CalendarDays}
          detail={
            latestAnalysis
              ? `Análise v${latestAnalysis.version}`
              : "Nenhuma atividade"
          }
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Reconciliação</h2>
                <p className="text-xs text-muted-foreground">
                  A última análise já foi aplicada de verdade?
                </p>
              </div>
              {reconciliation && (
                <Badge
                  className={
                    RECONCILIATION_STATUS[reconciliation.status]?.className
                  }
                >
                  {RECONCILIATION_STATUS[reconciliation.status]?.label ??
                    reconciliation.status}
                </Badge>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border bg-card">
              {reconciliationLoading ? (
                <div className="flex items-center justify-center px-5 py-7">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : !reconciliation || reconciliation.status === "no_analysis" ? (
                <div className="flex items-center gap-4 px-5 py-7">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border bg-muted">
                    <FileSearch className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Nenhuma análise concluída ainda
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Rode a primeira análise pra ter algo pra reconciliar.
                    </p>
                  </div>
                  <Link href={`/analyses?projectId=${id}`}>
                    <Button variant="outline" size="sm">
                      Analisar
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <span className="text-muted-foreground">
                      Análise v{reconciliation.latestAnalysis?.version} ·{" "}
                      {reconciliation.latestAnalysis?.daysSinceFinished === 0
                        ? "hoje"
                        : reconciliation.latestAnalysis?.daysSinceFinished === 1
                          ? "há 1 dia"
                          : `há ${reconciliation.latestAnalysis?.daysSinceFinished} dias`}
                    </span>
                    {reconciliation.latestAnalysis?.overallScore !== null && (
                      <span
                        className={cn(
                          "font-semibold tabular",
                          scoreColor(reconciliation.latestAnalysis?.overallScore ?? 0),
                        )}
                      >
                        Score {reconciliation.latestAnalysis?.overallScore}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {reconciliation.totalDone}/{reconciliation.totalItems} item(ns)
                      aplicado(s)
                    </span>
                  </div>

                  {reconciliation.status === "no_plan" && (
                    <p className="flex items-center gap-2 text-xs text-amber-300">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      Essa análise ainda não virou uma Aplicação — envie pra
                      Aplicação pra começar a rastrear o que foi corrigido.
                    </p>
                  )}
                  {reconciliation.status === "all_applied" && (
                    <p className="flex items-center gap-2 text-xs text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Todos os itens da última análise já foram marcados como
                      aplicados{reconciliation.gateEvaluation ? " e os quality gates passam." : "."}
                    </p>
                  )}
                  {reconciliation.status === "applied_gate_failing" &&
                    reconciliation.gateEvaluation && (
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-2 text-xs text-red-300">
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                          Todos os itens foram aplicados, mas o score ainda não
                          bate os quality gates configurados.
                        </p>
                        <ul className="space-y-1 pl-5 text-xs text-muted-foreground">
                          {reconciliation.gateEvaluation.details
                            .filter((d) => !d.passed)
                            .map((d, i) => (
                              <li key={i} className="list-disc">
                                {d.label ?? d.category ?? "Score geral"}: {d.actual}{" "}
                                / mínimo {d.minScore}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  <div className="flex gap-2 pt-1">
                    {reconciliation.status === "no_plan" ? (
                      <Link href={`/aplicacao?projectId=${id}`}>
                        <Button size="sm">Enviar para Aplicação</Button>
                      </Link>
                    ) : (
                      <Link href={`/analyses?projectId=${id}`}>
                        <Button variant="outline" size="sm">
                          Reanalisar
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Análises recentes</h2>
                <p className="text-xs text-muted-foreground">
                  Histórico de qualidade deste projeto
                </p>
              </div>
              <Link
                href={`/analyses?projectId=${id}`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Ver todas
              </Link>
            </div>

            <div className="overflow-hidden rounded-lg border bg-card">
              {recentAnalyses.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <FileSearch className="mb-3 h-6 w-6 text-muted-foreground" />
                  <p className="font-medium">Nenhuma análise executada</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Rode a primeira Análise QA padrão ou Análise de Segurança.
                  </p>
                  <Link href={`/analyses?projectId=${id}`} className="mt-4">
                    <Button size="sm">Iniciar análise</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y">
                  {recentAnalyses.map((analysis) => {
                    const security =
                      analysis.categories.length === 1 &&
                      analysis.categories[0] === "DEEP_SECURITY";
                    return (
                      <div
                        key={analysis.id}
                        className="group flex flex-col gap-3 px-4 py-3.5 hover:bg-accent/40 sm:flex-row sm:items-center"
                      >
                        <Link
                          href={`/analyses/${analysis.id}`}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <span className="tabular w-7 shrink-0 text-xs text-muted-foreground">
                            v{analysis.version}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">
                                {security
                                  ? "Análise de Segurança"
                                  : "Análise QA padrão"}
                              </span>
                              {security && (
                                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                              )}
                              <AnalysisStatusBadge status={analysis.status} />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {analysis.issueCount} problema(s) ·{" "}
                              {analysis.pagesDiscovered} página(s)
                              {" · "}
                              {formatDuration(analysis.durationMs)}
                            </p>
                          </div>
                        </Link>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(analysis.createdAt)}
                          </span>
                          {analysis.score && (
                            <span
                              className={cn(
                                "tabular w-8 text-right text-base font-semibold",
                                scoreColor(analysis.score.overall),
                              )}
                            >
                              {analysis.score.overall}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground opacity-100 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                            disabled={deletingId === analysis.id}
                            onClick={() =>
                              removeAnalysis(analysis.id, analysis.version)
                            }
                            aria-label={`Apagar análise v${analysis.version}`}
                          >
                            {deletingId === analysis.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Aplicações</h2>
                <p className="text-xs text-muted-foreground">
                  Planos de correção gerados para o projeto
                </p>
              </div>
              <Link
                href={`/aplicacao?projectId=${id}`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Abrir Aplicação
              </Link>
            </div>

            <div className="overflow-hidden rounded-lg border bg-card">
              {remediationPlans.length === 0 ? (
                <div className="flex items-center gap-4 px-5 py-7">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border bg-muted">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Nenhuma aplicação criada
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Envie uma análise concluída para Aplicação.
                    </p>
                  </div>
                  <Link href={`/aplicacao?projectId=${id}`}>
                    <Button variant="outline" size="sm">
                      Abrir
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y">
                  {remediationPlans.slice(0, 5).map((plan) => {
                    const status = PLAN_STATUS[plan.status];
                    return (
                      <Link
                        key={plan.id}
                        href={`/aplicacao/${plan.id}`}
                        className="group flex items-center gap-3 px-4 py-3.5 hover:bg-accent/40"
                      >
                        <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {plan.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {plan.doneCount}/{plan.itemCount} item(ns)
                            aplicado(s)
                          </p>
                        </div>
                        <Badge className={status?.className}>
                          {status?.label ?? plan.status}
                        </Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section>
            <h2 className="mb-3 text-base font-semibold">
              Continuar trabalhando
            </h2>
            <div className="overflow-hidden rounded-lg border bg-card">
              {[
                {
                  href: `/analyses?projectId=${id}`,
                  label: "Rodar nova análise",
                  description: "Avaliar qualidade ou segurança",
                  icon: FileSearch,
                },
                {
                  href: `/aplicacao?projectId=${id}`,
                  label: "Gerenciar aplicações",
                  description: "Planos e conexões do projeto",
                  icon: Wrench,
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex gap-3 border-b px-4 py-3.5 last:border-b-0 hover:bg-accent/40"
                >
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">Sobre o projeto</h2>
            <Card>
              <CardContent className="space-y-4 py-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">
                    URL monitorada
                  </p>
                  <p className="mt-1 truncate">{project?.url ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Criado</p>
                  <p className="mt-1">
                    {project?.createdAt
                      ? new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "medium",
                        }).format(new Date(project.createdAt))
                      : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Teste Ativo Autorizado</p>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              Modo opt-in da Análise de Segurança: testa rate-limit de login,
              indícios de enumeração de usuário e payloads de detecção
              limitados contra os formulários do próprio site. Sem isso
              marcado, essa categoria nunca roda.
            </p>

            {project?.activeTestingConsent ? (
              <div className="mt-3 space-y-2">
                <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
                  Autorizado
                </Badge>
                {project.activeTestingConsentAt && (
                  <p className="text-xs text-muted-foreground">
                    Confirmado em{" "}
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(project.activeTestingConsentAt))}
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-0 text-muted-foreground hover:text-foreground"
                  disabled={savingConsent}
                  onClick={revokeActiveTestingConsent}
                >
                  {savingConsent ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Revogar autorização
                </Button>
              </div>
            ) : consentFormOpen ? (
              <div className="mt-3 space-y-3 rounded-md border border-primary/30 bg-primary/[0.04] p-3">
                <p className="text-xs leading-5">
                  Confirmo que sou o proprietário deste site (
                  <span className="font-medium">{project?.url}</span>) ou
                  tenho autorização por escrito do proprietário para realizar
                  testes de segurança ativos, incluindo tentativas de força
                  bruta em login e envio de payloads de detecção contra
                  formulários. Entendo que essa ação fica registrada com meu
                  usuário e o horário da confirmação.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={savingConsent}
                    onClick={grantActiveTestingConsent}
                  >
                    {savingConsent ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Confirmar e autorizar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={savingConsent}
                    onClick={() => setConsentFormOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setConsentFormOpen(true)}
              >
                Habilitar
              </Button>
            )}

            {consentError ? (
              <p className="mt-2 text-xs text-destructive">
                Não foi possível salvar. Tente novamente.
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-destructive/25 p-4">
            <p className="text-sm font-medium">Zona de risco</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Apagar remove análises, aplicações e conexões associadas.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 px-0 text-destructive hover:bg-transparent hover:text-destructive"
              disabled={deletingProject}
              onClick={removeProject}
            >
              {deletingProject ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Apagar projeto
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
