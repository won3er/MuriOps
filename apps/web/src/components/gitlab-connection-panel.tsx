"use client";

import { useEffect, useState } from "react";
import { ClipboardCopy, GitBranch, Loader2, Pause, Pencil, Play } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConnectionQueryState } from "@/components/connection-query-state";
import { ActionError } from "@/components/action-error";
import { useConnectGitlab, useGitlabConnection, useSetPrReviewsEnabled } from "@/lib/queries";

/**
 * Painel "Conectar GitLab" — mesmo padrão push do GitHub (token PAT colado),
 * mas via Merge Request em vez de Pull Request. Ver GitlabAdapter no backend.
 */
export function GitlabConnectionPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useGitlabConnection(projectId);
  const connect = useConnectGitlab(projectId);
  const setPrReviewsEnabled = useSetPrReviewsEnabled(projectId);
  const [projectPath, setProjectPath] = useState("");
  const [token, setToken] = useState("");
  const [editing, setEditing] = useState(false);
  const [justConnected, setJustConnected] = useState<{
    webhookSecret: string;
    webhookUrl: string;
  } | null>(null);

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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={setPrReviewsEnabled.isPending}
                  onClick={() =>
                    setPrReviewsEnabled.mutate({ kind: "GITLAB", enabled: !connection.prReviewsEnabled })
                  }
                >
                  {connection.prReviewsEnabled ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {connection.prReviewsEnabled ? "Pausar PR Reviews" : "Retomar PR Reviews"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Atualizar conexão
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use esta opção se o repositório mudou, o token expirou ou o
              GitLab devolveu erro de acesso.
              {!connection.prReviewsEnabled && " PR Security Reviews está pausado — nenhuma MR recebe comentário automático até retomar."}
            </p>
            {justConnected && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-medium">
                  Opcional — ative PR Security Reviews automático: configure
                  este webhook no GitLab (Settings → Webhooks → Add new
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
                  Secret Token (cole em "Secret Token" no GitLab):
                </p>
                <div className="flex min-w-0 items-center gap-2 font-mono text-xs">
                  <span className="min-w-0 flex-1 break-all">
                    {justConnected.webhookSecret}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copy(justConnected.webhookSecret, "Secret Token")}
                  >
                    <ClipboardCopy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Marque o evento "Merge request events". Uma vez configurado,
                  toda MR aberta ou atualizada recebe um comentário automático
                  do MuriOps com achados de segurança dos arquivos alterados.
                  Esse secret só aparece agora — se perder, atualize a conexão
                  de novo.
                </p>
              </div>
            )}
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
