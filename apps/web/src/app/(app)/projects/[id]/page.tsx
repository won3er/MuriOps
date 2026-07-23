"use client";

import type { Analysis, Project } from "@qa-ai/shared";
import { Loader2, Play, ShieldAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysisStatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import { cn, formatDuration, scoreColor, timeAgo } from "@/lib/utils";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [starting, setStarting] = useState(false);
  const [startingSecurity, setStartingSecurity] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"normal" | "security">("normal");

  const loadAnalyses = () =>
    api.projectAnalyses(id).then(setAnalyses).catch(() => {});

  useEffect(() => {
    api.getProject(id).then(setProject).catch(() => {});
    loadAnalyses();
    // Poll enquanto houver análise em andamento.
    const timer = setInterval(loadAnalyses, 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function start() {
    setStarting(true);
    try {
      const analysis = await api.startAnalysis(id);
      router.push(`/analyses/${analysis.id}`);
    } catch {
      setStarting(false);
    }
  }

  /** Auditoria de segurança avançada isolada — mais rápida, roda só esse módulo. */
  async function startSecurityAudit() {
    setStartingSecurity(true);
    try {
      const analysis = await api.startAnalysis(id, {
        categories: ["DEEP_SECURITY"],
      });
      router.push(`/analyses/${analysis.id}`);
    } catch {
      setStartingSecurity(false);
    }
  }

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

  /** Auditoria de segurança = análise que rodou só a categoria DEEP_SECURITY. */
  const isSecurityAudit = (a: Analysis) =>
    a.categories.length === 1 && a.categories[0] === "DEEP_SECURITY";
  const normalAnalyses = analyses.filter((a) => !isSecurityAudit(a));
  const securityAnalyses = analyses.filter(isSecurityAudit);
  const visibleAnalyses = tab === "normal" ? normalAnalyses : securityAnalyses;

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
        <div className="flex flex-col gap-2 min-[420px]:flex-row sm:shrink-0">
          <Button
            variant="outline"
            onClick={startSecurityAudit}
            disabled={startingSecurity}
            title="Auditoria prática de segurança: TLS, DNS, segredos expostos, headers avançados e mais — só esse módulo, mais rápido"
          >
            {startingSecurity ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShieldAlert className="h-4 w-4" /> Auditoria de Segurança
              </>
            )}
          </Button>
          <Button onClick={start} disabled={starting}>
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Play className="h-4 w-4" /> Iniciar análise
              </>
            )}
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium">Histórico</h2>
          <div className="flex gap-1 self-start rounded-lg border border-border p-1">
            <button
              onClick={() => setTab("normal")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                tab === "normal"
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Análises ({normalAnalyses.length})
            </button>
            <button
              onClick={() => setTab("security")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                tab === "security"
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Auditorias de Segurança</span>
              <span className="sm:hidden">Segurança</span> ({securityAnalyses.length})
            </button>
          </div>
        </div>
        {visibleAnalyses.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {tab === "normal"
                ? "Nenhuma análise ainda. Clique em “Iniciar análise”."
                : "Nenhuma auditoria de segurança ainda. Clique em “Auditoria de Segurança”."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visibleAnalyses.map((a) => (
              <Card key={a.id} className="transition-colors hover:border-primary/50">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href={`/analyses/${a.id}`}
                    className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5"
                  >
                    <span className="tabular text-sm text-muted-foreground">
                      v{a.version}
                    </span>
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
          </div>
        )}
      </div>
    </div>
  );
}
