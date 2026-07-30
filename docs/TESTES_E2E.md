# Registro de testes de produção — MuriOps

Atualizado em 30/07/2026.

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
| MCP | Aprovado | Conexão criada e endpoint HTTP validado com `initialize`, `tools/list`, `list_remediation_items` e `mark_item_done`. Um item do plano do laboratório foi marcado como concluído e restaurado para pendente via protocolo MCP. |
| Atualizações via GitHub | Aprovado | Leitura do repositório encontrou 1 `package.json`, reconheceu Node.js e gerou um plano de baixo risco. O envio “Atualizar → Aplicação” também criou o checklist de dependência corretamente. |
| Integridade do resumo de IA | Corrigido e verificado localmente | Quando não houver achados válidos, o sistema agora usa uma conclusão determinística; a IA não pode apresentar notas ou riscos que não existam na coleta. |

## Validação em workspace criado por Google Login (30/07/2026)

Foi criado um workspace novo por login Google e um novo projeto `MuriOps E2E Lab`, apontando para o mesmo laboratório público. Esse recorte confirma que os fluxos não dependem dos dados nem das conexões do workspace de demonstração.

| Fluxo | Situação | Evidência |
| --- | --- | --- |
| Login Google | Aprovado | O usuário concluiu a autenticação e recebeu um workspace isolado. |
| Análise QA padrão | Aprovado | 1 página, score 99 e 7 achados técnicos coerentes; plano enviado para Aplicação. |
| Análise de Segurança | Aprovado | 1 página, score 99 e 6 achados de infraestrutura coerentes; plano enviado para Aplicação. |
| Conexão MCP | Aprovado | Conexão criada por projeto, com URL própria e controles de cópia, rotação e revogação. |
| Projetar → Aplicação | Aprovado | Blueprint gerado e convertido em plano com briefing para desenvolvimento. Sem chave de IA, a interface identifica corretamente o modo-base `noop` e não inventa recomendações específicas. |
| Atualizar → Aplicação | Aprovado | Manifesto Node.js com `next`, `react` e `typescript` reconhecido; plano de atualização e checklist de Aplicação criados. Sem chave de IA, a interface preserva a necessidade de verificação manual. |
| Orquestração Manual | Aprovado | Usou a análise existente, avaliou o conjunto vazio de quality gates e persistiu o estado final “Passou nos quality gates”. |

### Pendência externa desse workspace

- A conexão GitHub é deliberadamente isolada por organização. Para testar investigação de repositório e abertura de pull request neste novo workspace, é necessário cadastrar aqui um PAT fine-grained com acesso ao repositório de laboratório. O token anterior do workspace de demonstração não é herdado nem exibido.

## Limites confirmados

- O GitHub cria branch, checklist e pull request; não altera código de produto nem faz merge automático.
- O teste usa somente o repositório e o site públicos de laboratório.
- Cabeçalhos HTTP que o GitHub Pages não permite configurar nativamente permanecem apontamentos de infraestrutura, não correções aplicáveis diretamente pelo repositório.
- O gate temporário `Teste controlado de integração` (100) foi removido ao final do teste; o projeto de laboratório voltou a não ter gates configurados.
- WordPress, Shopify e FTP foram removidos do produto. A migration correspondente elimina conexões e credenciais antigas desses adaptadores; GitHub e MCP permanecem como as únicas integrações de aplicação.

## Verificação local

- `pnpm -r typecheck`: aprovado.
- `pnpm -r build`: aprovado para API, web e tipos compartilhados.
- `pnpm -r lint`: não executou por falta de `eslint` nas dependências de desenvolvimento da API. Isso é uma pendência de infraestrutura de qualidade, não um erro de compilação.
- Login Google: Client ID configurado na Vercel e no Render; origens `https://muriops.com.br` e `https://www.muriops.com.br` autorizadas no Google Cloud. Em 30/07/2026, corrigida a política `Cross-Origin-Opener-Policy` para `same-origin-allow-popups`, necessária para o popup devolver o ID token ao site. O teste final requer que a própria pessoa aceite os termos e conclua a seleção da conta.
