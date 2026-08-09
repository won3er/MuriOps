"use client";

import { useEffect, useState } from "react";
import { GitBranch, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConnectionQueryState } from "@/components/connection-query-state";
import { ActionError } from "@/components/action-error";
import { useConnectGitlab, useGitlabConnection } from "@/lib/queries";

/**
 * Painel "Conectar GitLab" — mesmo padrão push do GitHub (token PAT colado),
 * mas via Merge Request em vez de Pull Request. Ver GitlabAdapter no backend.
 */
export function GitlabConnectionPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useGitlabConnection(projectId);
  const connect = useConnectGitlab(projectId);
  const [projectPath, setProjectPath] = useState("");
  const [token, setToken] = useState("");
  const [editing, setEditing] = useState(false);

  const connection = data && "id" in data ? data : null;

  useEffect(() => {
    if (!connection) return;
    const config = connection.config as { projectPath?: string } | null;
    setProjectPath(config?.projectPath ?? "");
  }, [connection]);

  function submit() {
    if (!projectPath.trim() || token.trim().length < 10) return;
    connect.mutate(
      { projectPath: projectPath.trim(), token: token.trim() },
      {
        onSuccess: () => {
          setToken("");
          setEditing(false);
        },
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Conectar GitLab</span>
          </div>
          {connection && (
            <Badge className="border-border bg-muted text-muted-foreground">
              {(connection.config as { projectPath?: string } | null)?.projectPath}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          O MuriOps abre um Merge Request para cada item de remediação — nunca
          aplica código nem faz merge sozinho. A revisão e o merge são sempre
          seus.
        </p>

        {isLoading ? (
          <ConnectionQueryState state="loading" />
        ) : isError ? (
          <ConnectionQueryState state="error" />
        ) : connection && !editing ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                Configuração salva · token{" "}
                <span className="font-mono">{connection.maskedToken}</span>
              </p>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Atualizar conexão
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use esta opção se o repositório mudou, o token expirou ou o
              GitLab devolveu erro de acesso.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              aria-label="Caminho do projeto no GitLab"
              placeholder="namespace/repositório"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
            />
            <Input
              aria-label="Token de acesso pessoal do GitLab"
              placeholder={connection ? "novo token (PAT)" : "token (PAT)"}
              type="password"
              autoComplete="new-password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button
              size="sm"
              className="sm:col-span-2"
              disabled={
                connect.isPending ||
                !projectPath.trim() ||
                token.trim().length < 10
              }
              onClick={submit}
            >
              {connect.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <GitBranch className="h-3.5 w-3.5" />
              )}
              {connect.isPending ? "Conectando…" : "Conectar"}
            </Button>
            {connection && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="sm:col-span-2"
                onClick={() => {
                  setEditing(false);
                  setToken("");
                }}
              >
                Cancelar
              </Button>
            )}
            {connect.error && (
              <div className="sm:col-span-2">
                <ActionError
                  error={connect.error}
                  message="Não foi possível conectar o repositório. Confira o caminho do projeto e o token."
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
