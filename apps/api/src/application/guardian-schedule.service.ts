import type {
  CreateGuardianScheduleRequest,
  GuardianResult,
  GuardianSchedule,
  UpdateGuardianScheduleRequest,
} from "@qa-ai/shared";
import { decryptSecret } from "../infrastructure/crypto/secret-box.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { sendEmailViaResend } from "../infrastructure/email/email-provider.js";
import { googleDriveService } from "./google-drive.service.js";
import {
  AiKeyRequiredError,
  generate as generateGuardianRun,
  guardianService,
  InvalidGuardianInputError,
} from "./guardian.service.js";
import { NotFoundError } from "./analysis.service.js";

/**
 * Agendamento automático do Guardian: reaudita um arquivo do Google Drive
 * conectado todo dia num horário fixo (UTC) e opcionalmente envia o resumo
 * por e-mail. Depende da conexão Drive já existente da organização — por
 * isso só funciona com um arquivo do Drive (não com texto colado, que não
 * teria o que reler no dia seguinte).
 */
export const guardianScheduleService = {
  async list(organizationId: string): Promise<GuardianSchedule[]> {
    const rows = await prisma.guardianSchedule.findMany({
      where: { organizationId },
      include: { ruleset: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toSchedule);
  },

  async create(
    organizationId: string,
    userId: string,
    input: CreateGuardianScheduleRequest,
  ): Promise<GuardianSchedule> {
    if (input.hourUtc < 0 || input.hourUtc > 23) {
      throw new InvalidGuardianInputError("hourUtc deve ser um número entre 0 e 23");
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { googleDriveRefreshTokenEncrypted: true },
    });
    if (!org?.googleDriveRefreshTokenEncrypted) {
      throw new InvalidGuardianInputError(
        "Conecte o Google Drive antes de criar um agendamento — a reauditoria automática precisa reler o arquivo todo dia.",
      );
    }

    let projectId: string | null = null;
    if (input.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, organizationId },
        select: { id: true },
      });
      if (!project) throw new NotFoundError("Projeto não encontrado");
      projectId = project.id;
    }

    let rulesetId: string | null = null;
    if (input.rulesetId) {
      const ruleset = await prisma.guardianRuleset.findFirst({
        where: { id: input.rulesetId, organizationId },
        select: { id: true },
      });
      if (!ruleset) throw new NotFoundError("Conjunto de regras não encontrado");
      rulesetId = ruleset.id;
    }

    const created = await prisma.guardianSchedule.create({
      data: {
        organizationId,
        createdById: userId,
        projectId,
        rulesetId,
        name: input.name?.trim() || `Reauditoria diária — ${input.driveFileName}`,
        driveFileId: input.driveFileId,
        driveFileName: input.driveFileName,
        hourUtc: Math.trunc(input.hourUtc),
        recipientEmail: input.recipientEmail?.trim() || null,
      },
      include: { ruleset: { select: { name: true } } },
    });
    return toSchedule(created);
  },

  async update(
    organizationId: string,
    id: string,
    input: UpdateGuardianScheduleRequest,
  ): Promise<GuardianSchedule> {
    const row = await prisma.guardianSchedule.findFirst({ where: { id, organizationId } });
    if (!row) throw new NotFoundError("Agendamento não encontrado");

    if (input.hourUtc !== undefined && (input.hourUtc < 0 || input.hourUtc > 23)) {
      throw new InvalidGuardianInputError("hourUtc deve ser um número entre 0 e 23");
    }
    if (input.rulesetId) {
      const ruleset = await prisma.guardianRuleset.findFirst({
        where: { id: input.rulesetId, organizationId },
        select: { id: true },
      });
      if (!ruleset) throw new NotFoundError("Conjunto de regras não encontrado");
    }

    const updated = await prisma.guardianSchedule.update({
      where: { id },
      data: {
        active: input.active,
        hourUtc: input.hourUtc !== undefined ? Math.trunc(input.hourUtc) : undefined,
        recipientEmail:
          input.recipientEmail !== undefined
            ? input.recipientEmail?.trim() || null
            : undefined,
        rulesetId: input.rulesetId !== undefined ? input.rulesetId : undefined,
      },
      include: { ruleset: { select: { name: true } } },
    });
    return toSchedule(updated);
  },

  async remove(organizationId: string, id: string): Promise<void> {
    const row = await prisma.guardianSchedule.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!row) throw new NotFoundError("Agendamento não encontrado");
    await prisma.guardianSchedule.delete({ where: { id } });
  },

  /**
   * Chamado periodicamente (ver scheduler em main.ts) — roda todo
   * agendamento ativo cuja hora bateu e que ainda não rodou hoje. Falhas
   * individuais (ex.: Drive desconectado, chave de IA removida) não param
   * os outros agendamentos.
   */
  async runDueSchedules(): Promise<void> {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const due = await prisma.guardianSchedule.findMany({
      where: {
        active: true,
        hourUtc: currentHour,
        OR: [{ lastRunAt: null }, { lastRunAt: { lt: todayStart } }],
      },
      include: { ruleset: true },
    });

    for (const schedule of due) {
      try {
        await runOne(schedule);
      } catch (err) {
        console.error(
          `❌ Guardian schedule ${schedule.id} (${schedule.name}) falhou:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  },
};

async function runOne(schedule: {
  id: string;
  organizationId: string;
  createdById: string;
  projectId: string | null;
  rulesetId: string | null;
  ruleset: { name: string } | null;
  name: string;
  driveFileId: string;
  driveFileName: string;
  recipientEmail: string | null;
}): Promise<void> {
  const { organizationId } = schedule;

  // Confirma chave de IA antes de gastar a leitura do Drive à toa.
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      aiProvider: true,
      aiApiKeyEncrypted: true,
      emailProvider: true,
      emailApiKeyEncrypted: true,
      emailFromAddress: true,
    },
  });
  if (!org?.aiProvider || !org.aiApiKeyEncrypted) {
    throw new AiKeyRequiredError("Sem chave de IA configurada — pulei este agendamento.");
  }

  const { name: sourceName, content: documentText } = await googleDriveService.downloadFileAsText(
    organizationId,
    schedule.driveFileId,
  );

  const created = await prisma.guardianRun.create({
    data: {
      organizationId,
      projectId: schedule.projectId,
      rulesetId: schedule.rulesetId,
      createdById: schedule.createdById,
      title: `${schedule.name} — ${new Date().toISOString().slice(0, 10)}`,
      sourceName,
      documentRaw: documentText,
      provider: org.aiProvider,
      status: "PENDING",
    },
  });

  await generateGuardianRun(created.id, organizationId);

  const finalRun = await guardianService.getRun(organizationId, created.id);

  await prisma.guardianSchedule.update({
    where: { id: schedule.id },
    data: { lastRunAt: new Date(), lastRunId: created.id },
  });

  if (schedule.recipientEmail && org.emailProvider && org.emailApiKeyEncrypted && org.emailFromAddress) {
    try {
      const apiKey = decryptSecret(org.emailApiKeyEncrypted);
      const result = finalRun?.result as GuardianResult | null | undefined;
      await sendEmailViaResend(apiKey, org.emailFromAddress, {
        to: schedule.recipientEmail,
        subject: `[MuriOps Guardian] ${schedule.name} — ${finalRun?.status === "READY" ? (result?.overallStatus ?? "concluída") : "falhou"}`,
        html: renderEmailHtml(schedule.name, finalRun?.status ?? "FAILED", result, finalRun?.error ?? null),
      });
    } catch (err) {
      console.error(
        `⚠️  Guardian schedule ${schedule.id}: e-mail não enviado:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

function renderEmailHtml(
  scheduleName: string,
  status: string,
  result: GuardianResult | null | undefined,
  error: string | null,
): string {
  if (status !== "READY" || !result) {
    return `<p><strong>${escapeHtml(scheduleName)}</strong> falhou hoje.</p><p>${escapeHtml(error ?? "Erro desconhecido.")}</p>`;
  }
  const findingsHtml = result.findings
    .slice(0, 10)
    .map(
      (f) =>
        `<li><strong>[${escapeHtml(f.riskLevel)}]</strong> ${escapeHtml(f.title)} — ${escapeHtml(f.description)}</li>`,
    )
    .join("");
  return `
    <h2>${escapeHtml(scheduleName)}</h2>
    <p>Status geral: <strong>${escapeHtml(result.overallStatus)}</strong></p>
    <p>${escapeHtml(result.summary)}</p>
    ${result.findings.length > 0 ? `<ul>${findingsHtml}</ul>` : "<p>Nenhum achado.</p>"}
    <p><small>Enviado automaticamente pelo agendamento do MuriOps Guardian.</small></p>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toSchedule(row: {
  id: string;
  projectId: string | null;
  rulesetId: string | null;
  ruleset: { name: string } | null;
  name: string;
  driveFileId: string;
  driveFileName: string;
  hourUtc: number;
  recipientEmail: string | null;
  active: boolean;
  lastRunAt: Date | null;
  lastRunId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): GuardianSchedule {
  return {
    id: row.id,
    projectId: row.projectId,
    rulesetId: row.rulesetId,
    rulesetName: row.ruleset?.name ?? null,
    name: row.name,
    driveFileId: row.driveFileId,
    driveFileName: row.driveFileName,
    hourUtc: row.hourUtc,
    recipientEmail: row.recipientEmail,
    active: row.active,
    lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
    lastRunId: row.lastRunId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
