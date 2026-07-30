# MuriOps — contexto do projeto

SaaS de análise de QA para sites: crawler + Playwright analisa UI/UX, performance,
SEO, acessibilidade, segurança, console/network — com IA (Codex/Gemini/OpenAI)
interpretando os achados e gerando plano de correção aplicável, com a opção de
aplicar de verdade na plataforma real do cliente ou automatizar o ciclo inteiro.

## Stack

- Monorepo pnpm: `apps/api` (Fastify + Prisma + Playwright), `apps/web` (Next.js 14
  App Router), `packages/shared` (tipos/DTOs compartilhados).
- Deploy: frontend na Vercel (`elevate-qa.vercel.app`), backend no Render free tier
  (`elevate-qa-api.onrender.com`, service id `srv-d9h4t04m0tmc73brc24g`).
- Sem git push direto disponível em alguns ambientes de agente — nesses casos, commits
  foram feitos via upload manual pelo GitHub web UI (won3er/Elevate-QA). Local
  (terminal do usuário) normalmente tem `git push` funcionando — prefira
  commit/push direto guiando o usuário pelo terminal dele.

## Estado atual (27/07/2026) — arquitetura das funcionalidades

1. **Projetos** (`/projects`) — dashboard/admin puro: cadastrar/apagar projetos,
   ver métricas (análises rodadas, última pontuação, última análise). NÃO roda
   análise nem tem conexões — só atalhos pra "Análise", "Aplicação" e "Orquestração".
2. **Análise** (`/analyses`) — hub próprio (não fica mais dentro de Projetos): roda e
   lista "Análise QA padrão" e "Análise de Segurança" de qualquer projeto, com botão
   "Enviar para Aplicação" quando concluída.
3. **Projetar** (`/blueprints`) — descreve um projeto, IA gera arquitetura, stack,
   estratégia de teste, riscos, quality gates, roadmap. Botão "Enviar para Aplicação".
4. **Aplicação** (`/aplicacao`) — o executor final de tudo que Análise/Projetar/
   Atualizar produzem. Duas responsabilidades:
   - Exporta análises/blueprints num plano de remediação (checklist), aplicável via
     documento PDF, "ponte universal" (`GET /apply/:token`, `PATCH
/apply/:token/items/:itemId` — qualquer IA de dev como Codex/Cursor/
     Windsurf lê e marca itens via `curl`, tela atualiza em tempo real por polling),
     ou MCP (servidor MCP por projeto, mesmas ações via protocolo).
   - **Conexões e integrações** (movidas de Projetos pra cá): GitHub e MCP. GitHub
     registra checklists em pull requests; MCP permite que uma ferramenta de
     desenvolvimento consulte e sincronize o plano. Adaptadores WordPress, Shopify,
     FTP e Nuvemshop foram removidos.
5. **Orquestração** (`/orquestracao`, seção própria no menu — não é mais aba dentro
   de Aplicação) — automatiza o ciclo analisar → avaliar quality gates → gerar plano
   → aplicar → reanalisar. Depende de Análise (pra analisar/reanalisar) e de
   Aplicação (usa as conexões de lá pra aplicar) — não tem lógica própria de apply.
   Os níveis Manual, Supervisionado e Autônomo usam a mesma regra de segurança:
   sem uma conexão push, a execução espera aplicação externa e só retoma quando os
   itens forem marcados como feitos.
   Ao criar uma execução dá pra escolher qual conexão usar: com adapter _push_
   (GitHub/WordPress/Shopify/Nuvemshop/FTP) ela aplica sozinha a cada iteração; sem
   conexão ou com MCP, quem aplica é a IA de dev do próprio usuário (ex.: Codex Pro
   via Codex conectado por MCP — sem precisar de API key nenhuma do Elevate
   QA), e a execução retoma sozinha quando todos os itens do plano forem marcados
   como feitos (`maybeAutoResumeFromPlan` em `orchestration.service.ts`).
6. **Atualizar** (`/atualizar`) — cola um `package.json`, IA gera plano de upgrade de
   dependências. Botão **"Enviar para Aplicação"** manda o plano pronto pra Aplicação
   (`RemediationSourceType.UPGRADE` — os itens do upgrade já vêm prontos, sem nova
   chamada de IA, só mapeados pro formato de `RemediationItem`). Mantém também seu
   fluxo de aplicação próprio e separado (PDF + ponte própria `/apply-upgrade/:token`)
   como caminho alternativo, já que os dois convivem sem conflito.

