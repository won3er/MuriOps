"use client";

import type { Analysis, ProjectWithStats } from "@qa-ai/shared";
import {
  ChevronDown,
  FileSearch,
  GitBranch,
  Loader2,
  Plug,
  ShieldAlert,
  Trash2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysisStatusBadge } from "@/components/status-badge";
import { McpConnectionPanel } from "@/components/mcp-connection-panel";
import { GithubConnectionPanel } from "@/components/github-connection-panel";
import {
  FtpConnectionPanel,
  NuvemshopConnectionPanel,
  ShopifyConnectionPanel,
  WordpressConnectionPanel,
} from "@/components/platform-connection-panels";
import { api } from "@/lib/api";
import { useProjectRemediationPlans } from "@/lib/queries";
import { cn, formatDuration, scoreColor, timeAgo } from "@/lib/utils";

const REMEDIATION_STATUS_LABEL: Record<string, string> = {
  PENDING: "Gerando…",
  READY: "Pronta",
  FAILED: "Falhou",
};
const REMEDIATION_STATUS_CLASS: Record<string, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  READY: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  FAILED: "border-red-500/40 bg-red-500/15 text-red-300",
};

/**
 * Painel administrativo do projeto (dashboard) — métricas, histórico
 * recente (só leitura) e conexões/integrações. Rodar uma análise nova é
 * responsabilidade da funcionalidade "Análise" (`/analyses`); esta tela não
 * inicia análises, só administra o projeto e resume o que já existe.
 */
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectWithStats | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const { data: remediationPlans = [] } = useProjectRemediationPlans(id);

  useEffect(() => {
    api.getProject(id).then(setProject).catch(() => {});
    api.projectAnalyses(id).then(setAnalyses).catch(() => {});
  }, [id]);

  async function removeAnalysis(analysisId: string, version: number) {
    if (!confirm(`Apagar a análise v${version}? Essa ação não pode ser desfeita.`))
      return;
    setDeletingId(analysisId);
    try {
      await api.deleteAnalysis(analysisId);
      setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
    } catch {
      /* mantém na lista se falhar */
    } finally {
      setDeletingId(null);
    }
  }

  async function removeProject() {
    if (
      !confirm(
        `Apagar o projeto "${project?.name}"? Isso remove todas as análises, aplicações e conexões associadas — não pode ser desfeito.`,
      )
    )
      return;
    setDeletingProject(true);
    try {
      await api.deleteProject(id);
      router.push("/projects");
    } catch {
      setDeletingProject(false);
    }
  }

  const isSecurityAudit = (a: Analysis) =>
    a.categories.length === 1 && a.categories[0] === "DEEP_SECURITY";
  const recentAnalyses = [...analyses]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{project?.name ?? "Projeto"}</h1>
          <a
            href={project?.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm text-muted-foreground hover:text-foreground"
          >
            {project?.url}
          </a>
        </div>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          disabled={deletingProject}
          onClick={removeProject}
        >
          {deletingProject ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Apagar projeto
        </Button>
      </div>

      {/* Métricas — visão de dashboard do projeto. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs text-muted-foreground">Análises rodadas</p>
            <p className="mt-1 text-2xl font-semibold tabular">
              {project?.analysisCount ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs text-muted-foreground">Última pontuação</p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tabular",
                project?.lastScore != null ? scoreColor(project.lastScore) : "",
              )}
            >
              {project?.lastScore ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs text-muted-foreground">Última análise</p>
            <p className="mt-1 text-2xl font-semibold tabular">
              {project?.lastAnalysisAt ? timeAgo(project.lastAnalysisAt) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Análises recentes — só leitura; rodar uma nova é em "Análise". */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Análises recentes</h2>
          <Link href="/analyses">
            <Button size="sm" variant="outline">
              <FileSearch className="h-3.5 w-3.5" /> Ir para Análise
            </Button>
          </Link>
        </div>
        {recentAnalyses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
                <FileSearch className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Nenhuma análise ainda</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Rode a primeira análise QA padrão ou de Segurança deste
                  projeto na funcionalidade "Análise".
                </p>
              </div>
              <Link href="/analyses">
                <Button size="sm" variant="outline">
                  <FileSearch className="h-3.5 w-3.5" /> Ir para Análise
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentAnalyses.map((a) => (
              <Card key={a.id} className="transition-colors hover:border-primary/50">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href={`/analyses/${a.id}`}
                    className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5"
                  >
                    <span className="tabular text-sm text-muted-foreground">
                      v{a.version}
                    </span>
                    {isSecurityAudit(a) && (
                      <Badge className="border-border text-muted-foreground">
                        <ShieldAlert className="h-3 w-3" /> Segurança
                      </Badge>
                    )}
                    <AnalysisStatusBadge status={a.status} />
                    <span className="text-xs text-muted-foreground">
                      {a.issueCount} problema(s) · {a.pagesDiscovered} página(s)
                    </span>
                  </Link>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="tabular text-xs text-muted-foreground">
                      {formatDuration(a.durationMs)} · {timeAgo(a.createdAt)}
                    </span>
                    <div className="flex items-center gap-3">
                      {a.score && (
                        <span
                          className={cn(
                            "tabular text-lg font-bold",
                            scoreColor(a.score.overall),
                          )}
                        >
                          {a.score.overall}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={deletingId === a.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeAnalysis(a.id, a.version);
                        }}
                        aria-label="Apagar análise"
                      >
                        {deletingId === a.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {analyses.length > recentAnalyses.length && (
              <Link
                href="/analyses"
                className="block text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Ver todas as {analyses.length} análises em Análise →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Aplicações geradas a partir das análises deste projeto. */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Aplicações</h2>
        {remediationPlans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Nenhuma Aplicação ainda</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Depois de uma análise concluída, vá em "Aplicação" no menu
                  para transformar os achados num checklist pronto para
                  aplicar no seu projeto.
                </p>
              </div>
              <Link href="/aplicacao">
                <Button size="sm" variant="outline">
                  <Wrench className="h-3.5 w-3.5" /> Ir para Aplicação
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {remediationPlans.map((plan) => (
              <Link key={plan.id} href={`/aplicacao/${plan.id}`}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="truncate font-medium">{plan.title}</span>
                      <Badge className={REMEDIATION_STATUS_CLASS[plan.status]}>
                        {REMEDIATION_STATUS_LABEL[plan.status] ?? plan.status}
                      </Badge>
                      {plan.status === "READY" && (
                        <span className="tabular text-xs text-muted-foreground">
                          {plan.doneCount}/{plan.itemCount} aplicado(s)
                        </span>
                      )}
                    </div>
                    <span className="tabular text-xs text-muted-foreground">
                      {timeAgo(plan.createdAt)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Conexões e integrações — administração do projeto. */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Conexões e integrações</h2>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <McpConnectionPanel projectId={id} />
            <GithubConnectionPanel projectId={id} />
          </div>
          <div>
            <button
              type="button"
              onClick={() => setPlatformsOpen((v) => !v)}
              className="flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <Plug className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                Conectar plataforma do site (WordPress, Shopify, Nuvemshop, FTP)
              </span>
              <ChevronDown
                className={cn(
                  "ml-auto h-4 w-4 text-muted-foreground transition-transform",
                  platformsOpen && "rotate-180",
                )}
              />
            </button>
            {platformsOpen && (
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <WordpressConnectionPanel projectId={id} />
                <ShopifyConnectionPanel projectId={id} />
                <NuvemshopConnectionPanel projectId={id} />
                <FtpConnectionPanel projectId={id} />
              </div>
            )}
          </div>
          <Link href={`/aplicacao?tab=orquestracao&projectId=${id}`}>
            <Card className="border-primary/30 transition-colors hover:border-primary/60">
              <CardContent className="flex items-center gap-3 py-4">
                <GitBranch className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Orquestração deste projeto</p>
                  <p className="text-sm text-muted-foreground">
                    Nível de autonomia, quality gates e o loop analisar →
                    plano → aplicar → reanalisar ficam dentro de Aplicação.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
