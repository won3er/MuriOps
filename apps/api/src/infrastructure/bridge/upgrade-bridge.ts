import type { UpgradePlan } from "@qa-ai/shared";

/**
 * Ponte universal da Atualização: gera um "pacote de instruções" em Markdown
 * que o usuário entrega a QUALQUER ferramenta de IA de desenvolvimento
 * (Claude Code, Windsurf, Codex, Cursor...) para aplicar as atualizações de
 * dependência com segurança — mesma mecânica da ponte da Aplicação.
 */
export function buildUpgradeBridgeMarkdown(
  plan: UpgradePlan,
  apiBaseUrl: string,
): string {
  const items = plan.result?.items ?? [];
  const order = plan.result?.recommendedOrder ?? items.map((i) => i.id);
  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered = order.map((id) => byId.get(id)).filter((i): i is (typeof items)[number] => !!i);

  const base = apiBaseUrl.replace(/\/+$/, "");
  const applyUrl = `${base}/apply-upgrade/${plan.apiToken}`;

  const header = [
    `# Plano de Atualização — ${plan.title}`,
    "",
    "> Pacote gerado pelo MuriOps. Entregue este arquivo à sua ferramenta de IA",
    "> de desenvolvimento (Claude Code, Windsurf, Codex, Cursor...) e peça para",
    "> ela atualizar as dependências abaixo no projeto, na ordem indicada.",
    "",
    "## Instruções para a IA (leia primeiro)",
    "",
    "Você é responsável por migrar as dependências listadas abaixo neste projeto.",
    "",
    "REGRAS:",
    "1. Siga a ORDEM apresentada — está priorizada do menor pro maior risco.",
    "2. Antes de subir uma dependência, leia as breaking changes listadas e revise o código que a usa.",
    "3. Depois de atualizar, rodar e validar (build/testes) cada dependência, marque o item como FEITO executando o comando `curl` indicado. Isso atualiza o checklist do usuário em tempo real — não pule este passo.",
    "4. Se uma dependência não puder ser atualizada agora (conflito, falta de tempo/teste), explique o motivo ao usuário e NÃO marque como feita.",
    "5. Versões-alvo são recomendações — confirme a versão mais recente estável antes de instalar.",
    "",
    "Para consultar o estado atual do checklist a qualquer momento:",
    "",
    "```bash",
    `curl -s ${applyUrl}`,
    "```",
    "",
    plan.result
      ? `## Resumo\n\n${plan.result.summary}\n\n**Risco geral:** ${plan.result.overallRisk}\n`
      : "",
    `## Dependências a atualizar, em ordem (${ordered.length})`,
    "",
  ].join("\n");

  const body = ordered
    .map((it, idx) => {
      const status = it.status === "done" ? "✅ FEITO" : "⬜ PENDENTE";
      return [
        `### ${idx + 1}. ${it.packageName} — ${it.currentVersion} → ${it.targetVersion}`,
        "",
        `- **Status atual:** ${status}`,
        `- **Item ID:** \`${it.id}\``,
        `- **Risco:** ${it.riskLevel}`,
        it.filePath ? `- **Arquivo:** \`${it.filePath}\`` : "",
        "",
        it.breakingChanges.length > 0
          ? `**Breaking changes:**\n${it.breakingChanges.map((bc) => `- ${bc}`).join("\n")}`
          : "**Breaking changes:** nenhuma conhecida.",
        "",
        `**Como migrar:** ${it.migrationSteps}`,
        "",
        "**Após validar, marque como feito:**",
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
    "_Checklist sincronizado com o MuriOps — o usuário acompanha o progresso em tempo real na seção Atualizar._",
    "",
  ].join("\n");

  return header + body + footer;
}
