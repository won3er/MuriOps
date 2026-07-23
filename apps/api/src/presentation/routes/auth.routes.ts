import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authService, AuthError } from "../../application/auth.service.js";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Limite estrito contra brute force / enumeração de credenciais.
const authRateLimit = { rateLimit: { max: 10, timeWindow: "1 minute" } };

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", { config: authRateLimit }, async (req, reply) => {
    const body = registerSchema.parse(req.body);
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
    },
    plan: user.organization?.subscription?.plan ?? "FREE",
  };
}
