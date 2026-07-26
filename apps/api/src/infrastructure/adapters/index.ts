import type { Adapter, AdapterKind } from "@qa-ai/shared";
import { decryptSecret } from "../crypto/secret-box.js";
import { GithubAdapter } from "./github/github-adapter.js";
import { ManualBridgeAdapter } from "./manual-bridge.adapter.js";

/**
 * Linha crua de `AdapterConnection` (inclui campos sensíveis que nunca vão
 * pro DTO compartilhado com o frontend) — a factory roda só no servidor.
 */
export interface AdapterConnectionRow {
  kind: AdapterKind;
  config: unknown;
  bridgeToken: string | null;
  credentialEncrypted: string | null;
}

/**
 * Factory que resolve o adapter concreto pra uma conexão — mesma forma de
 * `infrastructure/ai/index.ts` (interface + classes concretas + factory). O
 * núcleo orquestrador nunca importa uma classe de adapter diretamente, só
 * fala com a interface `Adapter` resolvida aqui.
 */
export function createAdapterFor(connection: AdapterConnectionRow): Adapter {
  switch (connection.kind) {
    case "MANUAL_BRIDGE": {
      if (!connection.bridgeToken) {
        throw new Error("Conexão MANUAL_BRIDGE sem bridgeToken configurado.");
      }
      return new ManualBridgeAdapter(connection.bridgeToken);
    }
    case "MCP":
      // O adapter MCP (Fase 1) é consumido via protocolo pelo cliente externo,
      // não pelo núcleo orquestrador — não participa desta factory de apply.
      throw new Error("Adapter MCP não é acionado pela factory de aplicação.");
    case "GITHUB": {
      const config = connection.config as { owner?: string; repo?: string } | null;
      if (!connection.credentialEncrypted || !config?.owner || !config?.repo) {
        throw new Error("Conexão GITHUB incompleta (token, owner ou repo ausente).");
      }
      return new GithubAdapter(
        decryptSecret(connection.credentialEncrypted),
        config.owner,
        config.repo,
      );
    }
    default:
      throw new Error(`Tipo de adapter desconhecido: ${connection.kind}`);
  }
}
