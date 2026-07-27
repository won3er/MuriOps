"use client";

import { FileSearch, Loader2, Play, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysisStatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import { useAnalysesList, useProjects } from "@/lib/queries";
import { formatDuration, scoreColor, timeAgo } from "@/lib/utils";

/** Auditoria de segurança = análise que rodou só a categoria DEEP_SECURITY. */
function isSecurityAudit(categories: string[]): boolean {
  return categories.length === 1 && categories[0] === "DEEP_SECURITY";
}

export default function AnalysesHubPage() {
  const router = useRouter();
  const { data: projects = [] } = useProjects();
  const { data: analyses = [], isLoading } = useAnalysesList();

  const [projectId, setProjectId] = useState("");
  const [starting, setStarting] = useState(false);
  const [startingSecurity, setStartingSecurity] = useState(false);

  async function start(security: boolean) {
    if (!projectId) return;
    security ? setStartingSecurity(true) : setStarting(true);
    try {
      const analysis = await api.startAnalysis(
        projectId,
        security ? { categories: ["DEEP_SECURITY"] } : {},
      );
      router.push(`/analyses/${analysis.id}`);
    } finally {
      security ? setStartingSecurity(false) : setStarting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <FileSearch className="h-6 w-6 text-primary" /> Análise
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rode e acompanhe as análises de qualquer projeto — QA padrão (UI,
          performance, SEO, acessibilidade) ou Segurança (TLS, DNS, headers,
          segredos expostos) — tudo num só lugar.
        </p>
      </div>

      {/* Nova análise */}
      <Card>
        <CardContent className="space-y-4 py-6">
          <h2 className="text-sm font-medium text-muted-foreground">
            Rodar uma nova análise
          </h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div>
              <label
                htmlFor="analise-projeto"
                className="mb-1.5 block text-xs text-muted-foreground"
              >
                Projeto
              </label>
              <select
                id="analise-projeto"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
              >
                <option value="">Selecione um projeto…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              onClick={() => start(true)}
              disabled={!projectId || startingSecurity}
            >
              {startingSecurity ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              Análise de Segurança
            </Button>
            <Button onClick={() => start(false)} disabled={!projectId || starting}>
              {starting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Análise QA padrão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico geral */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Todas as análises</h2>
        {isLoading ? (
          <div className="grid place-items-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : analyses.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhuma análise ainda. Selecione um projeto acima e rode a
              primeira.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {analyses.map((a) => (
              <Card key={a.id} className="transition-colors hover:border-primary/50">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href={`/analyses/${a.id}`}
                    className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5"
                  >
                    <span className="truncate font-medium">{a.projectName}</span>
                    {isSecurityAudit(a.categories) && (
                      <Badge className="border-border text-muted-foreground">
                        <ShieldAlert className="h-3 w-3" /> Segurança
                      </Badge>
                    )}
                    <span className="tabular text-sm text-muted-foreground">
                      v{a.version}
                    </span>
                    <AnalysisStatusBadge status={a.status} />
                    <span className="text-xs text-muted-foreground">
                      {a.issueCount} problema(s) · {a.pagesDiscovered} página(s)
                    </span>
                  </Link>
                  <div className="flex items-center gap-4">
                    <span className="tabular text-xs text-muted-foreground">
                      {formatDuration(a.durationMs)} · {timeAgo(a.createdAt)}
                    </span>
                    {a.score && (
                      <span
                        className={
                          "tabular text-lg font-bold " + scoreColor(a.score.overall)
                        }
                      >
                        {a.score.overall}
                      </span>
                    )}
                    <Link
                      href={`/projects/${a.projectId}`}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Ver projeto
                    </Link>
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
