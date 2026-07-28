import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { AdapterConnection } from "@qa-ai/shared";
import { decryptSecret, encryptSecret, maskSecret } from "../infrastructure/crypto/secret-box.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { NotFoundError } from "./analysis.service.js";

/**
 * Gerencia `AdapterConnection` — MCP (Fase 1, pull) e GitHub (Fase 2, push).
 * O adapter de ponte manual não precisa de conexão própria (usa o `apiToken`
 * que já existe em cada `RemediationPlan`).
 */
export const adapterConnectionService = {
  /** Cria (ou retorna a existente) a conexão MCP do projeto — idempotente por `[projectId, kind]`. */
  async ensureMcpConnection(
    organizationId: string,
    projectId: string,
    userId: string,
  ): Promise<AdapterConnection> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("Projeto não encontrado");

    const existing = await prisma.adapterConnection.findUnique({
      where: { projectId_kind: { projectId, kind: "MCP" } },
    });
    if (existing) return toDto(existing);

    const created = await prisma.adapterConnection.create({
      data: {
        projectId,
        organizationId,
        kind: "MCP",
        capabilities: ["ANALYZE", "APPLY"],
        mode: "pull",
        bridgeToken: randomBytes(24).toString("base64url"),
        createdById: userId,
      },
    });
    return toDto(created);
  },

  /** Gera um novo token pra conexão MCP existente (revoga o anterior). */
  async regenerateMcpToken(
    organizationId: string,
    projectId: string,
  ): Promise<AdapterConnection> {
    const existing = await prisma.adapterConnection.findFirst({
      where: { projectId, organizationId, kind: "MCP" },
    });
    if (!existing) throw new NotFoundError("Conexão MCP não encontrada");
    const updated = await prisma.adapterConnection.update({
      where: { id: existing.id },
      data: { bridgeToken: randomBytes(24).toString("base64url") },
    });
    return toDto(updated);
  },

  /** Desconecta (apaga) a conexão MCP do projeto — permite reconectar/editar do zero depois. */
  async disconnectMcp(organizationId: string, projectId: string): Promise<void> {
    const existing = await prisma.adapterConnection.findFirst({
      where: { projectId, organizationId, kind: "MCP" },
    });
    if (!existing) throw new NotFoundError("Conexão MCP não encontrada");
    await prisma.adapterConnection.delete({ where: { id: existing.id } });
  },

  /**
   * Todas as conexões ativas do projeto (sem credenciais) — alimenta o
   * seletor de "qual conexão usar" na tela de Orquestração. A ponte manual
   * não aparece aqui (não tem `AdapterConnection` própria, usa o `apiToken`
   * de cada `RemediationPlan`) — ela funciona sem seleção nenhuma.
   */
  async listByProject(
    organizationId: string,
    projectId: string,
  ): Promise<AdapterConnection[]> {
    const rows = await prisma.adapterConnection.findMany({
      where: { projectId, organizationId, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toDto);
  },

  async getByProjectAndKind(
    organizationId: string,
    projectId: string,
    kind: AdapterConnection["kind"],
  ): Promise<AdapterConnection | null> {
    const row = await prisma.adapterConnection.findFirst({
      where: { projectId, organizationId, kind },
    });
    return row ? toDto(row) : null;
  },

  /**
   * Cria ou atualiza a conexão GitHub do projeto. Gera um segredo de webhook
   * na criação (o usuário cola em GitHub → repo → Settings → Webhooks) — só
   * é reexibido em claro nesta chamada; depois disso fica mascarado.
   */
  async upsertGithubConnection(
    organizationId: string,
    projectId: string,
    userId: string,
    input: { owner: string; repo: string; token: string },
  ): Promise<AdapterConnection & { webhookSecret: string; webhookUrl: string }> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("Projeto não encontrado");

    const existing = await prisma.adapterConnection.findUnique({
      where: { projectId_kind: { projectId, kind: "GITHUB" } },
    });

    const webhookSecret = existing?.webhookSecretEncrypted
      ? decryptSecret(existing.webhookSecretEncrypted)
      : randomBytes(24).toString("base64url");

    const data = {
      projectId,
      organizationId,
      kind: "GITHUB" as const,
      capabilities: ["ANALYZE", "APPLY", "OBSERVE"] as ("ANALYZE" | "APPLY" | "OBSERVE")[],
      mode: "push",
      config: { owner: input.owner, repo: input.repo },
      credentialEncrypted: encryptSecret(input.token),
      webhookSecretEncrypted: encryptSecret(webhookSecret),
      createdById: userId,
    };

    const row = existing
      ? await prisma.adapterConnection.update({ where: { id: existing.id }, data })
      : await prisma.adapterConnection.create({ data });

    return {
      ...toDto(row),
      webhookSecret,
      webhookUrl: `/webhooks/github/${row.id}`,
    };
  },

  /** Conexão GitHub com o token/segredo mascarados — pra exibir na tela sem reexibir os valores reais. */
  async getGithubConnectionMasked(
    organizationId: string,
    projectId: string,
  ): Promise<(AdapterConnection & { maskedToken: string | null }) | null> {
    const row = await prisma.adapterConnection.findFirst({
      where: { projectId, organizationId, kind: "GITHUB" },
    });
    if (!row) return null;
    let maskedToken: string | null = null;
    try {
      maskedToken = row.credentialEncrypted ? maskSecret(decryptSecret(row.credentialEncrypted)) : null;
    } catch {
      maskedToken = "••••";
    }
    return { ...toDto(row), maskedToken };
  },

  /** Conexão WordPress (Fase 4 — adapter push por REST API + Application Password). */
  async upsertWordpressConnection(
    organizationId: string,
    projectId: string,
    userId: string,
    input: { siteUrl: string; username: string; appPassword: string },
  ): Promise<AdapterConnection> {
    return upsertPlatformConnection(organizationId, projectId, userId, {
      kind: "WORDPRESS",
      config: { siteUrl: input.siteUrl, username: input.username },
      secret: input.appPassword,
    });
  },

  /** Conexão Shopify (Fase 4 — adapter push via Admin API access token). */
  async upsertShopifyConnection(
    organizationId: string,
    projectId: string,
    userId: string,
    input: { shopDomain: string; accessToken: string },
  ): Promise<AdapterConnection> {
    return upsertPlatformConnection(organizationId, projectId, userId, {
      kind: "SHOPIFY",
      config: { shopDomain: input.shopDomain },
      secret: input.accessToken,
    });
  },

  /** Conexão Nuvemshop (Fase 4 — adapter push via API v1 + app privado). */
  async upsertNuvemshopConnection(
    organizationId: string,
    projectId: string,
    userId: string,
    input: { storeId: string; accessToken: string },
  ): Promise<AdapterConnection> {
    return upsertPlatformConnection(organizationId, projectId, userId, {
      kind: "NUVEMSHOP",
      config: { storeId: input.storeId },
      secret: input.accessToken,
    });
  },

  /** Conexão FTP (Fase 4 — Hostinger/Hostgator e qualquer host com acesso a arquivo). */
  async upsertFtpConnection(
    organizationId: string,
    projectId: string,
    userId: string,
    input: {
      host: string;
      port?: number;
      user: string;
      password: string;
      secure?: boolean;
      remotePath?: string;
    },
  ): Promise<AdapterConnection> {
    return upsertPlatformConnection(organizationId, projectId, userId, {
      kind: "FTP",
      config: {
        host: input.host,
        port: input.port ?? 21,
        user: input.user,
        secure: input.secure ?? false,
        remotePath: input.remotePath ?? "",
      },
      secret: input.password,
    });
  },

  /** Conexão de plataforma (WordPress/Shopify/Nuvemshop/FTP) com a credencial mascarada. */
  async getPlatformConnectionMasked(
    organizationId: string,
    projectId: string,
    kind: "WORDPRESS" | "SHOPIFY" | "NUVEMSHOP" | "FTP",
  ): Promise<(AdapterConnection & { maskedCredential: string | null }) | null> {
    const row = await prisma.adapterConnection.findFirst({
      where: { projectId, organizationId, kind },
    });
    if (!row) return null;
    let maskedCredential: string | null = null;
    try {
      maskedCredential = row.credentialEncrypted ? maskSecret(decryptSecret(row.credentialEncrypted)) : null;
    } catch {
      maskedCredential = "••••";
    }
    return { ...toDto(row), maskedCredential };
  },
};

