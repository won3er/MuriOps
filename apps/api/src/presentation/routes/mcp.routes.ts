import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildMcpServer } from "../../infrastructure/adapters/mcp/mcp-server.js";
import { prisma } from "../../infrastructure/database/prisma.js";

/**
 * Bridge MCP — pública, sem login, autenticada só pelo token da conexão na
 * URL (mesmo modelo de segurança de `/apply/:token`). Segundo adapter pull:
 * ferramentas MCP (Claude Code, Windsurf, Cursor...) se conectam direto aqui.
 * Stateless: uma instância de McpServer/transport por request.
 */
export async function mcpBridgeRoutes(app: FastifyInstance): Promise<void> {
  app.post("/mcp/:token", async (req, reply) => {
    const { token } = z.object({ token: z.string().min(10) }).parse(req.params);
    const connection = await prisma.adapterConnection.findUnique({
      where: { bridgeToken: token },
    });
    if (!connection || connection.kind !== "MCP" || !connection.isActive) {
      return reply.status(404).send({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Conexão MCP não encontrada — confira o token." },
        id: null,
      });
    }

    const server = buildMcpServer({
      organizationId: connection.organizationId,
      projectId: connection.projectId,
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    reply.hijack();
    await server.connect(transport);
    await transport.handleRequest(req.raw, reply.raw, req.body);
    reply.raw.on("close", () => {
      transport.close();
      server.close();
    });
  });

  // Streamable HTTP stateless: GET/DELETE não são suportados neste modo.
  app.get("/mcp/:token", async (_req, reply) => {
    reply.raw.writeHead(405, { "Content-Type": "application/json" }).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Método não suportado." },
        id: null,
      }),
    );
  });
}
