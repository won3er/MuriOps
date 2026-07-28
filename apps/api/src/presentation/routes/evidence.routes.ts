import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../infrastructure/database/prisma.js";
import { storage } from "../../infrastructure/storage/storage.js";

const paramsSchema = z.object({
  analysisId: z.string().min(1),
  fileName: z.string().regex(/^[a-zA-Z0-9._-]+$/),
});

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".log": "text/plain; charset=utf-8",
  ".html": "text/plain; charset=utf-8",
};

export async function evidenceRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/evidence/:analysisId/:fileName",
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const { analysisId, fileName } = paramsSchema.parse(req.params);
      const relativePath = `${analysisId}/${fileName}`;
      const evidence = await prisma.evidence.findFirst({
        where: {
          path: relativePath,
          analysis: {
            project: { organizationId: req.user.organizationId },
          },
        },
        select: { id: true },
      });
      if (!evidence) {
        return reply.status(404).send({
          statusCode: 404,
          error: "NotFound",
          message: "Evidência não encontrada",
        });
      }

      const data = await readFile(storage.absolutePath(relativePath));
      const contentType =
        CONTENT_TYPES[extname(fileName).toLowerCase()] ??
        "application/octet-stream";
      return reply
        .header("Cache-Control", "no-store, private")
        .header("Pragma", "no-cache")
        .header("Content-Type", contentType)
        .header("Content-Disposition", "inline")
        .send(data);
    },
  );
}
