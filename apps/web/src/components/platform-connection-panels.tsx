"use client";

import { useState } from "react";
import { Globe, HardDrive, Loader2, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConnectionQueryState } from "@/components/connection-query-state";
import { ActionError } from "@/components/action-error";
import {
  useConnectFtp,
  useConnectShopify,
  useConnectWordpress,
  useFtpConnection,
  useShopifyConnection,
  useWordpressConnection,
} from "@/lib/queries";

/**
 * Painéis "Conectar plataforma" (Fase 4) — adapters *push* que aplicam de
 * verdade fora do repositório de código: WordPress e Shopify via API oficial
 * da plataforma, e FTP pra Hostinger/Hostgator/qualquer host com acesso a
 * arquivo. Mesma filosofia do GitHub: a ação automática é sempre um registro
 * rastreável e reversível (página em rascunho, arquivo de checklist) — nunca
 * sobrescreve tema/código de produção sozinho.
 *
 * Nuvemshop foi removido (descontinuado) — a loja de teste real estourava
 * consistentemente os 512MB do Render free tier no crawl, mesmo depois de
 * três rodadas de otimização de memória no crawler.
 */

function ConnectedBadge({ label }: { label: string }) {
  return (
    <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
      {label}
    </Badge>
  );
}

export function WordpressConnectionPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useWordpressConnection(projectId);
  const connect = useConnectWordpress(projectId);
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");

  const connection = data && "maskedCredential" in data ? data : null;

  function submit() {
    if (!siteUrl.trim() || !username.trim() || appPassword.trim().length < 8)
      return;
    connect.mutate(
      {
        siteUrl: siteUrl.trim(),
        username: username.trim(),
        appPassword: appPassword.trim(),
      },
      { onSuccess: () => setAppPassword("") },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Conectar WordPress</span>
          </div>
          {connection && (
            <ConnectedBadge
              label={
                (connection.config as { siteUrl?: string } | null)?.siteUrl ??
                "Conectado"
              }
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Usa Senha de aplicativo (Usuário → Perfil → Senhas de aplicativo,
          nativo do WP). O MuriOps cria uma página em rascunho com o checklist de
          cada item — nunca publica nem mexe em tema/plugin sozinho.
        </p>

        {isLoading ? (
          <ConnectionQueryState state="loading" />
        ) : isError ? (
          <ConnectionQueryState state="error" />
        ) : connection ? (
          <p className="text-sm">
            Senha de aplicativo:{" "}
            <span className="font-mono">{connection.maskedCredential}</span>
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              aria-label="URL do site WordPress"
              type="url"
              placeholder="https://seusite.com"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
            />
            <Input
              aria-label="Usuário do WordPress"
              placeholder="usuário WP"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              aria-label="Senha de aplicativo do WordPress"
              placeholder="senha de aplicativo"
              type="password"
              autoComplete="new-password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
            />
            <Button
              size="sm"
              className="sm:col-span-3"
              disabled={connect.isPending}
              onClick={submit}
            >
              {connect.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Globe className="h-3.5 w-3.5" />
              )}
              {connect.isPending ? "Conectando…" : "Conectar"}
            </Button>
            {connect.error && (
              <div className="sm:col-span-3">
                <ActionError
                  error={connect.error}
                  message="Não foi possível conectar o WordPress. Confira a URL, o usuário e a senha de aplicativo."
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ShopifyConnectionPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useShopifyConnection(projectId);
  const connect = useConnectShopify(projectId);
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const connection = data && "maskedCredential" in data ? data : null;

  function submit() {
    if (!shopDomain.trim() || accessToken.trim().length < 8) return;
    connect.mutate(
      { shopDomain: shopDomain.trim(), accessToken: accessToken.trim() },
      { onSuccess: () => setAccessToken("") },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Conectar Shopify</span>
          </div>
          {connection && (
            <ConnectedBadge
              label={
                (connection.config as { shopDomain?: string } | null)
                  ?.shopDomain ?? "Conectado"
              }
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Usa um Admin API access token (Configurações → Apps e canais de vendas
          → Desenvolver apps). O MuriOps cria/atualiza uma Page despublicada com o
          checklist — mudanças de tema continuam manuais.
        </p>

        {isLoading ? (
          <ConnectionQueryState state="loading" />
        ) : isError ? (
          <ConnectionQueryState state="error" />
        ) : connection ? (
          <p className="text-sm">
            Access token:{" "}
            <span className="font-mono">{connection.maskedCredential}</span>
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              aria-label="Domínio da loja Shopify"
              placeholder="sua-loja.myshopify.com"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
            />
            <Input
              aria-label="Token de acesso da Shopify"
              placeholder="access token"
              type="password"
              autoComplete="new-password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <Button
              size="sm"
              className="sm:col-span-2"
              disabled={connect.isPending}
              onClick={submit}
            >
              {connect.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShoppingBag className="h-3.5 w-3.5" />
              )}
              {connect.isPending ? "Conectando…" : "Conectar"}
            </Button>
            {connect.error && (
              <div className="sm:col-span-2">
                <ActionError
                  error={connect.error}
                  message="Não foi possível conectar a Shopify. Confira o domínio e o token de acesso."
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FtpConnectionPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useFtpConnection(projectId);
  const connect = useConnectFtp(projectId);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("21");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [remotePath, setRemotePath] = useState("");

  const connection = data && "maskedCredential" in data ? data : null;

  function submit() {
    if (!host.trim() || !user.trim() || !password.trim()) return;
    connect.mutate(
      {
        host: host.trim(),
        port: port.trim() ? Number(port.trim()) : undefined,
        user: user.trim(),
        password: password.trim(),
        remotePath: remotePath.trim() || undefined,
      },
      { onSuccess: () => setPassword("") },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              Conectar por FTP (Hostinger, Hostgator...)
            </span>
          </div>
          {connection && (
            <ConnectedBadge
              label={
                (connection.config as { host?: string } | null)?.host ??
                "Conectado"
              }
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Mesmas credenciais do FTP do seu painel de hospedagem. O MuriOps grava
          um arquivo de checklist real dentro do site (pasta{" "}
          <code>/.muriops/remediation</code>) — editar o código-fonte continua manual.
        </p>

        {isLoading ? (
          <ConnectionQueryState state="loading" />
        ) : isError ? (
          <ConnectionQueryState state="error" />
        ) : connection ? (
          <p className="text-sm">
            Senha FTP:{" "}
            <span className="font-mono">{connection.maskedCredential}</span>
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              aria-label="Host FTP"
              placeholder="host (ftp.seusite.com)"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
            <Input
              aria-label="Porta FTP"
              type="number"
              inputMode="numeric"
              placeholder="porta (21)"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
            <Input
              aria-label="Usuário FTP"
              placeholder="usuário FTP"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
            <Input
              aria-label="Senha FTP"
              placeholder="senha FTP"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              aria-label="Pasta remota"
              placeholder="pasta remota (opcional, ex: public_html)"
              value={remotePath}
              onChange={(e) => setRemotePath(e.target.value)}
              className="sm:col-span-2"
            />
            <Button
              size="sm"
              className="sm:col-span-2"
              disabled={connect.isPending}
              onClick={submit}
            >
              {connect.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <HardDrive className="h-3.5 w-3.5" />
              )}
              {connect.isPending ? "Conectando…" : "Conectar"}
            </Button>
            {connect.error && (
              <div className="sm:col-span-2">
                <ActionError
                  error={connect.error}
                  message="Não foi possível conectar ao FTP. Confira servidor, porta e credenciais."
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
