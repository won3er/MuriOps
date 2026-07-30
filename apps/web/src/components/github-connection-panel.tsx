"use client";

import { useEffect, useState } from "react";
import { ClipboardCopy, Github, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConnectionQueryState } from "@/components/connection-query-state";
import { ActionError } from "@/components/action-error";
import { useConnectGithub, useGithubConnection } from "@/lib/queries";

/**
 * Painel "Conectar GitHub" — primeiro adapter *push* (Fase 2). Diferente do
 * MCP/ponte manual (pull), aqui o MuriOps age direto: abre PR com o checklist
 * de remediação, nunca faz merge sozinho (a PR é o checkpoint de aprovação).
 */
export function GithubConnectionPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useGithubConnection(projectId);
  const connect = useConnectGithub(projectId);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [editing, setEditing] = useState(false);
  const [justConnected, setJustConnected] = useState<{
    webhookSecret: string;
    webhookUrl: string;
  } | null>(null);

  const connection = data && "webhookUrl" in data ? data : null;

  useEffect(() => {
    if (!connection) return;
    const config = connection.config as { owner?: string; repo?: string } | null;
    setOwner(config?.owner ?? "");
    setRepo(config?.repo ?? "");
  }, [connection]);

  function submit() {
    if (!owner.trim() || !repo.trim() || token.trim().length < 10) return;
    connect.mutate(
      { owner: owner.trim(), repo: repo.trim(), token: token.trim() },
      {
        onSuccess: (res) => {
          setJustConnected({
            webhookSecret: res.webhookSecret,
            webhookUrl: res.webhookUrl,
          });
          setToken("");
          setEditing(false);
        },
      },
    );
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado(a)`);
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Conectar GitHub</span>
          </div>
          {connection && (
            <Badge className="border-border bg-muted text-muted-foreground">
              {
                (connection.config as { owner?: string; repo?: string } | null)
                  ?.owner
              }
              /
              {
                (connection.config as { owner?: string; repo?: string } | null)
                  ?.repo
              }
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          O MuriOps abre uma PR para cada item de remediação — nunca
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
                Configuração salva · token <span className="font-mono">{connection.maskedToken}</span>
              </p>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Atualizar conexão
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use esta opção se o repositório mudou, o token expirou ou o GitHub devolveu erro de acesso.
            </p>
            {justConnected && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-medium">
                  Configure o webhook no GitHub (Settings → Webhooks → Add
                  webhook):
                </p>
                <div className="flex min-w-0 items-center gap-2 font-mono text-xs">
                  <span className="min-w-0 flex-1 break-all">
                    {justConnected.webhookUrl}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      copy(justConnected.webhookUrl, "URL do webhook")
                    }
                  >
                    <ClipboardCopy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs font-medium">
                  Secret (cole em "Secret" no GitHub):
                </p>
                <div className="flex min-w-0 items-center gap-2 font-mono text-xs">
                  <span className="min-w-0 flex-1 break-all">
                    {justConnected.webhookSecret}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copy(justConnected.webhookSecret, "Secret")}
                  >
                    <ClipboardCopy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Esse secret só aparece agora — se perder, gere a conexão de
                  novo. Evento a marcar: "Pull requests".
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              aria-label="Proprietário do repositório"
              placeholder="proprietário do repositório"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
            <Input
              aria-label="Nome do repositório"
              placeholder="repositório"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            />
            <Input
              aria-label="Token pessoal do GitHub"
              placeholder={connection ? "novo token (PAT)" : "token (PAT)"}
              type="password"
              autoComplete="new-password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button
              size="sm"
              className="sm:col-span-3"
              disabled={
                connect.isPending ||
                !owner.trim() ||
                !repo.trim() ||
                token.trim().length < 10
              }
              onClick={submit}
            >
              {connect.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Github className="h-3.5 w-3.5" />
              )}
              {connect.isPending ? "Conectando…" : "Conectar"}
            </Button>
            {connection && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="sm:col-span-3"
                onClick={() => {
                  setEditing(false);
                  setToken("");
                }}
              >
                Cancelar
              </Button>
            )}
            {connect.error && (
              <div className="sm:col-span-3">
                <ActionError
                  error={connect.error}
                  message="Não foi possível conectar o repositório. Confira proprietário, nome e token."
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
