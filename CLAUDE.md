# Elevate QA — contexto do projeto

SaaS de análise de QA para sites: crawler + Playwright analisa UI/UX, performance,
SEO, acessibilidade, segurança, console/network — com IA (Claude/Gemini/OpenAI)
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
  **28/07/2026, testado no Cowork:** `git add`/`git commit` funcionam via bash nesse
  ambiente (o mount bloqueia `unlink` a nível baixo — quando `.git/index.lock` ou
  `.git/HEAD.lock` sobra de uma operação anterior e trava tudo com "Unable to create
  index.lock: File exists", o fix é `mv .git/index.lock .git/index.lock.bak` — mover
  funciona mesmo quando remover não funciona — e repetir o comando git). **`git push`
  continua sem funcionar** — sem credencial/token/SSH key configurados nesse sandbox
  (`fatal: could not read Username for 'https://github.com'`, sem `gh` CLI, sem chave em
  `~/.ssh`, DNS direto pro github.com falha sem o proxy). Os commits feitos por aqui
  ficam salvos localmente no mesmo repo que o usuário usa no Windows (é a mesma pasta
  montada) — bastam ele rodar `git push` no terminal dele quando acordar pra subir tudo
  de uma vez. Sempre usar `git add <arquivos específicos>`, nunca `git add -A`/`.`,
  porque o working tree costuma ter mudanças de design em andamento (GPT, ver nota
  abaixo) que não devem ser commitadas por engano.
- **Trabalho de design em paralelo (28/07/2026 em diante):** o usuário usa uma
  ferramenta baseada em GPT, separada deste agente, para editar a aparência geral do
  app (cores, layout, componentes visuais, rebrand de logo, etc.). Esse trabalho pode
  aparecer como mudanças não commitadas em `apps/web` a qualquer momento. Este agente
  não deve editar, reverter, "corrigir" ou commitar essas mudanças — trabalha só em
  funcionalidade/backend/operações. Se precisar mexer em algum arquivo de `apps/web`
  por motivo funcional (não visual), commitar só esse arquivo específico, nunca em
  lote com o resto do working tree.

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
     /apply/:token/items/:itemId` — qualquer IA de dev como Claude Code/Cursor/
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
   Ao criar uma execução dá pra escolher qual conexão usar: com adapter *push*
   (GitHub/WordPress/Shopify/FTP) ela aplica sozinha a cada iteração; sem
   conexão ou com MCP, quem aplica é a IA de dev do próprio usuário (ex.: Claude Pro
   via Claude Code conectado por MCP — sem precisar de API key nenhuma do Elevate
   QA), e a execução retoma sozinha quando todos os itens do plano forem marcados
   como feitos (`maybeAutoResumeFromPlan` em `orchestration.service.ts`).
   **Reanálise (corrigido em 28/07/2026):** a iteração 1 aproveita a análise mais
   recente do projeto; da 2ª em diante o `advance()` dispara uma *análise nova*
   (mesmas categorias/profundidade da anterior, via `analysisService.start` +
   `waitForAnalysisCompleted`). Antes ele reusava a última análise concluída em
   toda iteração — o ciclo nunca reanalisava de fato e gerava planos duplicados
   sobre dados velhos.
6. **Atualizar** (`/atualizar`) — cola um `package.json`, IA gera plano de upgrade de
   dependências. Botão **"Enviar para Aplicação"** manda o plano pronto pra Aplicação
   (`RemediationSourceType.UPGRADE` — os itens do upgrade já vêm prontos, sem nova
   chamada de IA, só mapeados pro formato de `RemediationItem`). Mantém também seu
   fluxo de aplicação próprio e separado (PDF + ponte própria `/apply-upgrade/:token`)
   como caminho alternativo, já que os dois convivem sem conflito.

Identidade visual: laranja, isotipo (monograma "E" em barras — letra + gráfico de
elevação); mascote texugo (`apps/web/public/badger-logo-512.png`). Componentes em
`apps/web/src/components/logo.tsx`.

## Provider de IA (`apps/api/src/infrastructure/ai/`)

- **Sem chave padrão do servidor.** Cada organização cola a própria chave (Claude,
  OpenAI ou Gemini) em `/settings`, criptografada no banco
  (`Organization.aiApiKeyEncrypted`). Sem chave própria configurada, `createAiProvider`/
  `createAiProviderFor` degradam pro `NoopProvider` (resultado determinístico, sem IA
  de verdade) — nunca existe fallback silencioso pra uma chave compartilhada. As
  variáveis `CLAUDE_MODEL`/`OPENAI_MODEL`/`GEMINI_MODEL` no `.env` só configuram o
  *nome do modelo*, nunca um segredo.
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
   ✅ *Feito em 28/07/2026:* ciclo completo de Orquestração validado ao vivo
   (gate falhando → plano gerado → itens marcados pela ponte → retomada
   automática → **reanálise real** na iteração seguinte); fluxo "Atualizar →
   Enviar para Aplicação" validado (plano de upgrade vira `RemediationPlan`
   sem nova chamada de IA); ponte universal (`GET /apply/:token` + `PATCH
   .../items/:id`) validada. **Falta ainda:** conectar um projeto real no
   WordPress/Shopify/FTP e confirmar a aplicação automática *push* (precisa
   de credenciais reais do usuário); testar o login com Google no navegador
   agora que o Client ID foi configurado (item 2 abaixo — deploy disparado,
   falta confirmar visualmente o botão + fluxo completo).
2. **[Fase 2] Configurar Google OAuth em produção** — ✅ *Feito em 28/07/2026
   (Cowork, guiado passo a passo com o usuário):* Client ID OAuth criado no
   Google Cloud Console (projeto `mystical-banner-424318-g1`, tipo "App da
   Web", origem JS autorizada `https://elevate-qa.vercel.app`), salvo como
   `GOOGLE_CLIENT_ID` no Render e `NEXT_PUBLIC_GOOGLE_CLIENT_ID` na Vercel,
   ambos os serviços redeployados. **Falta:** confirmar visualmente no
   navegador que o botão "Entrar com Google" aparece e completa o login.
