import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { GoogleDriveError, googleDriveService } from "../../application/google-drive.service.js";

/**
 * Conexão com Google Drive pro Guardian. Registrado como plugin separado de
 * guardian.routes.ts (que aplica `onRequest: authenticate` em TODAS as rotas
 * via addHook de plugin) porque /guardian/drive/callback precisa ser público
 * — é um redirect de navegador vindo direto do Google, sem Authorization
 * header. A identidade da organização nesse caso vem do "state" assinado
 * (ver google-drive.service.ts), não do JWT de sessão.
 */
export async function guardianDriveRoutes(app: FastifyInstance): Promise<void> {
  app.get("/guardian/drive/status", { onRequest: [app.authenticate] }, async (req) => {
    return googleDriveService.status(req.user.organizationId);
  });

  app.get("/guardian/drive/connect", { onRequest: [app.authenticate] }, async (req, reply) => {
    try {
      const url = googleDriveService.buildAuthUrl(req.user.organizationId);
      return { url };
    } catch (err) {
      if (err instanceof GoogleDriveError)
        return reply
          .status(err.statusCode)
          .send({ statusCode: err.statusCode, error: "GoogleDriveError", message: err.message });
      throw err;
    }
  });

  app.delete("/guardian/drive/connection", { onRequest: [app.authenticate] }, async (req, reply) => {
    await googleDriveService.disconnect(req.user.organizationId);
    return reply.status(204).send();
  });

  // Público — redirect do Google. Sem sessão, sem CORS (é navegação de
  // página inteira, não fetch), erros viram redirect com ?drive=error pra UI
  // mostrar mensagem em vez de página em branco.
  app.get("/guardian/drive/callback", async (req, reply) => {
    const query = z
      .object({ code: z.string().optional(), state: z.string().optional(), error: z.string().optional() })
      .parse(req.query ?? {});

    if (query.error || !query.code || !query.state) {
      return reply.redirect(googleDriveService.frontendUrl({ drive: "error", reason: "cancelado" }));
    }
    try {
      const { frontendUrl } = await googleDriveService.handleCallback(query.code, query.state);
      return reply.redirect(frontendUrl);
    } catch (err) {
      // O callback é público: não devolvemos status/resposta crua do Google na URL.
      const message =
        err instanceof GoogleDriveError && err.statusCode < 500
          ? err.message
          : "Não foi possível concluir a conexão. Tente novamente.";
      return reply.redirect(googleDriveService.frontendUrl({ drive: "error", reason: message }));
    }
  });

  app.get("/guardian/drive/files", { onRequest: [app.authenticate] }, async (req, reply) => {
    const query = z
      .object({ folderId: z.string().max(200).optional(), query: z.string().max(120).optional() })
      .parse(req.query ?? {});
    try {
      return await googleDriveService.listFiles(req.user.organizationId, query);
    } catch (err) {
      if (err instanceof GoogleDriveError)
        return reply
          .status(err.statusCode)
          .send({ statusCode: err.statusCode, error: "GoogleDriveError", message: err.message });
      throw err;
    }
  });

  app.get(
    "/guardian/drive/files/:fileId/content",
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const { fileId } = z.object({ fileId: z.string().min(1).max(200) }).parse(req.params);
      try {
        return await googleDriveService.downloadFileAsText(req.user.organizationId, fileId);
      } catch (err) {
        if (err instanceof GoogleDriveError)
          return reply
            .status(err.statusCode)
            .send({ statusCode: err.statusCode, error: "GoogleDriveError", message: err.message });
        throw err;
      }
    },
  );
}
