"use client";

import type { GuardianFindingStatus } from "@qa-ai/shared";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { useParams } from "next/navigation";
import { QueryErrorState } from "@/components/query-error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useGuardianRun, useUpdateGuardianFinding } from "@/lib/queries";

const OVERALL_BADGE: Record<string, string> = {
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  yellow: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  red: "border-red-500/30 bg-red-500/10 text-red-400",
};

const OVERALL_LABEL: Record<string, string> = {
  green: "Passou na auditoria",
  yellow: "Precisa de revisão",
  red: "Crítico — atenção imediata",
};

const RISK_BADGE: Record<string, string> = {
  low: "border-border bg-background/60 text-muted-foreground",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  critical: "border-red-500/30 bg-red-500/10 text-red-400",
};

const RISK_LABEL: Record<string, string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  critical: "Crítico",
};

const FINDING_STATUS_LABEL: Record<GuardianFindingStatus, string> = {
  open: "Aberto",
  acknowledged: "Reconhecido",
  resolved: "Resolvido",
  ignored: "Ignorado",
};

export default function GuardianRunPage() {
  const params = useParams<{ id: string }>();
  const { data: run, isLoading, isError, refetch } = useGuardianRun(params.id);
  const updateFinding = useUpdateGuardianFinding(params.id);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-card px-5 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  if (isError || !run) {
    return (
      <QueryErrorState title="Não foi possível carregar a auditoria" onRetry={() => void refetch()} />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Guardian"
        title={run.title}
        description={
          <>
            {run.sourceName && <>Documento: {run.sourceName} · </>}
            {run.rulesetName && <>Regras: {run.rulesetName} · </>}
            Provider: {run.provider}
          </>
        }
      />

      {run.status === "PENDING" && (
        <div className="flex items-center gap-2 rounded-lg border bg-card px-5 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Auditando documento… esta página atualiza automaticamente.
        </div>
      )}

      {run.status === "FAILED" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Falha na auditoria: {run.error}
        </div>
      )}

      {run.status === "READY" && run.result && (
        <>
          <Card>
            <CardContent className="space-y-3 py-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Resumo executivo</h2>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${OVERALL_BADGE[run.result.overallStatus]}`}
                >
                  {OVERALL_LABEL[run.result.overallStatus]}
                </span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{run.result.summary}</p>
            </CardContent>
          </Card>

          {run.result.findings.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border bg-card px-5 py-8 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Nenhum achado — documento passou na auditoria.
            </div>
          ) : (
            <div className="space-y-3">
              {run.result.findings.map((finding) => (
                <Card key={finding.id}>
                  <CardContent className="space-y-2.5 py-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${RISK_BADGE[finding.riskLevel]}`}
                      >
                        {finding.riskLevel === "critical" && <ShieldAlert className="mr-1 inline h-3 w-3" />}
                        {finding.riskLevel === "high" && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                        {RISK_LABEL[finding.riskLevel]}
                      </span>
                      {finding.ruleDescription && (
                        <span className="rounded-full border bg-background/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                          Regra: {finding.ruleDescription}
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {FINDING_STATUS_LABEL[finding.status]}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold">{finding.title}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">{finding.description}</p>
                    {finding.evidence && (
                      <p className="rounded-md border bg-background/40 p-2 font-mono text-xs text-muted-foreground">
                        {finding.evidence}
                      </p>
                    )}
                    <div className="rounded-md border border-primary/20 bg-primary/[0.04] p-2.5 text-sm">
                      <span className="font-medium text-primary">Correção sugerida: </span>
                      {finding.suggestion}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(["open", "acknowledged", "resolved", "ignored"] as GuardianFindingStatus[]).map(
                        (status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={finding.status === status ? "default" : "outline"}
                            onClick={() =>
                              updateFinding.mutate({ findingId: finding.id, status })
                            }
                            disabled={updateFinding.isPending}
                          >
                            {FINDING_STATUS_LABEL[status]}
                          </Button>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
