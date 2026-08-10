"use client";

import {
  GitBranch,
  Github,
  Link2,
  Loader2,
  Play,
  ShieldAlert,
  Swords,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { QueryErrorState } from "@/components/query-error-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAdapterConnections, useProjects } from "@/lib/queries";
import { cn } from "@/lib/utils";

export default function AnalysesHubPage() {
  return (
    <Suspense
      fallback={
        <div
          className="grid place-items-center py-24 text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="mt-3 text-sm">Preparando análises…</span>
        </div>
      }
    >
      <AnalysesHub />
    </Suspense>
  );
}

function AnalysesHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data: projects = [],
    isError: projectsError,
    refetch: refetchProjects,
  } = useProjects();
  const [projectId, setProjectId] = useState("");
  const [selectedType, setSelectedType] = useState<
    "qa" | "security" | "active" | "source" | null
  >(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const requestedProject = searchParams.get("projectId");
    if (requestedProject) setProjectId(requestedProject);
  }, [searchParams]);

  const selectedProject = projects.find((p) => p.id === projectId);
  const {
    data: connections = [],
    isLoading: connectionsLoading,
    isError: connectionsError,
  } = useAdapterConnections(projectId);
  const hasRepoConnection = connections.some(
    (c) => c.kind === "GITHUB" || c.kind === "GITLAB",
  );

  // Trocar de projeto pode invalidar o tipo escolhido (ex.: Teste Ativo
  // exige consentimento por projeto) — mais seguro pedir pra escolher de novo.
  function changeProject(newProjectId: string) {
    setProjectId(newProjectId);
    setSelectedType(null);
  }

  async function startSelected() {
    if (!projectId || !selectedType || !hasRepoConnection) return;
    setStarting(true);
    try {
      const categories =
        selectedType === "security"
          ? ["DEEP_SECURITY"]
          : selectedType === "active"
            ? ["ACTIVE_SECURITY_TEST"]
            : selectedType === "source"
              ? ["SOURCE_SECURITY_SCAN"]
              : undefined;
      const analysis = await api.startAnalysis(
        projectId,
        categories ? { categories } : {},
      );
      router.push(`/analyses/${analysis.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a análise.",
      );
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow="Ciclo de qualidade"
        title="Análises"
        description="Execute verificações, acompanhe o processamento e compare a evolução dos projetos."
      />

      <section className="rounded-md border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-3.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Nova análise
          </h2>
        </div>
        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-2 sm:max-w-sm">
            <label
              htmlFor="analysis-project"
              className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              Projeto
            </label>
            <select
              id="analysis-project"
              value={projectId}
              onChange={(event) => changeProject(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione um projeto…</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {projectsError ? (
              <QueryErrorState
                compact
                title="Projetos indisponíveis"
                description="Não foi possível carregar as opções."
                onRetry={() => void refetchProjects()}
              />
            ) : (
              projects.length === 0 && (
                <Link
                  href="/projects"
                  className="inline-flex text-xs text-primary hover:underline"
                >
                  Cadastre um projeto primeiro
                </Link>
              )
            )}
          </div>
          <div>
            {projectId && !connectionsLoading && !connectionsError && !hasRepoConnection ? (
              <div className="flex flex-col items-start gap-3 rounded-md border p-6 text-center sm:items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="sm:text-center">
                  <p className="text-sm font-semibold">
                    Conecte um repositório para continuar
                  </p>
                  <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                    Nenhuma análise roda sem o projeto ter GitHub ou GitLab
                    conectado — inclusive a Análise QA padrão. Isso garante que
                    todo achado tenha um repositório real por trás para
                    aplicar a correção.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/aplicacao?projectId=${projectId}`}
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                  >
                    <Github className="h-3.5 w-3.5" /> Conectar GitHub
                  </Link>
                  <Link
                    href={`/aplicacao?projectId=${projectId}`}
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                  >
                    <GitBranch className="h-3.5 w-3.5" /> Conectar GitLab
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={() => setSelectedType("qa")}
                disabled={!projectId}
                aria-pressed={selectedType === "qa"}
                className={cn(
                  "group relative flex flex-col gap-2.5 rounded-md border p-4 text-left transition-colors hover:border-foreground/30 disabled:pointer-events-none disabled:opacity-40",
                  selectedType === "qa"
                    ? "border-primary bg-primary/[0.04]"
                    : "border-border",
                )}
              >
                <div className="flex items-center justify-between">
                  <Play className="h-4 w-4 text-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">QA</span>
                </div>
                <span>
                  <strong className="block text-sm font-medium">
                    Análise QA padrão
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    UI/UX, performance, SEO, acessibilidade, console e rede.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("security")}
                disabled={!projectId}
                aria-pressed={selectedType === "security"}
                className={cn(
                  "group relative flex flex-col gap-2.5 rounded-md border p-4 text-left transition-colors hover:border-foreground/30 disabled:pointer-events-none disabled:opacity-40",
                  selectedType === "security"
                    ? "border-amber-400 bg-amber-500/[0.04]"
                    : "border-border",
                )}
              >
                <div className="flex items-center justify-between">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">SEC</span>
                </div>
                <span>
                  <strong className="block text-sm font-medium">
                    Análise de Segurança
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    TLS, DNS, headers, políticas e exposições indevidas.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("active")}
                disabled={!projectId || !selectedProject?.activeTestingConsent}
                aria-pressed={selectedType === "active"}
                title={
                  projectId && !selectedProject?.activeTestingConsent
                    ? "Habilite o consentimento na página do projeto primeiro"
                    : undefined
                }
                className={cn(
                  "group relative flex flex-col gap-2.5 rounded-md border p-4 text-left transition-colors hover:border-foreground/30 disabled:pointer-events-none disabled:opacity-40",
                  selectedType === "active"
                    ? "border-rose-400 bg-rose-500/[0.04]"
                    : "border-border",
                )}
              >
                <div className="flex items-center justify-between">
                  <Swords className="h-4 w-4 text-rose-400" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">PEN</span>
                </div>
                <span>
                  <strong className="block text-sm font-medium">
                    Teste Ativo Autorizado
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {projectId && !selectedProject?.activeTestingConsent
                      ? "Requer consentimento — habilite na página do projeto."
                      : "Rate-limit, enumeração de usuário e payloads de SQLi/XSS/SSRF/XXE."}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("source")}
                disabled={!projectId}
                aria-pressed={selectedType === "source"}
                className={cn(
                  "group relative flex flex-col gap-2.5 rounded-md border p-4 text-left transition-colors hover:border-foreground/30 disabled:pointer-events-none disabled:opacity-40",
                  selectedType === "source"
                    ? "border-sky-400 bg-sky-500/[0.04]"
                    : "border-border",
                )}
              >
                <div className="flex items-center justify-between">
                  <Github className="h-4 w-4 text-sky-400" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">SRC</span>
                </div>
                <span>
                  <strong className="block text-sm font-medium">
                    Segurança via GitHub/GitLab
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Segredos commitados, dependências com CVE, Dockerfile
                    inseguro e código inseguro.
                  </span>
                </span>
              </button>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={() => void startSelected()}
                disabled={
                  !projectId || !selectedType || starting || !hasRepoConnection
                }
              >
                {starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Iniciar análise
              </Button>
              {!selectedType && projectId && (
                <p className="text-xs text-muted-foreground">
                  Escolha um tipo de análise acima.
                </p>
              )}
            </div>
            {(selectedType === "qa" || selectedType === "security") && (
              <p className="mt-3 max-w-2xl text-xs leading-5 text-muted-foreground">
                Sites grandes ou muito pesados podem falhar com "Interrompida
                (API reiniciada)" — é um limite de memória do servidor
                gratuito usado hoje, não um erro do site. Se acontecer, rode a
                análise de novo; costuma completar numa segunda tentativa.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
