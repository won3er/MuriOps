"use client";

import { ClipboardCopy, Loader2, Plug, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConnectionQueryState } from "@/components/connection-query-state";
import { ActionError } from "@/components/action-error";
import {
  useConnectMcp,
  useDisconnectMcp,
  useMcpConnection,
  useRegenerateMcpToken,
} from "@/lib/queries";

/**
 * Painel "Conectar via MCP" — segundo adapter pull (Fase 1), além da ponte
 * manual. Windsurf, Claude Code, Cursor e outras ferramentas MCP se conectam
 * direto na URL abaixo pra ler os achados de QA e marcar itens como feitos.
 */
export function McpConnectionPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useMcpConnection(projectId);
  const connect = useConnectMcp(projectId);
  const regenerate = useRegenerateMcpToken(projectId);
  const disconnect = useDisconnectMcp(projectId);

  const connection = data && "mcpUrl" in data ? data : null;

  async function copyUrl() {
    if (!connection) return;
    await navigator.clipboard.writeText(connection.mcpUrl);
    toast.success("URL do MCP copiada");
  }

  async function copyConfiguration() {
    if (!connection) return;
    const config = JSON.stringify(
      { mcpServers: { muriops: { url: connection.mcpUrl } } },
      null,
      2,
    );
    await navigator.clipboard.writeText(config);
    toast.success("Configuração MCP copiada");
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Conectar via MCP</span>
          </div>
          {connection && (
            <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
              Conectado
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Cole essa URL nas configurações de MCP do Windsurf, Cursor, Claude
          Code ou Antigravity — a ferramenta lê os achados de QA e o plano de
          remediação deste projeto, e marca itens como feitos direto de lá.
        </p>

        {isLoading ? (
          <ConnectionQueryState state="loading" />
        ) : isError ? (
          <ConnectionQueryState state="error" />
        ) : connection ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs">
              <span className="truncate">{connection.mcpUrl}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={copyUrl}>
                <ClipboardCopy className="h-3.5 w-3.5" /> Copiar URL
              </Button>
              <Button size="sm" variant="outline" onClick={copyConfiguration}>
                <ClipboardCopy className="h-3.5 w-3.5" /> Copiar configuração
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={regenerate.isPending}
                onClick={() => regenerate.mutate()}
              >
                {regenerate.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {regenerate.isPending ? "Gerando…" : "Gerar novo token"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                disabled={disconnect.isPending}
                onClick={() => {
                  if (
                    confirm(
                      "Desconectar o MCP deste projeto? Você pode criar uma nova conexão depois.",
                    )
                  )
                    disconnect.mutate();
                }}
              >
                {disconnect.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unplug className="h-3.5 w-3.5" />
                )}
                {disconnect.isPending ? "Desconectando…" : "Desconectar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Em clientes compatíveis com MCP por HTTP, use “Copiar configuração” e cole o bloco no arquivo de configuração da ferramenta. Gerar um novo token invalida o anterior — ferramentas já conectadas vão precisar da URL nova. Desconectar remove esta conexão por completo, permitindo reconfigurar do zero.
            </p>
            <ActionError
              error={regenerate.error || disconnect.error}
              message="Não foi possível atualizar a conexão MCP. Tente novamente."
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              size="sm"
              disabled={connect.isPending}
              onClick={() => connect.mutate()}
            >
              {connect.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plug className="h-3.5 w-3.5" />
              )}
              {connect.isPending ? "Criando…" : "Criar conexão MCP"}
            </Button>
            <ActionError
              error={connect.error}
              message="Não foi possível criar a conexão MCP. Tente novamente."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
