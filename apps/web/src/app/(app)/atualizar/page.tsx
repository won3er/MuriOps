"use client";

import {
  ArrowRight,
  ArrowUpCircle,
  FileCode2,
  Github,
  Loader2,
  SearchCode,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCreateUpgradePlan,
  useCreateUpgradePlanFromGithub,
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
  const createFromGithub = useCreateUpgradePlanFromGithub();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState("");
  const [manifest, setManifest] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  function gerar() {
    if (!manifest.trim()) {
      toast.error("Cole ou envie um manifesto de dependências primeiro");
      return;
    }
    createPlan.mutate(
      {
        // Alias retrocompatível enquanto o pacote compartilhado publicado no
        // workspace ainda não expõe `manifest` no build consumido pelo web.
        packageJson: manifest,
        projectId: projectId || undefined,
      },
      { onSuccess: (plan) => router.push(`/atualizar/${plan.id}`) },
    );
  }

  function investigarGithub() {
    if (!projectId) {
      toast.error("Selecione um projeto conectado ao GitHub");
      return;
    }
    createFromGithub.mutate(projectId, {
      onSuccess: (plan) => router.push(`/atualizar/${plan.id}`),
    });
  }

  function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    file
      .text()
      .then(setManifest)
      .catch(() => toast.error("Falha ao ler o arquivo"));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow="Ciclo de qualidade"
        title="Atualizar"
        description="Investigue dependências, riscos e breaking changes antes de iniciar uma migração."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <Card>
          <CardContent className="space-y-5 py-6">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg border bg-background/60 text-primary">
                <FileCode2 className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">
                  Enviar manifesto de dependências
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Node.js, Python, Ruby, Java, Go, .NET, PHP ou Rust.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label
                  htmlFor="atualizar-projeto"
                  className="mb-1.5 block text-xs text-muted-foreground"
                >
                  Projeto (opcional para envio manual)
                </label>
                <select
                  id="atualizar-projeto"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
                >
                  <option value="">Sem vínculo com projeto…</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
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
                className="hidden"
                onChange={onFileSelected}
              />
            </div>

            {projectsError && (
              <QueryErrorState
                compact
                title="Projetos indisponíveis"
                description="O plano manual ainda pode ser criado sem vínculo."
                onRetry={() => void refetchProjects()}
              />
            )}

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label
                  htmlFor="atualizar-manifesto"
                  className="text-xs text-muted-foreground"
                >
                  Conteúdo do manifesto
                </label>
                {fileName && (
                  <span className="truncate font-mono text-[10px] text-primary">
                    {fileName}
                  </span>
                )}
              </div>
              <textarea
                id="atualizar-manifesto"
                value={manifest}
                onChange={(event) => setManifest(event.target.value)}
                placeholder="Cole package.json, requirements.txt, pyproject.toml, pom.xml, go.mod…"
                rows={10}
                className="tabular w-full rounded-md border border-input bg-background/60 p-3 font-mono text-xs"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={gerar}
                disabled={!manifest.trim() || createPlan.isPending}
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

        <Card className="border-primary/20 bg-primary/[0.035]">
          <CardContent className="flex h-full flex-col py-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Github className="h-5 w-5" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">
              Investigar pelo GitHub
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              O MuriOps percorre o repositório conectado, encontra os manifestos
              relevantes e monta um único plano, inclusive em monorepos.
            </p>
            <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
              <li>✓ Somente leitura do repositório</li>
              <li>✓ Detecta múltiplos ecossistemas</li>
              <li>✓ Prioriza manifestos da aplicação</li>
            </ul>
            <Button
              className="mt-auto"
              onClick={investigarGithub}
              disabled={!projectId || createFromGithub.isPending}
            >
              {createFromGithub.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SearchCode className="h-4 w-4" />
              )}
              Investigar atualizações
            </Button>
            {!projectId && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Selecione um projeto no formulário ao lado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <section>
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
              Nenhuma atualização ainda. Envie um manifesto ou investigue um
              repositório conectado ao GitHub.
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-card/85">
            {plans.map((plan) => (
              <Link key={plan.id} href={`/atualizar/${plan.id}`}>
                <div className="group flex flex-col gap-3 px-4 py-3.5 hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between">
                  <FileCode2 className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
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
      </section>
    </div>
  );
}
