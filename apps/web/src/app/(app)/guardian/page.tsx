"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ActionError } from "@/components/action-error";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useCreateGuardianRuleset,
  useCreateGuardianRun,
  useDeleteGuardianRuleset,
  useDeleteGuardianRun,
  useGuardianDashboard,
  useGuardianRulesets,
  useGuardianRuns,
  useProjects,
} from "@/lib/queries";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Analisando…",
  READY: "Concluída",
  FAILED: "Falhou",
};

const OVERALL_BADGE: Record<string, string> = {
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  yellow: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  red: "border-red-500/30 bg-red-500/10 text-red-400",
};

const OVERALL_LABEL: Record<string, string> = {
  green: "Passou",
  yellow: "Precisa revisão",
  red: "Crítico",
};

export default function GuardianPage() {
  const { data: stats } = useGuardianDashboard();
  const { data: rulesets = [], refetch: refetchRulesets } = useGuardianRulesets();
  const { data: runs = [], isLoading, isError, refetch } = useGuardianRuns();
  const { data: projects = [] } = useProjects();
  const createRuleset = useCreateGuardianRuleset();
  const deleteRuleset = useDeleteGuardianRuleset();
  const createRun = useCreateGuardianRun();
  const deleteRun = useDeleteGuardianRun();

  const [rulesetName, setRulesetName] = useState("");
  const [rulesetRules, setRulesetRules] = useState("");
  const [showRulesetForm, setShowRulesetForm] = useState(false);

  const [runTitle, setRunTitle] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [rulesetId, setRulesetId] = useState("");
  const [documentText, setDocumentText] = useState("");

  function criarRuleset() {
    const rules = rulesetRules.split("\n").map((r) => r.trim()).filter(Boolean);
    if (!rulesetName.trim() || rules.length === 0) {
      toast.error("Informe um nome e ao menos uma regra (uma por linha)");
      return;
    }
    createRuleset.mutate(
      { name: rulesetName.trim(), rules },
      {
        onSuccess: () => {
          setRulesetName("");
          setRulesetRules("");
          setShowRulesetForm(false);
        },
      },
    );
  }

  function auditar() {
    if (!documentText.trim()) {
      toast.error("Cole o texto do documento a auditar");
      return;
    }
    createRun.mutate(
      {
        title: runTitle.trim() || undefined,
        sourceName: sourceName.trim() || undefined,
        projectId: projectId || undefined,
        rulesetId: rulesetId || undefined,
        documentText: documentText.trim(),
      },
      {
        onSuccess: () => {
          setRunTitle("");
          setSourceName("");
          setDocumentText("");
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <PageHeader
        eyebrow="Guardian"
        title="Auditoria operacional"
        description="Um auditor de qualidade trabalhando 24h: cole um documento (planilha exportada, contrato, formulário), defina as regras do seu negócio, e a IA aponta inconsistências e riscos antes que virem um problema — com correção sugerida."
      />

      {stats && stats.totalRuns > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Auditorias</p>
              <p className="mt-1 text-2xl font-semibold">{stats.totalRuns}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20">
            <CardContent className="py-4">
              <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Passaram
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-400">{stats.green}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20">
            <CardContent className="py-4">
              <p className="flex items-center gap-1.5 text-xs text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" /> Precisam revisão
              </p>
              <p className="mt-1 text-2xl font-semibold text-amber-400">{stats.yellow}</p>
            </CardContent>
          </Card>
          <Card className="border-red-500/20">
            <CardContent className="py-4">
              <p className="flex items-center gap-1.5 text-xs text-red-400">
                <ShieldAlert className="h-3.5 w-3.5" /> Críticas
              </p>
              <p className="mt-1 text-2xl font-semibold text-red-400">{stats.red}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Regras de negócio</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Opcional — sem regras, a IA ainda audita usando julgamento geral de auditor (números que não fecham, datas erradas, campos vazios...).
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowRulesetForm((s) => !s)}>
              <Plus className="h-3.5 w-3.5" /> Novo conjunto
            </Button>
          </div>

          {showRulesetForm && (
            <div className="space-y-2 rounded-md border bg-background/40 p-3">
              <Input
                placeholder="Nome (ex.: Regras de Estoque)"
                value={rulesetName}
                onChange={(e) => setRulesetName(e.target.value)}
              />
              <textarea
                value={rulesetRules}
                onChange={(e) => setRulesetRules(e.target.value)}
                placeholder={"Uma regra por linha, ex.:\nEstoque nunca pode ficar negativo\nDesconto acima de 20% precisa de aprovação"}
                rows={4}
                className="w-full rounded-md border border-input bg-background/60 p-3 text-sm"
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={criarRuleset} disabled={createRuleset.isPending}>
                  {createRuleset.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Salvar conjunto de regras"
                  )}
                </Button>
              </div>
            </div>
          )}

          {rulesets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {rulesets.map((rs) => (
                <span
                  key={rs.id}
                  className="flex items-center gap-2 rounded-full border bg-background/50 px-3 py-1 text-xs"
                >
                  {rs.name} · {rs.ruleCount} regra(s)
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Apagar o conjunto "${rs.name}"?`)) {
                        deleteRuleset.mutate(rs.id, { onSuccess: () => void refetchRulesets() });
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Apagar ${rs.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border bg-background/60 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Nova auditoria</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cole o conteúdo do documento (exporte a planilha como CSV/texto, ou cole o texto do contrato/formulário).
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              placeholder="Título (opcional)"
              value={runTitle}
              onChange={(e) => setRunTitle(e.target.value)}
            />
            <Input
              placeholder="Nome do documento (ex.: estoque_julho.csv)"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
            />
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
            >
              <option value="">Sem vínculo com projeto…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {rulesets.length > 0 && (
            <select
              value={rulesetId}
              onChange={(e) => setRulesetId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm sm:w-auto"
            >
              <option value="">Sem conjunto de regras específico…</option>
              {rulesets.map((rs) => (
                <option key={rs.id} value={rs.id}>
                  {rs.name} ({rs.ruleCount} regra(s))
                </option>
              ))}
            </select>
          )}

          <textarea
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="Cole aqui o texto do documento…"
            rows={8}
            className="w-full rounded-md border border-input bg-background/60 p-3 font-mono text-xs"
          />

          <div className="flex justify-end">
            <Button onClick={auditar} disabled={!documentText.trim() || createRun.isPending}>
              {createRun.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Auditar documento
            </Button>
          </div>
          <ActionError
            error={createRun.error}
            message="Não foi possível iniciar a auditoria. Confira se há uma chave de IA configurada em Configurações."
          />
        </CardContent>
      </Card>

      {isError ? (
        <QueryErrorState title="Não foi possível carregar as auditorias" onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border bg-card px-5 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-lg border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          Nenhuma auditoria ainda. Cole um documento acima pra começar.
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <Card key={run.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <Link href={`/guardian/${run.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium hover:underline">{run.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {STATUS_LABEL[run.status] ?? run.status} · {run.findingCount} achado(s)
                    {run.criticalCount > 0 && `, ${run.criticalCount} crítico(s)`}
                  </p>
                </Link>
                {run.overallStatus && (
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${OVERALL_BADGE[run.overallStatus]}`}
                  >
                    {OVERALL_LABEL[run.overallStatus]}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Apagar auditoria"
                  onClick={() => {
                    if (confirm(`Apagar a auditoria "${run.title}"?`)) {
                      deleteRun.mutate(run.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
