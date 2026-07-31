import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authService, AuthError } from "../../application/auth.service.js";
import {
  generateHumanCheck,
  verifyHumanCheck,
} from "../../infrastructure/security/human-check.js";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  acceptTerms: z.literal(true),
  organizationName: z.string().min(2).optional(),
  // Código de 6 dígitos exibido na tela de cadastro (troca a cada minuto) —
  // fricção anti-bot simples, sem depender de serviço de terceiro. Ver
  // infrastructure/security/human-check.ts.
  humanCheckAnswer: z.string().length(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  acceptTerms: z.literal(true),
});

const googleSchema = z.object({
  credential: z.string().min(10),
  acceptTerms: z.literal(true),
});

// Limite estrito contra brute force / enumeração de credenciais.
const authRateLimit = { rateLimit: { max: 10, timeWindow: "1 minute" } };

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Público, sem autenticação — é consultado antes de a pessoa ter conta.
  // Rate limit generoso o bastante pra suportar o refetch automático a cada
  // minuto na tela de cadastro, mas ainda limitando abuso.
  app.get(
    "/auth/human-check",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async () => generateHumanCheck(),
  );

  app.post("/auth/register", { config: authRateLimit }, async (req, reply) => {
    const body = registerSchema.parse(req.body);
    if (!verifyHumanCheck(body.humanCheckAnswer)) {
      return reply.status(400).send({
        statusCode: 400,
        error: "HumanCheckFailed",
        message:
          "O código de verificação está incorreto ou expirou. Confira o código exibido na tela e tente novamente.",
      });
    }
    try {
      const user = await authService.register(body);
      const token = app.jwt.sign({
        sub: user.id,
        organizationId: user.organizationId,
        email: user.email,
      });
      return reply.status(201).send(serialize(user, token));
    } catch (err) {
      if (err instanceof AuthError)
        return reply
          .status(err.statusCode)
          .send({ statusCode: err.statusCode, error: "AuthError", message: err.message });
      throw err;
    }
  });

  app.post("/auth/login", { config: authRateLimit }, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    try {
      const user = await authService.validateCredentials(
        body.email,
        body.password,
      );
      const token = app.jwt.sign({
        sub: user.id,
        organizationId: user.organizationId,
        email: user.email,
      });
      return reply.send(serialize(user, token));
    } catch (err) {
      if (err instanceof AuthError)
        return reply
          .status(err.statusCode)
          .send({ statusCode: err.statusCode, error: "AuthError", message: err.message });
      throw err;
    }
  });

  // "Entrar com Google" — recebe o ID token do Google Identity Services,
  // valida e loga/cadastra o usuário sem senha própria.
  app.post("/auth/google", { config: authRateLimit }, async (req, reply) => {
    const body = googleSchema.parse(req.body);
    try {
      const user = await authService.loginWithGoogle(body.credential);
      const token = app.jwt.sign({
        sub: user.id,
        organizationId: user.organizationId,
        email: user.email,
      });
      return reply.send(serialize(user, token));
    } catch (err) {
      if (err instanceof AuthError)
        return reply
          .status(err.statusCode)
          .send({ statusCode: err.statusCode, error: "AuthError", message: err.message });
      throw err;
    }
  });

  app.get(
    "/auth/me",
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const user = await authService.me(req.user.sub);
      if (!user)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: "Usuário não encontrado" });
      return reply.send(serialize(user, ""));
    },
  );
}

function serialize(
  user: {
    id: string;
    name: string;
    email: string;
    organizationId: string;
    createdAt: Date;
    passwordHash?: string | null;
    organization?: { subscription?: { plan: string } | null };
  },
  token: string,
) {
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      organizationId: user.organizationId,
      createdAt: user.createdAt.toISOString(),
      hasPassword: Boolean(user.passwordHash),
    },
    plan: user.organization?.subscription?.plan ?? "FREE",
  };
}
