import type { Adapter, AdapterKind } from "@qa-ai/shared";
import { decryptSecret } from "../crypto/secret-box.js";
import { FtpAdapter } from "./ftp/ftp-adapter.js";
import { GithubAdapter } from "./github/github-adapter.js";
import { ManualBridgeAdapter } from "./manual-bridge.adapter.js";
import { NuvemshopAdapter } from "./nuvemshop/nuvemshop-adapter.js";
import { ShopifyAdapter } from "./shopify/shopify-adapter.js";
import { WordpressAdapter } from "./wordpress/wordpress-adapter.js";

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
    case "WORDPRESS": {
      const config = connection.config as { siteUrl?: string; username?: string } | null;
      if (!connection.credentialEncrypted || !config?.siteUrl || !config?.username) {
        throw new Error("Conexão WORDPRESS incompleta (senha de aplicativo, site ou usuário ausente).");
      }
      return new WordpressAdapter(config.siteUrl, config.username, decryptSecret(connection.credentialEncrypted));
    }
    case "SHOPIFY": {
      const config = connection.config as { shopDomain?: string } | null;
      if (!connection.credentialEncrypted || !config?.shopDomain) {
        throw new Error("Conexão SHOPIFY incompleta (access token ou domínio da loja ausente).");
      }
      return new ShopifyAdapter(config.shopDomain, decryptSecret(connection.credentialEncrypted));
    }
    case "NUVEMSHOP": {
      const config = connection.config as { storeId?: string } | null;
      if (!connection.credentialEncrypted || !config?.storeId) {
        throw new Error("Conexão NUVEMSHOP incompleta (access token ou store ID ausente).");
      }
      return new NuvemshopAdapter(config.storeId, decryptSecret(connection.credentialEncrypted));
    }
    case "FTP": {
      const config = connection.config as
        | { host?: string; port?: number; user?: string; secure?: boolean; remotePath?: string }
        | null;
      if (!connection.credentialEncrypted || !config?.host || !config?.user) {
        throw new Error("Conexão FTP incompleta (senha, host ou usuário ausente).");
      }
      return new FtpAdapter(
        config.host,
        config.port ?? 21,
        config.user,
        decryptSecret(connection.credentialEncrypted),
        config.secure ?? false,
        config.remotePath ?? "",
      );
    }
    default:
      throw new Error(`Tipo de adapter desconhecido: ${connection.kind}`);
  }
}
