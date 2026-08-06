"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  GitBranch,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Target,
  Trash2,
  Workflow,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { GanttChart } from "@/components/blueprint/gantt-chart";
import { MermaidDiagram } from "@/components/blueprint/mermaid-diagram";
import { ProjectionSection } from "@/components/blueprint/projection-section";
import { QaRadar } from "@/components/blueprint/qa-radar";
import { RiskMatrix } from "@/components/blueprint/risk-matrix";
import { TestPyramid } from "@/components/blueprint/test-pyramid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QueryErrorState } from "@/components/query-error-state";
import { api } from "@/lib/api";
import {
  useBlueprint,
  useCreateRemediationPlan,
  useDeleteBlueprint,
  useRegenerateBlueprint,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

const PRIORITY_COLOR: Record<string, string> = {
  P0: "text-red-400 bg-red-400/10",
  P1: "text-orange-400 bg-orange-400/10",
  P2: "text-amber-400 bg-amber-400/10",
  P3: "text-slate-400 bg-slate-400/10",
};

export default function BlueprintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: bp, isLoading, isError, refetch } = useBlueprint(id);
  const regenerate = useRegenerateBlueprint(id);
  const del = useDeleteBlueprint();
  const createRemediation = useCreateRemediationPlan();
  const [downloading, setDownloading] = useState(false);

  function remove() {
    if (!bp || !confirm(`Apagar o blueprint "${bp.title}"?`)) return;
    del.mutate(id, { onSuccess: () => router.push("/blueprints") });
  }

  async function downloadPdf() {
    if (!bp) return;
    setDownloading(true);
    try {
      await api.downloadBlueprintPdf(id, bp.title);
      toast.success("Blueprint preparado para download");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível baixar o blueprint.",
      );
    } finally {
      setDownloading(false);
    }
  }

  function generateApplication() {
    if (!bp) return;
    createRemediation.mutate(
      { sourceType: "blueprint", sourceId: bp.id },
      { onSuccess: (plan) => router.push(`/aplicacao/${plan.id}`) },
    );
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <QueryErrorState
          title="Não foi possível carregar este blueprint"
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!bp) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <p className="text-muted-foreground">Blueprint não encontrado.</p>
        <Link href="/blueprints" className="mt-4 inline-block">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </Link>
      </div>
    );
  }

  const r = bp.result;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/blueprints"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Projetar
          </Link>
          <h1 className="break-words text-2xl font-semibold">{bp.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="uppercase">IA: {bp.provider}</span>
            <span>·</span>
            <span className="capitalize">{bp.mode}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {bp.status === "READY" && (
            <Button
              variant="outline"
              size="sm"
              onClick={generateApplication}
              disabled={createRemediation.isPending}
              title="Transforma este plano num checklist de mudanças aplicáveis"
            >
              {createRemediation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wrench className="h-3.5 w-3.5" />
              )}
              Enviar para Aplicação
            </Button>
          )}
          {bp.status === "READY" && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPdf}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              PDF
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => regenerate.mutate(undefined)}
            disabled={regenerate.isPending || bp.status === "PENDING"}
          >
            {regenerate.isPending || bp.status === "PENDING" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Regerar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={remove}
            disabled={del.isPending}
            aria-label="Apagar blueprint"
            title="Apagar blueprint"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {bp.status === "FAILED" && (
        <Card>
          <CardContent className="flex items-start gap-3 pt-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-medium">Não deu para gerar o blueprint</p>
              <p className="text-sm text-muted-foreground">
                A IA configurada não respondeu corretamente. Isso costuma ser a
                chave de API ausente/expirada ou o modelo escolhido estar
                indisponível — confira em Configurações e clique em "Regerar"
                acima para tentar de novo.
              </p>
              {bp.error && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none hover:text-foreground">
                    Detalhe técnico
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-black/30 p-2 font-mono text-[11px]">
                    {bp.error}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {bp.status === "PENDING" && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
            <div>
              <p className="font-medium">Projetando o plano…</p>
              <p className="text-sm text-muted-foreground">
                A IA está desenhando arquitetura, estratégia de teste e riscos.
                Esta página atualiza sozinha quando terminar.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {r && bp.status === "READY" && (
        <>
          {/* Resumo — a primeira coisa que qualquer pessoa deve ler. */}
          {r.summary && (
            <Card>
              <CardContent className="pt-5">
                <p className="text-sm leading-relaxed">{r.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Objetivos — o que o projeto precisa entregar, em linguagem simples. */}
          <Section icon={Target} title="Objetivos">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Meta" value={r.objectives.goal} />
              <Field label="Escopo" value={r.objectives.scope} />
              <Field label="Fora de escopo" value={r.objectives.outOfScope} />
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Critérios de sucesso
                </p>
                <ul className="space-y-1">
                  {r.objectives.successCriteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {r.personas.length > 0 && (
              <div className="mt-4">
                <ChipRow label="Personas" items={r.personas} />
              </div>
            )}
          </Section>

          {/* Cronograma — quando cada parte fica pronta (Gantt + lista, uma coisa só). */}
          {r.milestones.length > 0 && (
            <Section title="Cronograma">
              <GanttChart milestones={r.milestones} />
              <div className="mt-5 space-y-3">
                {r.milestones.map((m, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {i + 1}
                      </div>
                      {i < r.milestones.length - 1 && (
                        <div className="w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 break-words font-medium">
                          {m.name}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          ~{m.durationWeeks} sem
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {m.deliverables.join(" · ")}
                      </p>
                      {m.qaFocus && (
                        <p className="mt-1 text-xs text-emerald-400/90">
                          QA: {m.qaFocus}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <ProjectionSection
            blueprintId={id}
            hasMilestones={r.milestones.length > 0}
            hasProject={!!bp.projectId}
          />

          {/* Stack — as tecnologias escolhidas e por quê. */}
          {r.techStack.length > 0 && (
            <Section title="Stack recomendada">
              <div className="grid gap-3 sm:grid-cols-2">
                {r.techStack.map((t, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t.category}
                      </span>
                    </div>
                    <p className="font-medium">{t.choice}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.rationale}
                    </p>
                    {t.alternatives.length > 0 && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Alternativas: {t.alternatives.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Diagramas */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Section icon={GitBranch} title="Arquitetura">
              <MermaidDiagram code={r.architectureMermaid} />
            </Section>
            <Section icon={Workflow} title="Fluxo do usuário">
              <MermaidDiagram code={r.userFlowMermaid} />
            </Section>
          </div>

          {/* Risco — o que pode dar errado e o que fazer a respeito. */}
          {r.riskMatrix.length > 0 && (
            <Section icon={AlertTriangle} title="Matriz de risco">
              <div className="grid gap-6 md:grid-cols-[260px_1fr]">
                <RiskMatrix risks={r.riskMatrix} />
                <div className="space-y-2">
                  {r.riskMatrix.map((risk, i) => (
                    <div
                      key={i}
                      className="rounded-md border border-border p-2.5 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="min-w-0 break-words font-medium">
                          {risk.risk}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          P{risk.likelihood}×I{risk.impact}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {risk.mitigation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* A partir daqui, o conteúdo é voltado a quem vai construir/testar
              de verdade — mais técnico de propósito. */}
          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Detalhes técnicos de QA
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Radar + Pirâmide lado a lado */}
          <div className="grid gap-4 md:grid-cols-2">
            <Section icon={ShieldCheck} title="Maturidade de QA">
              <QaRadar data={r.qaMaturityRadar} />
            </Section>
            <Section icon={Workflow} title="Pirâmide de testes">
              <TestPyramid pyramid={r.testStrategy.pyramid} />
              <div className="mt-4 space-y-2 text-xs">
                <ChipRow label="Abordagens" items={r.testStrategy.approaches} />
                <ChipRow label="Ferramentas" items={r.testStrategy.tooling} />
                <ChipRow
                  label="Ambientes"
                  items={r.testStrategy.environments}
                />
              </div>
            </Section>
          </div>

          {/* Casos de teste */}
          {r.testCases.length > 0 && (
            <Section title="Casos de teste (Gherkin)">
              <div className="space-y-2">
                {r.testCases.map((tc) => (
                  <div
                    key={tc.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {tc.id}
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                          PRIORITY_COLOR[tc.priority] ?? PRIORITY_COLOR.P2,
                        )}
                      >
                        {tc.priority}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {tc.type}
                      </span>
                      <span className="min-w-0 break-words text-sm font-medium">
                        {tc.title}
                      </span>
                    </div>
                    <div className="mt-2 space-y-0.5 text-xs">
                      <p>
                        <b className="text-primary">Dado</b> {tc.given}
                      </p>
                      <p>
                        <b className="text-primary">Quando</b> {tc.when}
                      </p>
                      <p>
                        <b className="text-primary">Então</b> {tc.then}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Quality gates */}
          {r.qualityGates.length > 0 && (
            <Section icon={ShieldCheck} title="Quality gates">
              <div className="grid gap-3 sm:grid-cols-2">
                {r.qualityGates.map((g, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="min-w-0 break-words font-medium">
                        {g.stage}
                      </span>
                      <span className="break-all rounded bg-primary/15 px-2 py-0.5 text-[11px] text-primary">
                        {g.metric}: {g.threshold}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-0.5">
                      {g.criteria.map((c, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-1.5 text-xs text-muted-foreground"
                        >
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* NFRs + métricas */}
          <div className="grid gap-4 md:grid-cols-2">
            {r.nfrs.length > 0 && (
              <Section title="Requisitos não-funcionais">
                <div className="space-y-2">
                  {r.nfrs.map((n, i) => (
                    <div key={i} className="text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs uppercase text-muted-foreground">
                          {n.category}
                        </span>
                        <span className="text-xs font-medium text-primary">
                          {n.target}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{n.requirement}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {r.metrics.length > 0 && (
              <Section title="Métricas de qualidade">
                <div className="space-y-2">
                  {r.metrics.map((m, i) => (
                    <div key={i} className="text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0 break-words font-medium">
                          {m.name}
                        </span>
                        <span className="text-xs font-medium text-primary">
                          {m.target}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{m.why}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- helpers de UI ----------

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: typeof Target;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </h2>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}:</span>
      {items.map((it, i) => (
        <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {it}
        </span>
      ))}
    </div>
  );
}
