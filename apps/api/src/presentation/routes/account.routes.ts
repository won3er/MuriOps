import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  accountService,
  AccountError,
} from "../../application/account.service.js";

const deleteSchema = z.object({
  confirmationEmail: z.string().email(),
  confirmationPhrase: z.string().min(1),
  password: z.string().min(1).optional(),
  googleCredential: z.string().min(10).optional(),
});

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/account/export",
    {
      onRequest: [app.authenticate],
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    },
    async (req, reply) => {
      const data = await accountService.exportData(
        req.user.sub,
        req.user.organizationId,
      );
      const date = new Date().toISOString().slice(0, 10);
      return reply
        .header("Cache-Control", "no-store, private")
        .header("Pragma", "no-cache")
        .header("Content-Type", "application/json; charset=utf-8")
        .header(
          "Content-Disposition",
          `attachment; filename="muriops-dados-${date}.json"`,
        )
        .send(data);
    },
  );

  app.delete(
    "/account",
    {
      onRequest: [app.authenticate],
      config: { rateLimit: { max: 3, timeWindow: "1 hour" } },
    },
    async (req, reply) => {
      const body = deleteSchema.parse(req.body);
      try {
        await accountService.deleteAccount(
          req.user.sub,
          req.user.organizationId,
          body,
        );
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof AccountError) {
          return reply.status(error.statusCode).send({
            statusCode: error.statusCode,
            error: "AccountError",
            message: error.message,
          });
        }
        throw error;
      }
    },
  );
}
