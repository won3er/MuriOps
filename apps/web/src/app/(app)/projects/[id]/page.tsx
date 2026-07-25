"use client";

import type { Analysis, Project } from "@qa-ai/shared";
import { Loader2, Play, ShieldAlert, Trash2, Wrench } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysisStatusBadge } from "@/components/status-badge";
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

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [starting, setStarting] = useState(false);
  const [startingSecurity, setStartingSecurity] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"normal" | "security" | "remediation">("normal");
  const { data: remediationPlans = [] } = useProjectRemediationPlans(id);

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
        <div className="flex flex-col items-stretch gap-2 min-[420px]:items-end sm:shrink-0">
          <div className="flex flex-col gap-2 min-[420px]:flex-row">
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
                  <ShieldAlert className="h-4 w-4" /> Análise de Segurança
                </>
              )}
            </Button>
            <Button onClick={start} disabled={starting}>
              {starting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Play className="h-4 w-4" /> Análise QA padrão
                </>
              )}
            </Button>
          </div>
          <p className="max-w-xs text-right text-xs text-muted-foreground min-[420px]:block">
            <b className="text-foreground/80">QA padrão</b> cobre UI, performance,
            SEO e acessibilidade. <b className="text-foreground/80">Segurança</b>{" "}
            audita TLS, DNS e dados expostos.
          </p>
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
              <span className="hidden sm:inline">Análises QA padrão</span>
              <span className="sm:hidden">QA</span> ({normalAnalyses.length})
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
              <span className="hidden sm:inline">Análises de Segurança</span>
              <span className="sm:hidden">Segurança</span> ({securityAnalyses.length})
            </button>
            <button
              onClick={() => setTab("remediation")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                tab === "remediation"
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Aplicações</span> ({remediationPlans.length})
            </button>
          </div>
        </div>
        {tab === "remediation" ? (
          remediationPlans.length === 0 ? (
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
          )
        ) : visibleAnalyses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
                {tab === "normal" ? (
                  <Play className="h-6 w-6" />
                ) : (
                  <ShieldAlert className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {tab === "normal"
                    ? "Nenhuma análise QA padrão ainda"
                    : "Nenhuma análise de segurança ainda"}
                </p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {tab === "normal"
                    ? "Roda o site inteiro e verifica UI, UX, performance, SEO e acessibilidade página por página."
                    : "Audita TLS/HTTPS, DNS, headers, segredos expostos e outros pontos de segurança."}
                </p>
              </div>
              <Button
                onClick={tab === "normal" ? start : startSecurityAudit}
                disabled={tab === "normal" ? starting : startingSecurity}
                size="sm"
              >
                {tab === "normal" ? (
                  <Play className="h-3.5 w-3.5" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5" />
                )}
                Iniciar agora
              </Button>
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
