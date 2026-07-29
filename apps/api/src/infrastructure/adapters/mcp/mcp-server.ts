import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { remediationService } from "../../../application/remediation.service.js";
import { prisma } from "../../database/prisma.js";

interface McpScope {
  organizationId: string;
  projectId: string;
}

/**
 * Constrói um McpServer novo, escopado a um projeto/organização (resolvidos
 * a partir do token da conexão pelo caller). Modo stateless: uma instância
 * por request, mesma recomendação do SDK pra Streamable HTTP sem sessão.
 *
 * Segundo adapter *pull* (o primeiro foi a ponte universal) — os tools
 * abaixo são wrappers finos sobre os mesmos métodos de `remediationService`
 * e leitura de `Analysis` que a ponte e a tela `/aplicacao/[id]` já usam.
 * Nenhuma regra de QA mora aqui, só tradução de protocolo.
 */
export function buildMcpServer(scope: McpScope): McpServer {
  const server = new McpServer(
    { name: "muriops", version: "1.0.0" },
    { capabilities: { resources: {}, tools: {} } },
  );

  server.registerResource(
    "analysis-latest",
    "qa://analysis/latest",
    { mimeType: "application/json", description: "Última análise de QA concluída deste projeto." },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(await getLatestAnalysisSummary(scope.projectId)),
        },
      ],
    }),
  );

  server.registerResource(
    "remediation-plan-latest",
    "qa://remediation-plan/latest",
    { mimeType: "application/json", description: "Plano de remediação (Aplicação) mais recente deste projeto." },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(await getLatestPlan(scope)),
        },
      ],
    }),
  );

  server.registerTool(
    "get_analysis_summary",
    {
      description: "Resumo (score geral, por categoria, problemas) da última análise de QA concluída deste projeto.",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text", text: JSON.stringify(await getLatestAnalysisSummary(scope.projectId)) }],
    }),
  );

  server.registerTool(
    "list_remediation_items",
    {
      description: "Lista os itens do plano de remediação (Aplicação) mais recente deste projeto, com status pending/done.",
      inputSchema: { planId: z.string().optional().describe("Id do plano; se omitido, usa o mais recente.") },
    },
    async ({ planId }) => {
      const plan = await resolvePlan(scope, planId);
      if (!plan) {
        return { content: [{ type: "text", text: "Nenhum plano de remediação encontrado para este projeto." }] };
      }
      // Nunca vaza `apiToken` (a ponte manual desse plano) por aqui — mesma
      // cautela de `/apply/:token`, que também só devolve o necessário.
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              id: plan.id,
              title: plan.title,
              status: plan.status,
              summary: plan.result?.summary ?? null,
              items: plan.result?.items ?? [],
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "mark_item_done",
    {
      description: "Marca um item do plano de remediação como feito (ou pendente), conforme a mudança é aplicada no projeto.",
      inputSchema: {
        itemId: z.string().describe("Id do item de remediação."),
        planId: z.string().optional().describe("Id do plano; se omitido, usa o mais recente."),
        status: z.enum(["pending", "done"]).default("done"),
      },
    },
    async ({ itemId, planId, status }) => {
      const plan = await resolvePlan(scope, planId);
      if (!plan) {
        return { content: [{ type: "text", text: "Nenhum plano de remediação encontrado para este projeto." }] };
      }
      const updated = await remediationService.updateItemStatus(
        scope.organizationId,
        plan.id,
        itemId,
        status,
      );
      const items = updated.result?.items ?? [];
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: true,
              itemId,
              status,
              done: items.filter((i) => i.status === "done").length,
              total: items.length,
            }),
          },
        ],
      };
    },
  );

  return server;
}

async function getLatestAnalysisSummary(projectId: string) {
  const analysis = await prisma.analysis.findFirst({
    where: { projectId, status: "COMPLETED" },
    orderBy: { version: "desc" },
  });
  if (!analysis) return { found: false };
  return {
    found: true,
    id: analysis.id,
    version: analysis.version,
    score: analysis.score,
    issueCount: analysis.issueCount,
    pagesDiscovered: analysis.pagesDiscovered,
    finishedAt: analysis.finishedAt?.toISOString() ?? null,
  };
}

/**
 * Uma conexão MCP é escopada a UM projeto (`connection.projectId` em
 * `mcp.routes.ts`) — mas `remediationService.getById` só filtra por
 * organizationId, não por projeto. Sem a checagem de `projectId` abaixo, um
 * `planId` explícito (parâmetro aceito pelos tools `list_remediation_items`
 * e `mark_item_done`) deixava ler/marcar itens de QUALQUER Aplicação da
 * mesma organização, inclusive de outros projetos — furando o escopo por
 * projeto que a própria conexão promete (bug encontrado e corrigido em
 * 28/07/2026, revisão de segurança Fase 3).
 */
async function resolvePlan(scope: McpScope, planId?: string) {
  if (planId) {
    const plan = await remediationService.getById(scope.organizationId, planId);
    return plan && plan.projectId === scope.projectId ? plan : null;
  }
  const plans = await remediationService.list(scope.organizationId, scope.projectId);
  const latest = plans[0];
  if (!latest) return null;
  return remediationService.getById(scope.organizationId, latest.id);
}

async function getLatestPlan(scope: McpScope) {
  const plan = await resolvePlan(scope);
  if (!plan) return { found: false };
  return {
    found: true,
    id: plan.id,
    title: plan.title,
    status: plan.status,
    summary: plan.result?.summary ?? null,
    items: plan.result?.items ?? [],
  };
}