Identidade visual: plataforma técnica inspirada na densidade e clareza do GitHub/
Primer, com superfícies neutras e índigo como acento. Mascote: rato preto em
negativo dentro de selo circular branco
(`apps/web/public/atlas-rat-logo-negative-512.png`).
Componentes em `apps/web/src/components/logo.tsx`.

## Provider de IA (`apps/api/src/infrastructure/ai/`)

- **Sem chave padrão do servidor.** Cada organização cola a própria chave (Codex,
  OpenAI ou Gemini) em `/settings`, criptografada no banco
  (`Organization.aiApiKeyEncrypted`). Sem chave própria configurada, `createAiProvider`/
  `createAiProviderFor` degradam pro `NoopProvider` (resultado determinístico, sem IA
  de verdade) — nunca existe fallback silencioso pra uma chave compartilhada. As
  variáveis `CLAUDE_MODEL`/`OPENAI_MODEL`/`GEMINI_MODEL` no `.env` só configuram o
  _nome do modelo_, nunca um segredo.
- **Gemini** (`gemini-provider.ts`): não fixa nome de modelo. Chama `ListModels` da
  própria API do Google pra descobrir o que a chave enxerga, escolhe o melhor
  (`gemini-flash-latest` > `gemini-2.5-flash` > outros), cacheia em memória por
  chave, e se um modelo passar a dar 404 "no longer available" tenta o próximo da
  lista automaticamente.

## Fases do projeto (ordem combinada com o usuário em 27/07/2026)

O trabalho segue estas 4 fases, nesta ordem — não pular pra fase seguinte com a
anterior incompleta:

1. **Construir** — implementar as funcionalidades e integrações que faltam.
2. **Testar e fazer funcionar** — validar de ponta a ponta com dados/contas reais,
   corrigir o que quebrar. **Fase atual — estamos aqui.**
3. **Enxugar** — corrigir bugs remanescentes, gargalos de performance, revisão de
   segurança, e ajustar arquitetura onde estiver errada/gambiarra.
4. **Design geral** — só no final, com tudo funcionando e estável, revisar/polir a
   aparência do site e do app como um todo.

## Pendências conhecidas / próximos passos

1. **[Fase 2] Testar de ponta a ponta o que foi construído recentemente** —
   rodar um ciclo completo de Orquestração com GitHub (incl. retorno por MCP/ponte
   com retomada automática); validar o fluxo "Atualizar → Enviar
   para Aplicação"; testar o login com Google de ponta a ponta assim que o
   usuário configurar o Client ID. **Próximo item a atacar.**
2. **[Fase 2] Configurar Google OAuth em produção** — usuário precisa criar o
   Client ID no Google Cloud Console e colar em `GOOGLE_CLIENT_ID` (Render) e
   `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Vercel). Sem isso o botão "Entrar com Google"
   fica invisível (degrada bem, não quebra nada).
3. **[Confirmado em 30/07/2026] Migrations em produção** — o `CMD` do Dockerfile
   executa `prisma migrate deploy` antes de iniciar a API; novas migrations são
   aplicadas a cada deploy do Render.
4. **[Fora de escopo] Plataformas de publicação direta** — WordPress, Shopify, FTP,
   Nuvemshop, Wix, Squarespace e Webnode não fazem parte da integração atual.
   Só retomar se o usuário pedir explicitamente.
5. **Sandbox sem `git push`** — em ambientes de agente sem credencial de push, use
   o upload manual pela interface web do GitHub (arquivo por arquivo/pasta) em
   `github.com/won3er/Elevate-QA/upload/main/<caminho>`.
6. **[Removidos em 30/07/2026] Adapters de plataforma** — WordPress, Shopify e FTP
   foram removidos por decisão de produto; a migration
   `20260730010000_remove_platform_adapters` apaga conexões e credenciais
   existentes. Valores históricos permanecem no enum PostgreSQL por compatibilidade.
   Nuvemshop também havia sido removido. Valores legados de enum permanecem no
   PostgreSQL por compatibilidade, mas nenhum adapter, rota ou componente desses
   serviços continua ativo.

## Convenções

- Copy em pt-BR em toda a UI.
- Análises: "Análise QA padrão" e "Análise de Segurança" são os nomes corretos
  (não "auditoria de segurança" isolado, exceto internamente no código).
- Toda tela de erro de IA deve mostrar mensagem amigável + "Detalhe técnico"
  recolhível com o erro cru, não o JSON exposto direto.
- "Enviar para Aplicação" é o rótulo padrão pra qualquer botão que gera um
  `RemediationPlan` a partir de Análise/Projetar (não "Gerar Aplicação" nem só
  "Aplicação" sozinho — evita confundir a ação com o nome da funcionalidade).
