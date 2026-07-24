import type { RemediationPlan } from "@qa-ai/shared";

/**
 * Ponte universal da Aplicação: gera um "pacote de instruções" em Markdown
 * que o usuário cola/importa em QUALQUER ferramenta de IA de desenvolvimento
 * (Claude Code, Windsurf, Codex, Cursor, VS Code + Copilot...).
 *
 * O pacote contém:
 * 1. As mudanças detalhadas (o que, onde, como) — a IA aplica no código.
 * 2. Comandos de API autenticados pelo token do plano — a IA marca cada item
 *    como "Feito" conforme aplica, e o checklist no Elevate QA atualiza em
 *    tempo real (a página do plano faz polling).
 */
export function buildRemediationBridgeMarkdown(
  plan: RemediationPlan,
  apiBaseUrl: string,
): string {
  const items = plan.result?.items ?? [];
  const base = apiBaseUrl.replace(/\/+$/, "");
  const applyUrl = `${base}/apply/${plan.apiToken}`;

  const header = [
    `# Plano de Aplicação — ${plan.title}`,
    "",
    "> Pacote gerado pelo Elevate QA. Entregue este arquivo à sua ferramenta de IA",
    "> de desenvolvimento (Claude Code, Windsurf, Codex, Cursor...) e peça para",
    "> ela aplicar as mudanças abaixo no projeto.",
    "",
    "## Instruções para a IA (leia primeiro)",
    "",
    "Você é responsável por aplicar as mudanças listadas abaixo no código deste projeto.",
    "",
    "REGRAS:",
    "1. Aplique UMA mudança por vez, na ordem apresentada (estão priorizadas por severidade).",
    "2. Após aplicar e verificar cada mudança, marque o item como FEITO executando o comando `curl` indicado no próprio item. Isso atualiza o checklist do usuário em tempo real — não pule este passo.",
    "3. Se uma mudança não se aplicar a este projeto (arquivo não existe, decisão fora do código, etc.), explique o motivo ao usuário e NÃO marque como feito.",
    "4. Os caminhos de arquivo são sugestões heurísticas — confirme a estrutura real do projeto antes de editar.",
    "",
    `Para consultar o estado atual do checklist a qualquer momento:`,
    "",
    "```bash",
    `curl -s ${applyUrl}`,
    "```",
    "",
    plan.result?.summary ? `## Resumo\n\n${plan.result.summary}\n` : "",
    `## Mudanças a aplicar (${items.length})`,
    "",
  ].join("\n");

  const body = items
    .map((it, idx) => {
      const status = it.status === "done" ? "✅ FEITO" : "⬜ PENDENTE";
      return [
        `### ${idx + 1}. ${it.title}`,
        "",
        `- **Status atual:** ${status}`,
        `- **Item ID:** \`${it.id}\``,
        `- **Categoria:** ${it.category} · **Severidade:** ${it.severity}`,
        it.filePath ? `- **Arquivo sugerido:** \`${it.filePath}\`` : "",
        "",
        `**O que mudar:** ${it.description}`,
        "",
        `**Como aplicar:** ${it.howTo}`,
        "",
        "**Após aplicar, marque como feito:**",
        "",
        "```bash",
        `curl -s -X PATCH ${applyUrl}/items/${it.id} \\`,
        `  -H "Content-Type: application/json" \\`,
        `  -d '{"status":"done"}'`,
        "```",
        "",
      ]
        .filter((line) => line !== "")
        .join("\n");
    })
    .join("\n---\n\n");

  const footer = [
    "",
    "---",
    "",
    "_Checklist sincronizado com o Elevate QA — o usuário acompanha o progresso em tempo real na seção Aplicação._",
    "",
  ].join("\n");

  return header + body + footer;
}
