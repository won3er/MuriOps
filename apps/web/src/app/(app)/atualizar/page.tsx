"use client";

import {
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
import { ActionError } from "@/components/action-error";
import { QueryErrorState } from "@/components/query-error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCreateUpgradePlan,
  useCreateUpgradePlanFromGithub,
  useProjects,
} from "@/lib/queries";

export default function AtualizarPage() {
  const router = useRouter();
  const {
    data: projects = [],
    isError: projectsError,
    refetch: refetchProjects,
  } = useProjects();
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
        description="Investigue tecnologias, dependências, riscos e mudanças incompatíveis antes de atualizar sistemas atuais ou legados."
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
                  Node.js, Python, Ruby, Java, Go, .NET, PHP ou Rust — incluindo arquivos legados como .csproj, packages.config, pom.xml e Gradle.
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
              Investigar atualizações de tecnologias
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              O MuriOps percorre o repositório conectado, encontra os manifestos
              relevantes e monta um único plano, inclusive em monorepos e sistemas legados suportados.
            </p>
            <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
              <li>✓ Somente leitura do repositório</li>
              <li>✓ Detecta múltiplos ecossistemas e manifests legados</li>
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
              Investigar tecnologias
            </Button>
            <Link
              href={
                projectId
                  ? `/aplicacao?projectId=${projectId}&view=connections`
                  : "/aplicacao?view=connections"
              }
              target="_blank"
              rel="noreferrer"
              className="mt-3 text-center text-xs font-medium text-primary hover:underline"
            >
              Configurar ou atualizar conexão GitHub
            </Link>
            <p className="mt-1 text-center text-[11px] leading-4 text-muted-foreground">
              As conexões GitHub e MCP ficam em Aplicações → selecione o projeto → Conexões e integrações.
            </p>
            {createFromGithub.error && (
              <div className="mt-3">
                <ActionError
                  error={createFromGithub.error}
                  message="Não foi possível investigar pelo GitHub. Abra a conexão do projeto, valide owner/repo e substitua o token se necessário."
                />
              </div>
            )}
            {!projectId && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Selecione um projeto no formulário ao lado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
