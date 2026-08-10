"use client";

import { useEffect, useRef, useState } from "react";
import { ClipboardCopy, GitBranch, Loader2, LogIn, Pause, Pencil, Play } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConnectionQueryState } from "@/components/connection-query-state";
import { ActionError } from "@/components/action-error";
import {
  useConnectGitlab,
  useGitlabConnection,
  useGitlabOAuthProjects,
  useSelectGitlabOAuthProject,
  useSetPrReviewsEnabled,
  useStartGitlabOAuth,
} from "@/lib/queries";

/**
 * Painel "Conectar GitLab" — mesmo padrão push do GitHub (Merge Request em
 * vez de Pull Request). Ver GitlabAdapter no backend.
 *
 * [10/08/2026] "Conectar com GitLab" via OAuth é o caminho principal, espelho
 * exato do painel do GitHub. Token colado à mão continua como fallback.
 */
export function GitlabConnectionPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useGitlabConnection(projectId);
  const connect = useConnectGitlab(projectId);
  const setPrReviewsEnabled = useSetPrReviewsEnabled(projectId);
  const startOAuth = useStartGitlabOAuth(projectId);
  const [oauthSession, setOauthSession] = useState<string | null>(null);
  const oauthProjects = useGitlabOAuthProjects(projectId, oauthSession);
  const selectProject = useSelectGitlabOAuthProject(projectId);
  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const popupRef = useRef<Window | null>(null);

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

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as
        | { gitlabOAuthSession?: string | null; oauthError?: string | null }
        | null;
      if (!payload) return;
      if (payload.gitlabOAuthSession) {
        setConnectingOAuth(false);
        setOauthSession(payload.gitlabOAuthSession);
      } else if (payload.oauthError && connectingOAuth) {
        setConnectingOAuth(false);
        toast.error(`Não foi possível conectar com o GitLab: ${payload.oauthError}`);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [connectingOAuth]);

  useEffect(() => {
    if (!connectingOAuth) return;
    const interval = setInterval(() => {
      if (popupRef.current?.closed) {
        setConnectingOAuth(false);
        clearInterval(interval);
      }
    }, 700);
    return () => clearInterval(interval);
  }, [connectingOAuth]);

  function connectWithOAuth() {
    const popup = window.open("about:blank", "muriops-gitlab-oauth", "width=560,height=720");
    if (!popup) {
      toast.error("Não foi possível abrir a janela de autorização. Verifique o bloqueador de pop-ups.");
      return;
    }
    popupRef.current = popup;
    setConnectingOAuth(true);
    startOAuth.mutate(undefined, {
      onSuccess: (res) => {
        if (!res.configured || !res.authUrl) {
          popup.close();
          setConnectingOAuth(false);
          toast.error(
            "Login direto com GitLab não está configurado neste ambiente. Use o token pessoal abaixo.",
          );
          return;
        }
        popup.location.href = res.authUrl;
      },
      onError: () => {
        popup.close();
        setConnectingOAuth(false);
      },
    });
  }

  function submit() {
    if (!projectPath.trim() || token.trim().length < 10) return;
    connect.mutate(
      { projectPath: projectPath.trim(), token: token.trim() },
      {
        onSuccess: (res) => {
          if (!res.webhookConfiguredAutomatically) {
            setJustConnected({
              webhookSecret: res.webhookSecret,
              webhookUrl: res.webhookUrl,
            });
          } else {
            toast.success("Webhook do PR Security Reviews configurado automaticamente.");
          }
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
        ) : oauthSession ? (
          <div className="space-y-2 text-sm">
            <p>
              Conectado como{" "}
              <span className="font-medium">
                {oauthProjects.data?.accountLabel ?? "…"}
              </span>
              . Escolha o projeto:
            </p>
            {oauthProjects.isLoading && <ConnectionQueryState state="loading" />}
            {oauthProjects.isError && (
              <ActionError
                error={oauthProjects.error}
                message="A sessão de autorização expirou ou falhou ao listar projetos. Conecte novamente."
              />
            )}
            {oauthProjects.data && (
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-1">
                {oauthProjects.data.projects.length === 0 && (
                  <p className="p-2 text-xs text-muted-foreground">
                    Nenhum projeto encontrado nesta conta.
                  </p>
                )}
                {oauthProjects.data.projects.map((p) => (
                  <button
                    key={p.projectPath}
                    type="button"
                    disabled={selectProject.isPending}
                    onClick={() =>
                      selectProject.mutate(
                        { session: oauthSession, projectPath: p.projectPath },
                        {
                          onSuccess: (res) => {
                            if (!res.webhookConfiguredAutomatically) {
                              setJustConnected({
                                webhookSecret: res.webhookSecret ?? "",
                                webhookUrl: res.webhookUrl ?? "",
                              });
                            } else {
                              toast.success(
                                "Webhook do PR Security Reviews configurado automaticamente.",
                              );
                            }
                            setOauthSession(null);
                            setEditing(false);
                          },
                        },
                      )
                    }
                    className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <span className="truncate">{p.projectPath}</span>
                    {p.visibility !== "public" && (
                      <Badge className="border-border bg-muted text-[10px] text-muted-foreground">
                        {p.visibility}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOauthSession(null)}
            >
              Cancelar
            </Button>
          </div>
        ) : connection && !editing ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                {connection.oauthAccountLabel
                  ? `Conectado via GitLab como ${connection.oauthAccountLabel}`
                  : (
                    <>
                      Configuração salva · token{" "}
                      <span className="font-mono">{connection.maskedToken}</span>
                    </>
                  )}
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
          <div className="space-y-3">
            <Button
              type="button"
              size="sm"
              onClick={connectWithOAuth}
              disabled={connectingOAuth || startOAuth.isPending}
            >
              {connectingOAuth ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogIn className="h-3.5 w-3.5" />
              )}
              {connectingOAuth ? "Aguardando autorização…" : "Conectar com GitLab"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Abre uma janela do GitLab para você autorizar o acesso — sem
              precisar gerar ou colar token nenhum.
            </p>

            <details className="group text-xs">
              <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
                Prefere colar um token pessoal manualmente?
              </summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
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
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
