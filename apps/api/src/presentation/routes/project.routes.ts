import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  analysisService,
  NotFoundError,
} from "../../application/analysis.service.js";
import { projectService } from "../../application/project.service.js";

const createSchema = z.object({
  name: z.string().min(2),
  url: z.string().min(3),
  description: z.string().optional(),
});

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  app.get("/projects", async (req) => {
    return projectService.list(req.user.organizationId);
  });

  app.post("/projects", async (req, reply) => {
    const body = createSchema.parse(req.body);
    const project = await projectService.create(
      req.user.organizationId,
      req.user.sub,
      body,
    );
    return reply.status(201).send(project);
  });

  app.get("/projects/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const project = await projectService.getById(req.user.organizationId, id);
    if (!project)
      return reply
        .status(404)
        .send({ statusCode: 404, error: "NotFound", message: "Projeto não encontrado" });
    return project;
  });

  app.get("/projects/:id/analyses", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return analysisService.listByProject(req.user.organizationId, id);
  });

  // Apaga o projeto e todas as análises/problemas/evidências relacionados.
  app.delete("/projects/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    try {
      await projectService.remove(req.user.organizationId, id);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError)
        return reply
          .status(404)
          .send({ statusCode: 404, error: "NotFound", message: err.message });
      throw err;
    }
  });
}
