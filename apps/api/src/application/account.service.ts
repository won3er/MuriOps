import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { storage } from "../infrastructure/storage/storage.js";

const DELETE_PHRASE = "EXCLUIR MINHA CONTA";
const googleClient = env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
  : null;

export class AccountError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
  }
}

export const accountService = {
  async exportData(userId: string, organizationId: string) {
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, users: { some: { id: userId } } },
      select: {
        id: true,
        name: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            maxPagesPerAnalysis: true,
            maxAnalysesPerMonth: true,
            currentPeriodEnd: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        users: {
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            passwordHash: true,
            googleId: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            url: true,
            autonomyLevel: true,
            createdAt: true,
            updatedAt: true,
            qualityGates: {
              select: {
                id: true,
                category: true,
                minScore: true,
                label: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            analyses: {
              select: {
                id: true,
                version: true,
                status: true,
                score: true,
                pagesDiscovered: true,
                issueCount: true,
                durationMs: true,
                aiSummary: true,
                error: true,
                config: true,
                startedAt: true,
                finishedAt: true,
                createdAt: true,
                pages: {
                  select: {
                    id: true,
                    url: true,
                    title: true,
                    depth: true,
                    linkedFrom: true,
                    statusCode: true,
                  },
                },
                issues: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    category: true,
                    severity: true,
                    status: true,
                    pageUrl: true,
                    selector: true,
                    stepsToReproduce: true,
                    impact: true,
                    suggestion: true,
                    createdAt: true,
                  },
                },
                evidence: {
                  select: {
                    id: true,
                    issueId: true,
                    type: true,
                    pageUrl: true,
                    viewport: true,
                    capturedAt: true,
                  },
                },
              },
            },
            orchestrationRuns: {
              select: {
                id: true,
                status: true,
                iteration: true,
                maxIterations: true,
                autonomyLevel: true,
                currentAnalysisId: true,
                currentPlanId: true,
                gateResult: true,
                error: true,
                startedAt: true,
                finishedAt: true,
                createdAt: true,
                updatedAt: true,
                events: {
                  select: {
                    id: true,
                    type: true,
                    message: true,
                    data: true,
                    createdAt: true,
                  },
                },
              },
            },
            adapterConnections: {
              select: {
                id: true,
                kind: true,
                capabilities: true,
                mode: true,
                config: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                credentialEncrypted: true,
                webhookSecretEncrypted: true,
                bridgeToken: true,
              },
            },
          },
        },
        blueprints: {
          select: {
            id: true,
            projectId: true,
            title: true,
            mode: true,
            provider: true,
            status: true,
            input: true,
            result: true,
            error: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        remediationPlans: {
          select: {
            id: true,
            projectId: true,
            sourceType: true,
            sourceId: true,
            scope: true,
            title: true,
            provider: true,
            status: true,
            result: true,
            error: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        upgradePlans: {
          select: {
            id: true,
            projectId: true,
            title: true,
            packageJsonRaw: true,
            ecosystem: true,
            provider: true,
            status: true,
            result: true,
            error: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!organization) throw new AccountError("Conta não encontrada", 404);

    return {
      format: "muriops-account-export",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      notice:
        "Credenciais, hashes de senha, chaves de IA, tokens de ponte e segredos de webhook foram omitidos por segurança.",
      account: {
        ...organization,
        users: organization.users.map(
          ({ passwordHash, googleId, ...user }) => ({
            ...user,
            authentication: {
              password: Boolean(passwordHash),
              google: Boolean(googleId),
            },
          }),
        ),
        projects: organization.projects.map((project) => ({
          ...project,
          adapterConnections: project.adapterConnections.map(
            ({
              credentialEncrypted,
              webhookSecretEncrypted,
              bridgeToken,
              ...connection
            }) => ({
              ...connection,
              secrets: {
                credentialConfigured: Boolean(credentialEncrypted),
                webhookSecretConfigured: Boolean(webhookSecretEncrypted),
                bridgeTokenConfigured: Boolean(bridgeToken),
              },
            }),
          ),
        })),
      },
    };
  },

  async deleteAccount(
    userId: string,
    organizationId: string,
    input: {
      confirmationEmail: string;
      confirmationPhrase: string;
      password?: string;
      googleCredential?: string;
    },
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, email: true, passwordHash: true, googleId: true },
    });
    if (!user) throw new AccountError("Conta não encontrada", 404);

    if (input.confirmationEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      throw new AccountError("O e-mail de confirmação não corresponde à conta");
    }
    if (input.confirmationPhrase.trim() !== DELETE_PHRASE) {
      throw new AccountError(`Digite exatamente: ${DELETE_PHRASE}`);
    }
    if (user.passwordHash) {
      if (!input.password) throw new AccountError("Informe sua senha atual");
      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) throw new AccountError("Senha atual incorreta", 401);
    } else {
      if (!googleClient || !user.googleId || !input.googleCredential) {
        throw new AccountError("Confirme novamente sua identidade com o Google", 401);
      }
      const ticket = await googleClient
        .verifyIdToken({
          idToken: input.googleCredential,
          audience: env.GOOGLE_CLIENT_ID,
        })
        .catch(() => null);
      const payload = ticket?.getPayload();
      if (
        !payload?.email_verified ||
        payload.email?.toLowerCase() !== user.email.toLowerCase() ||
        payload.sub !== user.googleId
      ) {
        throw new AccountError("A confirmação do Google não corresponde à conta", 401);
      }
    }

    const memberCount = await prisma.user.count({ where: { organizationId } });
    if (memberCount > 1) {
      const successor = await prisma.user.findFirst({
        where: { organizationId, id: { not: user.id } },
        select: { id: true },
      });
      if (!successor) throw new AccountError("Não foi possível transferir os registros", 409);
      await prisma.$transaction([
        prisma.project.updateMany({
          where: { organizationId, createdById: user.id },
          data: { createdById: successor.id },
        }),
        prisma.blueprint.updateMany({
          where: { organizationId, createdById: user.id },
          data: { createdById: successor.id },
        }),
        prisma.remediationPlan.updateMany({
          where: { organizationId, createdById: user.id },
          data: { createdById: successor.id },
        }),
        prisma.upgradePlan.updateMany({
          where: { organizationId, createdById: user.id },
          data: { createdById: successor.id },
        }),
        prisma.adapterConnection.updateMany({
          where: { organizationId, createdById: user.id },
          data: { createdById: successor.id },
        }),
        prisma.user.delete({ where: { id: user.id } }),
      ]);
      return { deleted: "user" as const };
    }

    const analyses = await prisma.analysis.findMany({
      where: { project: { organizationId } },
      select: { id: true },
    });
    await prisma.organization.delete({ where: { id: organizationId } });
    await Promise.allSettled(
      analyses.map(({ id }) => storage.removeAnalysis(id)),
    );
    return { deleted: "organization" as const };
  },
};
