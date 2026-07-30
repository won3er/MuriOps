# Registro de testes de produção — MuriOps

Atualizado em 29/07/2026.

## Ambiente controlado

- Repositório público de teste: `won3er/muriops-e2e-lab`.
- Site de teste: `https://won3er.github.io/muriops-e2e-lab/`.
- Projeto no workspace: `Laboratório MuriOps E2E`.

## Resultados

| Fluxo | Situação | Evidência / próximo passo |
| --- | --- | --- |
| Análise QA padrão | Aprovado | O crawler identificou a referência de CSS incorreta; após a correção no repositório, a análise seguinte não registrou erros de console/rede. |
| Análise → Aplicação | Aprovado | Plano de aplicação gerado com 7 itens para a análise QA v2. |
| Conexão GitHub | Aprovado | Token fine-grained restrito ao laboratório, com `Contents` e `Pull requests` em leitura/escrita; conexão validada e salva no MuriOps. |
| Orquestração com GitHub | Aprovado | A primeira tentativa parou corretamente sem análise no projeto. Depois da análise QA v1 (99/100), o gate controlado de 100 gerou plano e abriu três pull requests de checklist no repositório de laboratório, sem merge automático. A execução ficou em “Aguardando aprovação”, como previsto para modo Manual. |
| MCP | Parcialmente aprovado | Conexão criada e endpoint HTTP validado com `initialize` e `tools/list` (ambos 200). A marcação de item por ferramenta externa ainda precisa ser validada num cliente MCP real. |
| Atualizações via GitHub | Aprovado | Leitura do repositório encontrou 1 `package.json`, reconheceu Node.js e gerou um plano de baixo risco. O envio “Atualizar → Aplicação” também criou o checklist de dependência corretamente. |

## Limites confirmados

- O GitHub cria branch, checklist e pull request; não altera código de produto nem faz merge automático.
- O teste usa somente o repositório e o site públicos de laboratório.
- Cabeçalhos HTTP que o GitHub Pages não permite configurar nativamente permanecem apontamentos de infraestrutura, não correções aplicáveis diretamente pelo repositório.
- O teste de orquestração adicionou o gate `Teste controlado de integração` (100) ao projeto de laboratório; ele deve ser removido ou ajustado antes de reutilizar esse projeto fora do teste.

## Verificação local

- `pnpm -r typecheck`: aprovado.
- `pnpm -r build`: aprovado para API, web e tipos compartilhados.
- `pnpm -r lint`: não executou por falta de `eslint` nas dependências de desenvolvimento da API. Isso é uma pendência de infraestrutura de qualidade, não um erro de compilação.
