# Elevate QA — contexto do projeto

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
   - **Conexões e integrações** (movidas de Projetos pra cá): MCP, GitHub, e os
     adapters de plataforma que aplicam de verdade fora do repo — WordPress, Shopify
     (via API oficial de cada um) e FTP (Hostinger/Hostgator/qualquer host com acesso
     a arquivo). Ver `apps/api/src/infrastructure/adapters/`. Nuvemshop foi removido
     em 28/07/2026 (ver pendência abaixo).
5. **Orquestração** (`/orquestracao`, seção própria no menu — não é mais aba dentro
   de Aplicação) — automatiza o ciclo analisar → avaliar quality gates → gerar plano
   → aplicar → reanalisar. Depende de Análise (pra analisar/reanalisar) e de
   Aplicação (usa as conexões de lá pra aplicar) — não tem lógica própria de apply.
   Autonomia MANUAL é a única implementada (Supervisionado/Autônomo ainda faltam).
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
   conectar um projeto real no WordPress/Shopify/FTP e confirmar que a
   aplicação automática funciona; rodar um ciclo completo de Orquestração (incl.
   via MCP/ponte com retomada automática); validar o fluxo "Atualizar → Enviar
   para Aplicação"; testar o login com Google de ponta a ponta assim que o
   usuário configurar o Client ID. **Próximo item a atacar.**
2. **[Fase 2] Configurar Google OAuth em produção** — usuário precisa criar o
   Client ID no Google Cloud Console e colar em `GOOGLE_CLIENT_ID` (Render) e
   `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Vercel). Sem isso o botão "Entrar com Google"
   fica invisível (degrada bem, não quebra nada).
3. **[Fase 2] Confirmar migrations em produção** — o Render precisa rodar
   `prisma migrate deploy` a cada deploy pra aplicar as migrations novas
   (UPGRADE em RemediationSourceType, googleId/senha opcional em User). Confirmar
   se isso já está automatizado no build command do Render.
4. **[Fase 3/4, adiado a pedido do usuário] Wix, Squarespace, Webnode** — ficaram
   de fora dos adapters de plataforma (sem API pra aplicar mudança de verdade).
   Só retomar quando o usuário pedir explicitamente ("me lembre depois").
5. **Sandbox sem `git push`** — em ambientes de agente sem credencial de push, use
   o upload manual pela interface web do GitHub (arquivo por arquivo/pasta) em
   `github.com/won3er/Elevate-QA/upload/main/<caminho>`.
6. **[Removido em 28/07/2026] Adapter Nuvemshop** — a loja de teste real
   (`qateste.lojavirtualnuvem.com.br`) estourava consistentemente os 512MB do
   Render free tier no crawl, mesmo após 3 rodadas de otimização de memória
   (flags do Chromium, fechamento progressivo de páginas, bloqueio de
   trackers/mídia/fontes). Suporte a Nuvemshop foi removido do produto —
   `NuvemshopAdapter` (arquivo esvaziado, sandbox não permitiu apagar
   fisicamente — rode `git rm -r apps/api/src/infrastructure/adapters/nuvemshop`
   no seu terminal), rotas, hooks, painel de conexão, enum `AdapterKind` e
   menções em docs. O valor `NUVEMSHOP` continua existindo no enum do Postgres
   (não dá pra remover valor de enum sem recriar o tipo) mas não é mais
   referenciado em nenhum lugar do código — inofensivo. WordPress/Shopify/FTP
   continuam disponíveis normalmente.

## Convenções

- Copy em pt-BR em toda a UI.
- Análises: "Análise QA padrão" e "Análise de Segurança" são os nomes corretos
  (não "auditoria de segurança" isolado, exceto internamente no código).
- Toda tela de erro de IA deve mostrar mensagem amigável + "Detalhe técnico"
  recolhível com o erro cru, não o JSON exposto direto.
- "Enviar para Aplicação" é o rótulo padrão pra qualquer botão que gera um
  `RemediationPlan` a partir de Análise/Projetar (não "Gerar Aplicação" nem só
  "Aplicação" sozinho — evita confundir a ação com o nome da funcionalidade).
