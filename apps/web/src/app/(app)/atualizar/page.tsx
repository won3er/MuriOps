"use client";

import {
  ArrowRight,
  ArrowUpCircle,
  FileJson2,
  Loader2,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCreateUpgradePlan,
  useProjects,
  useUpgradePlans,
} from "@/lib/queries";
import { timeAgo } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Gerando…",
  READY: "Pronta",
  FAILED: "Falhou",
};
const STATUS_CLASS: Record<string, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  READY: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  FAILED: "border-red-500/40 bg-red-500/15 text-red-300",
};
const RISK_LABEL: Record<string, string> = {
  low: "Risco baixo",
  medium: "Risco médio",
  high: "Risco alto",
  critical: "Risco crítico",
};
const RISK_CLASS: Record<string, string> = {
  low: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  medium: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  high: "border-orange-500/40 bg-orange-500/15 text-orange-300",
  critical: "border-red-500/40 bg-red-500/15 text-red-300",
};

export default function AtualizarPage() {
  const router = useRouter();
  const {
    data: projects = [],
    isError: projectsError,
    refetch: refetchProjects,
  } = useProjects();
  const { data: plans = [], isLoading, isError, refetch } = useUpgradePlans();
  const createPlan = useCreateUpgradePlan();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projectId, setProjectId] = useState("");
  const [packageJson, setPackageJson] = useState("");

  function gerar() {
    if (!packageJson.trim()) {
      toast.error("Cole ou envie o conteúdo do package.json primeiro");
      return;
    }
    createPlan.mutate(
      { packageJson, projectId: projectId || undefined },
      { onSuccess: (plan) => router.push(`/atualizar/${plan.id}`) },
    );
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name !== "package.json" && !file.name.endsWith(".json")) {
      toast.error("Envie um arquivo package.json");
      return;
    }
    file
      .text()
      .then(setPackageJson)
      .catch(() => toast.error("Falha ao ler o arquivo"));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow="Ciclo de qualidade"
        title="Atualizar"
        description="Avalie dependências, riscos e breaking changes antes de iniciar uma migração."
      />

      {/* Gerar plano de atualização */}
      <Card>
        <CardContent className="space-y-5 py-6">
          <div>
            <h2 className="text-sm font-semibold">Analisar um package.json</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Cole o conteúdo ou selecione o arquivo; vincular a um projeto é
              opcional.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label
                htmlFor="atualizar-projeto"
                className="mb-1.5 block text-xs text-muted-foreground"
              >
                Projeto (opcional)
              </label>
              <select
                id="atualizar-projeto"
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
              {projectsError && (
                <div className="mt-3">
                  <QueryErrorState
                    compact
                    title="Projetos indisponíveis"
                    description="O plano ainda pode ser criado sem vínculo."
                    onRetry={() => void refetchProjects()}
                  />
                </div>
              )}
            </div>
            <Button
              variant="outline"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="h-4 w-4" /> Enviar arquivo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={onFileSelected}
            />
          </div>

          <div>
            <label
              htmlFor="atualizar-package-json"
              className="mb-1.5 block text-xs text-muted-foreground"
            >
              Conteúdo do package.json
            </label>
            <textarea
              id="atualizar-package-json"
              value={packageJson}
              onChange={(e) => setPackageJson(e.target.value)}
              placeholder='{"name": "meu-projeto", "dependencies": { ... } }'
              rows={10}
              className="tabular w-full rounded-md border border-input bg-background/60 p-3 font-mono text-xs"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={gerar}
              disabled={!packageJson.trim() || createPlan.isPending}
            >
              {createPlan.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpCircle className="h-4 w-4" />
              )}
              Gerar plano de atualização
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de atualizações */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-semibold">Histórico de atualizações</h2>
          <p className="text-xs text-muted-foreground">
            {plans.length} plano(s) registrado(s)
          </p>
        </div>
        {isLoading ? (
          <div className="grid place-items-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <QueryErrorState
            title="Não foi possível carregar as atualizações"
            onRetry={() => void refetch()}
          />
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhuma Atualização ainda. Cole ou envie um package.json acima
              para começar.
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y overflow-hidden rounded-lg border bg-card">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/atualizar/${plan.id}`}
                className="block"
              >
                <div className="group flex flex-col gap-3 px-4 py-3.5 hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between">
                  <FileJson2 className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="truncate font-medium">{plan.title}</span>
                    <Badge className={STATUS_CLASS[plan.status]}>
                      {STATUS_LABEL[plan.status] ?? plan.status}
                    </Badge>
                    {plan.overallRisk && (
                      <Badge className={RISK_CLASS[plan.overallRisk]}>
                        {RISK_LABEL[plan.overallRisk] ?? plan.overallRisk}
                      </Badge>
                    )}
                    {plan.status === "READY" && plan.itemCount > 0 && (
                      <span className="tabular text-xs text-muted-foreground">
                        {plan.doneCount}/{plan.itemCount} atualizado(s)
                      </span>
                    )}
                  </div>
                  <span className="tabular text-xs text-muted-foreground">
                    {timeAgo(plan.createdAt)}
                  </span>
                  <ArrowRight className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