3. **[Fase 2] Confirmar migrations em produção** — ✅ *Confirmado em
   28/07/2026:* `apps/api/Dockerfile` já roda `pnpm exec prisma migrate
   deploy` no `CMD`, antes de `node dist/main.js`, toda vez que o container
   sobe — automatizado, sem ação necessária.
4. **[Fase 3/4, adiado a pedido do usuário] Wix, Squarespace, Webnode** — ficaram
   de fora dos adapters de plataforma (sem API pra aplicar mudança de verdade).
   Só retomar quando o usuário pedir explicitamente ("me lembre depois").
5. **Sandbox sem `git push`** — em ambientes de agente sem credencial de push, use
   o upload manual pela interface web do GitHub (arquivo por arquivo/pasta) em
   `github.com/won3er/Elevate-QA/upload/main/<caminho>`. **28/07/2026, corrigido:**
   no Cowork `git add`/`git commit` funcionam (ver nota na seção Stack sobre o
   workaround de lock file e `git add` seletivo), **mas `git push` continua sem
   funcionar** — sem credencial configurada nesse sandbox. Os commits ficam prontos
   localmente esperando o usuário rodar `git push` no terminal dele.
6. **[Fase 3] Revisão de bugs/segurança (Enxugar) — sessão autônoma 28/07/2026 à
   noite:** revisão de código (sem reprodução ao vivo — sandbox sem `tsc`
   funcional, ver nota na seção Stack) encontrou e corrigiu 5 bugs reais,
   todos commitados localmente (faltando só `git push` do usuário):
   - Duas condições de corrida na Orquestração (`enqueueOrchestrationRun` sem
     dedupe por runId; `approve`/`onObservation`/`maybeAutoResumeFromPlan`
     com `update()` incondicional em vez de `updateMany()` guardado por
     status) — dois triggers quase simultâneos podiam processar o mesmo run
     em paralelo e gerar planos duplicados.
   - `wordpress-adapter.ts`/`shopify-adapter.ts` não escapavam HTML dos
     campos do `RemediationItem` ao criar a página de rascunho no site real
     do cliente — um achado de Análise de Segurança citando um payload tipo
     `<script>` reintroduzia esse XSS na página publicada. Corrigido com
     `escapeHtml()`.
   - `mcp-server.ts`: um `planId` explícito nos tools MCP não validava que o
     plano pertencia ao projeto da conexão — permitia ler/marcar itens de
     Aplicações de outros projetos da mesma organização. Corrigido validando
     `plan.projectId === scope.projectId`.
   - `auth.service.ts`: `loginWithGoogle` vinculava a conta por e-mail sem
     zerar a senha existente — como o cadastro comum não verifica
     propriedade do e-mail, alguém podia pré-cadastrar o e-mail de outra
     pessoa com senha própria e reter acesso permanente à conta depois do
     dono de verdade vincular o Google (sem fluxo de "esqueci a senha" pra
     revogar). Corrigido zerando a senha no vínculo.
   Revisados sem bug: `app.ts`, `remediation-bridge.ts`, rotas da ponte
   universal, `remediation.service.ts` (parcial), `secret-box.ts`,
   `webhooks.routes.ts`, `ftp-adapter.ts`, `github-adapter.ts`, `index.ts`
   dos adapters, `manual-bridge.adapter.ts`, `adapter-connection.service.ts`,
   `settings.routes.ts`, `upgrade.service.ts`, `project.service.ts`.
   **Achado, mas NÃO corrigido (precisa de decisão/teste, não é fix
   trivial):** `project.service.ts` → `normalizeUrl()` não valida a URL do
   projeto contra IPs internos/privados (`localhost`, `127.0.0.1`,
   `169.254.169.254` metadata de nuvem, `10.x`/`192.168.x`) antes do crawler
   (Playwright) acessá-la de verdade no servidor — SSRF clássico: alguém
   pode cadastrar um projeto apontando pra rede interna do Render e ver o
   conteúdo retornado no relatório de análise. Não tentei corrigir essa
   madrugada porque um filtro correto precisa resolver DNS, checar faixas de
   IP e cobrir redirects durante o crawl (não só a URL inicial) — um fix
   apressado sem poder testar o crawler de ponta a ponta arriscava quebrar
   análises legítimas. Fica como próximo item prioritário da Fase 3.
   **Ainda não revisados:** analysis-runner/crawler (o resto — fora do ponto
   de SSRF já achado), blueprint.service.ts, rotas de dashboard. Retomar a
   partir daqui quando continuar a Fase 3.
7. **[Removido em 28/07/2026] Adapter Nuvemshop** — a loja de teste real
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
