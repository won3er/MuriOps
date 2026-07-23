import bcrypt from "bcryptjs";
import type { RegisterRequest } from "@qa-ai/shared";
import { prisma } from "../infrastructure/database/prisma.js";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
  }
}

export const authService = {
  async register(input: RegisterRequest) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) throw new AuthError("E-mail já cadastrado", 409);

    const passwordHash = await bcrypt.hash(input.password, 12);

    // Cria organização + assinatura FREE + usuário numa transação.
    const user = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.organizationName ?? `${input.name} — Workspace`,
          subscription: { create: {} },
        },
      });
      return tx.user.create({
        data: {
          name: input.name,
          email: input.email.toLowerCase(),
          passwordHash,
          organizationId: org.id,
        },
        include: { organization: { include: { subscription: true } } },
      });
    });

    return user;
  },

  async validateCredentials(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organization: { include: { subscription: true } } },
    });
    if (!user) throw new AuthError("Credenciais inválidas", 401);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AuthError("Credenciais inválidas", 401);

    return user;
  },

  async me(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { include: { subscription: true } } },
    });
  },
};
