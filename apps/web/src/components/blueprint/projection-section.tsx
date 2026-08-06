"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Github,
  ListTodo,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCreateProjectionIssue,
  useCreateProjectionTask,
  useDeleteProjectionTask,
  useGenerateProjectionTasks,
  useProjectionTasks,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Issue aberta",
  DONE: "Concluída",
  FAILED: "Falhou",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "border-border bg-muted/40 text-muted-foreground",
  IN_PROGRESS: "border-primary/30 bg-primary/10 text-primary",
  DONE: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  FAILED: "border-red-500/40 bg-red-500/15 text-red-300",
};

/**
 * Projeção — terceira função de Projetar: decompõe o roadmap (cronograma /
 * milestones) do blueprint em tarefas rastreáveis, cada uma virando uma
 * Issue no GitHub conectado do projeto (via Aplicação → Conexões). O status
 * sincroniza sozinho por polling no backend — quando a Issue fecha no
 * GitHub, a tarefa vira "Concluída" aqui sem precisar de ação manual.
 */
export function ProjectionSection({
  blueprintId,
  hasMilestones,
  hasProject,
}: {
  blueprintId: string;
  hasMilestones: boolean;
  hasProject: boolean;
}) {
  const { data: tasks = [], isLoading } = useProjectionTasks(blueprintId);
  const generate = useGenerateProjectionTasks(blueprintId);
  const createIssue = useCreateProjectionIssue(blueprintId);
  const del = useDeleteProjectionTask(blueprintId);
  const createTask = useCreateProjectionTask(blueprintId);
  const [manualTitle, setManualTitle] = useState("");

  if (!hasProject) return null;

  function addManualTask() {
    if (!manualTitle.trim()) return;
    createTask.mutate(
      { title: manualTitle.trim(), description: "" },
      { onSuccess: () => setManualTitle("") },
    );
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ListTodo className="h-4 w-4 text-primary" />
            Projeção — tarefas rastreáveis
          </h2>
          {hasMilestones && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generate.mutate(true)}
              disabled={generate.isPending}
              title="Cria uma tarefa por marco do cronograma e já abre a issue no GitHub"
            >
              {generate.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Gerar do cronograma
            </Button>
          )}
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Cada tarefa vira uma Issue no repositório GitHub conectado deste
          projeto (em Aplicação → Conexões). Quando a Issue fecha no GitHub,
          a tarefa aqui vira “Concluída” sozinha — sem precisar marcar nada
          manualmente.
        </p>

        {isLoading ? (
          <div className="grid place-items-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhuma tarefa ainda.{" "}
            {hasMilestones
              ? "Gere a partir do cronograma acima ou adicione manualmente."
              : "Adicione manualmente abaixo."}
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "font-medium",
                        t.status === "DONE" && "text-muted-foreground line-through",
                      )}
                    >
                      {t.title}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px]",
                        STATUS_CLASS[t.status],
                      )}
                    >
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </div>
                  {t.description && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {t.description}
                    </p>
                  )}
                  {t.status === "FAILED" && t.error && (
                    <p className="mt-1 flex items-start gap-1 text-xs text-red-300">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      {t.error}
                    </p>
                  )}
                  {t.githubIssueUrl && (
                    <a
                      href={t.githubIssueUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Github className="h-3 w-3" /> Ver issue #{t.githubIssueNumber}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {(t.status === "PENDING" || t.status === "FAILED") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createIssue.mutate(t.id)}
                      disabled={createIssue.isPending}
                    >
                      {t.status === "FAILED" ? "Tentar de novo" : "Criar issue"}
                    </Button>
                  )}
                  {t.status === "DONE" && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                  <button
                    type="button"
                    onClick={() => del.mutate(t.id)}
                    disabled={del.isPending}
                    aria-label="Apagar tarefa"
                    title="Apagar tarefa"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex gap-2">
          <input
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addManualTask()}
            placeholder="Adicionar tarefa manual…"
            className="h-9 flex-1 rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addManualTask}
            disabled={createTask.isPending || !manualTitle.trim()}
          >
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
