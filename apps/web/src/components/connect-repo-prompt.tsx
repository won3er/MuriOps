"use client";

import { GitBranch, Github, Link2 } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useAdapterConnections } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * Card "Conecte um repositório" — estilo Strix (escolha entre GitHub e
 * GitLab, sem enrolação), reutilizado em toda tela cujo próximo passo
 * depende de um repositório conectado (Análises, Atualizar, Fluxos
 * Críticos). Antes de existir, telas como Atualizar deixavam o usuário
 * clicar num botão condenado a falhar e mostravam um erro cru — este
 * componente substitui isso por um direcionamento direto pra conectar.
 */
export function ConnectRepoPrompt({
  projectId,
  title = "Conecte um repositório para continuar",
  description = "Esta etapa depende de um repositório GitHub ou GitLab conectado ao projeto.",
}: {
  projectId: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border p-6 text-center sm:items-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted">
        <Link2 className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="sm:text-center">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/aplicacao?projectId=${projectId}&view=connections`}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          <Github className="h-3.5 w-3.5" /> Conectar GitHub
        </Link>
        <Link
          href={`/aplicacao?projectId=${projectId}&view=connections`}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          <GitBranch className="h-3.5 w-3.5" /> Conectar GitLab
        </Link>
      </div>
    </div>
  );
}

/** Hook fino sobre useAdapterConnections — evita repetir o `.some(...)` de
 * "tem GitHub ou GitLab" em cada tela que precisa gatear nisso. */
export function useHasRepoConnection(projectId: string) {
  const {
    data: connections = [],
    isLoading,
    isError,
  } = useAdapterConnections(projectId);
  const hasRepoConnection = connections.some(
    (c) => c.kind === "GITHUB" || c.kind === "GITLAB",
  );
  return { hasRepoConnection, isLoading, isError };
}
