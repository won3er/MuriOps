"use client";

import { AlertTriangle, ArrowLeft, Loader2, Printer, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QueryErrorState } from "@/components/query-error-state";
import { useComplianceReport } from "@/lib/queries";
import { scoreColor } from "@/lib/utils";

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: "Crítico",
  HIGH: "Alto",
  MEDIUM: "Médio",
  LOW: "Baixo",
  INFO: "Informativo",
};

export default function ComplianceReportPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const { data: report, isLoading, isError, refetch } = useComplianceReport(projectId);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao projeto
        </Link>
        {report && (
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Imprimir / Salvar como PDF
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : isError || !report ? (
        <QueryErrorState title="Não foi possível gerar o relatório" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-6 rounded-lg border bg-card p-8">
          <header className="space-y-1 border-b pb-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Relatório de postura de segurança e qualidade
            </p>
            <h1 className="text-xl font-semibold">{report.projectName}</h1>
            <p className="text-sm text-muted-foreground">{report.projectUrl}</p>
            <p className="text-xs text-muted-foreground">
              Gerado em {new Date(report.generatedAt).toLocaleString("pt-BR")}
            </p>
          </header>

          <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-xs leading-5 text-muted-foreground">
              <strong className="text-foreground">Isto é uma autoavaliação, não uma certificação.</strong>{" "}
              O MuriOps não passou por nenhuma auditoria formal (SOC 2, ISO 27001 ou
              equivalente) — este documento organiza achados reais coletados pelas
              próprias ferramentas do produto (Análise, Fluxos Críticos, Continuous
              Coverage) para uso interno ou como evidência de processo, não como prova
              de conformidade com um framework regulatório.
            </p>
          </div>

          <section>
            <h2 className="mb-3 text-sm font-semibold">Repositório</h2>
            <p className="text-sm text-muted-foreground">
              {report.repoConnected
                ? "GitHub ou GitLab conectado — achados desta análise têm origem em código real do repositório."
                : "Nenhum repositório conectado no momento."}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold">Última análise</h2>
            {report.latestAnalysis ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span>Versão v{report.latestAnalysis.version}</span>
                  {report.latestAnalysis.overallScore != null && (
                    <span className={scoreColor(report.latestAnalysis.overallScore)}>
                      Score geral: {report.latestAnalysis.overallScore}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {report.latestAnalysis.openIssueCount} problema(s) em aberto
                  </span>
                </div>
                {Object.keys(report.latestAnalysis.issuesBySeverity).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(report.latestAnalysis.issuesBySeverity).map(([sev, count]) => (
                      <Badge key={sev}>
                        {SEVERITY_LABEL[sev] ?? sev}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma análise concluída ainda.</p>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4" /> Monitoramento contínuo
            </h2>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>
                {report.continuousMonitoring.criticalFlowActiveCount} de{" "}
                {report.continuousMonitoring.criticalFlowCount} Fluxo(s) Crítico(s) ativo(s)
                {report.continuousMonitoring.criticalFlowFailingCount > 0 && (
                  <span className="text-red-400">
                    {" "}
                    — {report.continuousMonitoring.criticalFlowFailingCount} falhando atualmente
                  </span>
                )}
              </li>
              <li>
                {report.continuousMonitoring.securityScheduleActiveCount} de{" "}
                {report.continuousMonitoring.securityScheduleCount} agendamento(s) de
                Continuous Coverage ativo(s)
              </li>
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
