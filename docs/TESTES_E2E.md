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
| Análise de Segurança | Aprovado com ressalva de infraestrutura | O laboratório estático foi percorrido. Em uma execução, os alertas de DNS e headers foram descartados pela revisão contextual; em outra, a revisão de IA ficou indisponível e os 10 achados brutos foram preservados com aviso explícito. Isso evita apresentar uma conclusão inventada. Cabeçalhos e DNS de `github.io` não são corrigíveis pelo repositório do laboratório. |
| Análise → Aplicação | Aprovado | Plano de aplicação gerado com 7 itens para a análise QA v2. |
| Projetar → Aplicação | Aprovado | Um blueprint técnico do laboratório foi gerado e convertido em checklist de 9 itens, com briefing para desenvolvimento sem publicação ou merge automático. |
| Conexão GitHub | Aprovado | Token fine-grained restrito ao laboratório, com `Contents` e `Pull requests` em leitura/escrita; conexão validada e salva no MuriOps. |
| Orquestração com GitHub | Aprovado | A primeira tentativa parou corretamente sem análise no projeto. Depois da análise QA v1 (99/100), o gate controlado de 100 gerou plano e abriu três pull requests de checklist no repositório de laboratório, sem merge automático. A execução ficou em “Aguardando aprovação”, como previsto para modo Manual, e foi cancelada ao fim do teste. |
| MCP | Parcialmente aprovado | Conexão criada e endpoint HTTP validado com `initialize` e `tools/list` (ambos 200). A marcação de item por ferramenta externa ainda precisa ser validada num cliente MCP real. |
| Atualizações via GitHub | Aprovado | Leitura do repositório encontrou 1 `package.json`, reconheceu Node.js e gerou um plano de baixo risco. O envio “Atualizar → Aplicação” também criou o checklist de dependência corretamente. |
| Integridade do resumo de IA | Corrigido e verificado localmente | Quando não houver achados válidos, o sistema agora usa uma conclusão determinística; a IA não pode apresentar notas ou riscos que não existam na coleta. |

## Limites confirmados

- O GitHub cria branch, checklist e pull request; não altera código de produto nem faz merge automático.
- O teste usa somente o repositório e o site públicos de laboratório.
- Cabeçalhos HTTP que o GitHub Pages não permite configurar nativamente permanecem apontamentos de infraestrutura, não correções aplicáveis diretamente pelo repositório.
- O gate temporário `Teste controlado de integração` (100) foi removido ao final do teste; o projeto de laboratório voltou a não ter gates configurados.

## Verificação local

- `pnpm -r typecheck`: aprovado.
- `pnpm -r build`: aprovado para API, web e tipos compartilhados.
- `pnpm -r lint`: não executou por falta de `eslint` nas dependências de desenvolvimento da API. Isso é uma pendência de infraestrutura de qualidade, não um erro de compilação.
