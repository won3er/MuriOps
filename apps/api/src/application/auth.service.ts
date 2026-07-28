import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import type { RegisterRequest } from "@qa-ai/shared";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

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

    if (!user.passwordHash)
      throw new AuthError(
        "Esta conta usa login com Google — entre pelo botão \"Entrar com Google\"",
        401,
      );
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AuthError("Credenciais inválidas", 401);

    return user;
  },

  /**
   * Login/cadastro via "Entrar com Google" — recebe o ID token gerado pelo
   * Google Identity Services no navegador, verifica a assinatura contra o
   * Client ID configurado, e encontra ou cria o usuário/organização. Não
   * troca segredo nenhum com o Google no back-end — só valida o token.
   */
  async loginWithGoogle(idToken: string) {
    if (!googleClient)
      throw new AuthError("Login com Google não está configurado neste ambiente", 503);

    const ticket = await googleClient
      .verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID })
      .catch(() => null);
    const payload = ticket?.getPayload();
    if (!payload?.email) throw new AuthError("Token do Google inválido", 401);
    if (!payload.email_verified) throw new AuthError("E-mail do Google não verificado", 401);

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;
    const name = payload.name ?? email.split("@")[0] ?? email;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      include: { organization: { include: { subscription: true } } },
    });

    if (existing) {
      // Conta já existia por e-mail/senha — vincula o Google a ela agora.
      if (!existing.googleId) {
        // Zera a senha ao vincular: o Google acabou de provar (email_verified)
        // que quem está logando é o dono de verdade do e-mail — mas a senha
        // da conta pode ter sido definida por outra pessoa que só digitou
        // esse e-mail no cadastro (não existe verificação de e-mail no
        // registro comum). Sem zerar, quem criou a conta com senha continua
        // com acesso permanente à conta do dono real depois do vínculo — e
        // como não há fluxo de "esqueci minha senha", não haveria como o
        // dono revogar esse acesso depois. Zerando, a conta vira Google-only
        // (mesmo comportamento de uma conta criada direto via Google).
        return prisma.user.update({
          where: { id: existing.id },
          data: { googleId, passwordHash: null },
          include: { organization: { include: { subscription: true } } },
        });
      }
      return existing;
    }

    return prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: `${name} — Workspace`,
          subscription: { create: {} },
        },
      });
      return tx.user.create({
        data: { name, email, googleId, organizationId: org.id },
        include: { organization: { include: { subscription: true } } },
      });
    });
  },

  async me(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { include: { subscription: true } } },
    });
  },
};
