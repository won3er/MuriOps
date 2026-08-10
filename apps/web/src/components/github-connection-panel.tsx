"use client";

import { useEffect, useRef, useState } from "react";
import { ClipboardCopy, Github, Loader2, LogIn, Pause, Pencil, Play } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConnectionQueryState } from "@/components/connection-query-state";
import { ActionError } from "@/components/action-error";
import {
  useConnectGithub,
  useGithubConnection,
  useGithubOAuthRepos,
  useSelectGithubOAuthRepo,
  useSetPrReviewsEnabled,
  useStartGithubOAuth,
} from "@/lib/queries";

/**
 * Painel "Conectar GitHub" — primeiro adapter *push* (Fase 2). Diferente do
 * MCP/ponte manual (pull), aqui o MuriOps age direto: abre PR com o checklist
 * de remediação, nunca faz merge sozinho (a PR é o checkpoint de aprovação).
 *
 * [10/08/2026] "Conectar com GitHub" via OAuth é o caminho principal — um
 * clique, autoriza no GitHub, escolhe o repositório numa lista. O token
 * colado à mão continua existindo como opção avançada/fallback (ambiente sem
 * OAuth App configurada, ou preferência do usuário).
 */
export function GithubConnectionPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useGithubConnection(projectId);
  const connect = useConnectGithub(projectId);
  const setPrReviewsEnabled = useSetPrReviewsEnabled(projectId);
  const startOAuth = useStartGithubOAuth(projectId);
  const [oauthSession, setOauthSession] = useState<string | null>(null);
  const oauthRepos = useGithubOAuthRepos(projectId, oauthSession);
  const selectRepo = useSelectGithubOAuthRepo(projectId);
  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const popupRef = useRef<Window | null>(null);

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

  // Escuta o postMessage que o popup manda de volta (via /aplicacao) depois
  // do callback de OAuth do backend redirecioná-lo.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as
        | { githubOAuthSession?: string | null; oauthError?: string | null }
        | null;
      if (!payload) return;
      if (payload.githubOAuthSession) {
        setConnectingOAuth(false);
        setOauthSession(payload.githubOAuthSession);
      } else if (payload.oauthError && connectingOAuth) {
        setConnectingOAuth(false);
        toast.error(`Não foi possível conectar com o GitHub: ${payload.oauthError}`);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [connectingOAuth]);

  // Se o usuário fechar o popup sem concluir, tira o spinner de "aguardando".
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
    // Abre o popup de forma síncrona (dentro do clique) pra não perder o
    // "user activation" do navegador — só define a URL depois que o backend
    // responder com o authUrl. Ver nota em CLAUDE.md sobre o mesmo risco já
    // observado no picker do Google Drive.
    const popup = window.open("about:blank", "muriops-github-oauth", "width=560,height=720");
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
            "Login direto com GitHub não está configurado neste ambiente. Use o token pessoal abaixo.",
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
    if (!owner.trim() || !repo.trim() || token.trim().length < 10) return;
    connect.mutate(
      { owner: owner.trim(), repo: repo.trim(), token: token.trim() },
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
        ) : oauthSession ? (
          <div className="space-y-2 text-sm">
            <p>
              Conectado como{" "}
              <span className="font-medium">
                {oauthRepos.data?.accountLabel ?? "…"}
              </span>
              . Escolha o repositório:
            </p>
            {oauthRepos.isLoading && <ConnectionQueryState state="loading" />}
            {oauthRepos.isError && (
              <ActionError
                error={oauthRepos.error}
                message="A sessão de autorização expirou ou falhou ao listar repositórios. Conecte novamente."
              />
            )}
            {oauthRepos.data && (
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-1">
                {oauthRepos.data.repos.length === 0 && (
                  <p className="p-2 text-xs text-muted-foreground">
                    Nenhum repositório encontrado nesta conta.
                  </p>
                )}
                {oauthRepos.data.repos.map((r) => (
                  <button
                    key={r.fullName}
                    type="button"
                    disabled={selectRepo.isPending}
                    onClick={() =>
                      selectRepo.mutate(
                        { session: oauthSession, owner: r.owner, repo: r.repo },
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
                    <span className="truncate">{r.fullName}</span>
                    {r.private && (
                      <Badge className="border-border bg-muted text-[10px] text-muted-foreground">
                        privado
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
                  ? `Conectado via GitHub como ${connection.oauthAccountLabel}`
                  : `Configuração salva · token ${connection.maskedToken}`}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={setPrReviewsEnabled.isPending}
                  onClick={() =>
                    setPrReviewsEnabled.mutate({ kind: "GITHUB", enabled: !connection.prReviewsEnabled })
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
              Use esta opção se o repositório mudou, o token expirou ou o GitHub devolveu erro de acesso.
              {!connection.prReviewsEnabled && " PR Security Reviews está pausado — nenhuma PR recebe comentário automático até retomar."}
            </p>
            {justConnected && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-medium">
                  Opcional — ative PR Security Reviews automático: configure
                  este webhook no GitHub (Settings → Webhooks → Add webhook):
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
                  Marque o evento "Pull requests". Uma vez configurado, toda
                  PR aberta ou atualizada recebe um comentário automático do
                  MuriOps com achados de segurança dos arquivos alterados.
                  Esse secret só aparece agora — se perder, atualize a
                  conexão de novo.
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
              {connectingOAuth ? "Aguardando autorização…" : "Conectar com GitHub"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Abre uma janela do GitHub para você autorizar o acesso — sem
              precisar gerar ou colar token nenhum.
            </p>

            <details className="group text-xs">
              <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
                Prefere colar um token pessoal manualmente?
              </summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
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
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