/** Upsert genérico pros adapters de plataforma (Fase 4) — mesma mecânica do GitHub, sem webhook. */
async function upsertPlatformConnection(
  organizationId: string,
  projectId: string,
  userId: string,
  input: {
    kind: "WORDPRESS" | "SHOPIFY" | "NUVEMSHOP" | "FTP";
    config: Prisma.InputJsonObject;
    secret: string;
  },
): Promise<AdapterConnection> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  if (!project) throw new NotFoundError("Projeto não encontrado");

  const existing = await prisma.adapterConnection.findUnique({
    where: { projectId_kind: { projectId, kind: input.kind } },
  });

  const data = {
    projectId,
    organizationId,
    kind: input.kind,
    capabilities: ["ANALYZE", "APPLY"] as ("ANALYZE" | "APPLY" | "OBSERVE")[],
    mode: "push",
    config: input.config,
    credentialEncrypted: encryptSecret(input.secret),
    createdById: userId,
  };

  const row = existing
    ? await prisma.adapterConnection.update({ where: { id: existing.id }, data })
    : await prisma.adapterConnection.create({ data });

  return toDto(row);
}

function toDto(row: {
  id: string;
  projectId: string;
  kind: string;
  capabilities: string[];
  mode: string;
  config: unknown;
  bridgeToken: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AdapterConnection {
  return {
    id: row.id,
    projectId: row.projectId,
    kind: row.kind as AdapterConnection["kind"],
    capabilities: row.capabilities as AdapterConnection["capabilities"],
    mode: row.mode as AdapterConnection["mode"],
    config: (row.config as Record<string, unknown> | null) ?? null,
    bridgeToken: row.bridgeToken,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
