import fastifyJwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { JwtPayload } from "@qa-ai/shared";
import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/database/prisma.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

/** Registra JWT e expõe o guard `authenticate` para proteger rotas. */
export const authPlugin = fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  app.decorate(
    "authenticate",
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        await req.jwtVerify();
        const user = await prisma.user.findUnique({
          where: { id: req.user.sub },
          select: { organizationId: true, email: true },
        });
        if (
          !user ||
          user.organizationId !== req.user.organizationId ||
          user.email !== req.user.email
        ) {
          throw new Error("Sessão revogada");
        }
      } catch {
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Token ausente ou inválido",
        });
      }
    },
  );
});
