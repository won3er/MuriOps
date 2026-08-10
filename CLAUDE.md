# MuriOps — contexto do projeto

SaaS de análise de QA para sites: crawler + Playwright analisa UI/UX, performance,
SEO, acessibilidade, segurança, console/network — com IA (Claude/Gemini/OpenAI)
interpretando os achados e gerando plano de correção aplicável, com a opção de
aplicar de verdade na plataforma real do cliente ou automatizar o ciclo inteiro.

## Convenção de sessão: sempre mandar o `cd` completo

Sempre que eu (o agente) passar um comando pra ele rodar no terminal dele
(`pnpm`, `git`, etc.), preceder com o `cd` completo em formato Windows, ex.:
`cd "C:\Users\woner\Desktop\Atlas QA"`. Não presumir que ele já está na pasta
certa ou com terminal aberto — isso já causou reclamação do usuário
(06/08/2026: "vc sempre se esquece de mandar comando pra eu entrar nas
pasta, como se eu já soubesse ou tivesse o cmd aberto").

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
- **Trabalho de design em paralelo (28/07/2026 a 05/08/2026):** o usuário usava uma
  ferramenta baseada em GPT, separada deste agente, para editar a aparência geral do
  app (cores, layout, componentes visuais, rebrand de logo, etc.). Esse trabalho podia
  aparecer como mudanças não commitadas em `apps/web` a qualquer momento, e este agente
  não editava/revertia/commitava essas mudanças — trabalhava só em
  funcionalidade/backend/operações.
  **05/08/2026, mudança: a assinatura do GPT do usuário acabou.** A partir de agora
  este agente também assume trabalho de design geral/homepage quando pedido
  explicitamente (não é mais um limite automático) — a regra de nunca mexer em
  `apps/web` por motivo visual **não vale mais** enquanto essa ferramenta não for
  retomada. Se o usuário voltar a usar uma ferramenta de design externa no futuro,
  reinstaurar a cautela de commitar só arquivos específicos por motivo funcional.
  Continua valendo, independente disso: sempre usar `git add <arquivos específicos>`,
  nunca `git add -A`/`.`, porque pode haver mudanças em andamento no working tree que
  não devem ser commitadas por engano.
  **10/08/2026, o GPT do usuário voltou.** Ele está usando o GPT de novo pra fazer um
  redesign visual inspirado no Strix. **Reinstaurada a cautela original:** este agente
  volta a não mexer em `apps/web` por motivo puramente visual/de design (cores, layout,
  componentes visuais, rebrand) — só trabalha em funcionalidade/backend/operações,
  igual era antes de 05/08. Mudanças funcionais que tocam JSX (novos botões, estados,
  campos) continuam normais; o limite é especificamente sobre decisões de aparência.
  `git add` continua sempre por arquivo específico, nunca `-A`, porque o working tree
  volta a ter mudanças de design do GPT em andamento a qualquer momento.

## Estado atual (27/07/2026) — arquitetura das funcionalidades

1. **Projetos** (`/projects`) — dashboard/admin puro: cadastrar/apagar projetos,
   ver métricas (análises rodadas, última pontuação, última análise). NÃO roda
   análise nem tem conexões — só atalhos pra "Análise", "Aplicação" e "Orquestração".
2. **Análise** (`/analyses`) — hub próprio (não fica mais dentro de Projetos): roda e
   lista "Análise QA padrão" e "Análise de Segurança" de qualquer projeto, com botão
   "Enviar para Aplicação" quando concluída.
   **Teste Ativo Autorizado (30/07/2026, implementado neste agente, ainda não
   testado ao vivo):** terceira categoria opt-in, `ACTIVE_SECURITY_TEST`
   (`apps/api/src/modules/analysis/analyzers/active-security-test/`). Diferente de
   tudo mais no produto, envia requisições ativas contra o site do projeto: repete
   tentativas de login pra medir rate-limit, compara respostas de duas credenciais
   inválidas pra indício de enumeração de usuário, e manda um punhado curado de
   payloads de detecção (SQLi/XSS/path traversal/template injection — não
   exploração de verdade) contra os formulários que o crawl encontrou, com um
   circuit breaker que aborta se o alvo começar a devolver 5xx em sequência e um
   User-Agent próprio (`MuriOps-SecurityScan/1.0`) identificando o scan nos logs
   do alvo. **Gate de consentimento é o ponto central do design:** a categoria só
   roda se `Project.activeTestingConsent = true`, e o único lugar que grava isso é
   `projectService.updateActiveTestingConsent` (`PATCH
   /projects/:id/active-testing-consent`), acionado pela seção "Teste Ativo
   Autorizado" na página do projeto, que exige o usuário ler e confirmar uma
   declaração de autorização (fica registrado quem e quando). O gate de verdade —
   que não pode ser burlado só editando o request — fica em
   `analysis.service.ts.start()`: se `categories` incluir `ACTIVE_SECURITY_TEST`
   sem o projeto ter consentimento, lança `ConsentRequiredError` (403) antes de
   sequer enfileirar a análise. `DEFAULT_CATEGORIES` exclui essa categoria (e
   `DEEP_SECURITY`) da análise "padrão" — nunca roda sem ser pedida explicitamente
   E consentida. **Pendente de validação:** rodar de verdade contra um site real
   com consentimento marcado pra confirmar que o `discoverForms`/payload probing
   funciona como esperado — só foi revisado por leitura de código, sandbox sem
   `tsc` funcional pra validar tipos (ver nota de sandbox na seção Stack).
3. **Projetar** (`/blueprints`) — descreve um projeto, IA gera arquitetura, stack,
   estratégia de teste, riscos, quality gates, roadmap. Botão "Enviar para Aplicação".
4. **Aplicação** (`/aplicacao`) — o executor final de tudo que Análise/Projetar/
   Atualizar produzem. Duas responsabilidades:
   - Exporta análises/blueprints num plano de remediação (checklist), aplicável via
     documento PDF, "ponte universal" (`GET /apply/:token`, `PATCH
     /apply/:token/items/:itemId` — qualquer IA de dev como Claude Code/Cursor/
     Windsurf lê e marca itens via `curl`, tela atualiza em tempo real por polling),
     ou MCP (servidor MCP por projeto, mesmas ações via protocolo).
   - **Conexões e integrações** (movidas de Projetos pra cá): hoje só existem três
     adapters ativos — **MANUAL_BRIDGE** (checklist por link/`curl`), **MCP**
     (servidor MCP por projeto, IA de dev do próprio usuário aplica) e **GITHUB**
     (push direto no repo). Ver `apps/api/src/infrastructure/adapters/index.ts`
     (`createAdapterFor`) — é o ponto de verdade de quais adapters existem.
     **Correção de doc (30/07/2026):** este arquivo dizia por muito tempo que
     WordPress, Shopify e FTP também estavam disponíveis — não estão mais.
     `apps/api/src/infrastructure/adapters/` só tem `github/`,
     `manual-bridge.adapter.ts` e `index.ts`; não há mais
     `wordpress-adapter.ts`/`shopify-adapter.ts`/`ftp-adapter.ts` no código.
     Não está registrado neste arquivo quando/por quem foram removidos
     (provavelmente numa sessão do GPT/Codex que trabalhou em paralelo) — a
     doc só ficou desatualizada até ser notada pelo usuário nesta sessão.
     `AdapterKind` no schema ainda pode ter os valores antigos no enum do
     Postgres (não dá pra remover valor de enum sem recriar o tipo), mas o
     código não os referencia mais — mesmo caso do NUVEMSHOP (ver item 7 em
     Pendências).
5. **Orquestração** (`/orquestracao`, seção própria no menu — não é mais aba dentro
   de Aplicação) — automatiza o ciclo analisar → avaliar quality gates → gerar plano
   → aplicar → reanalisar. Depende de Análise (pra analisar/reanalisar) e de
   Aplicação (usa as conexões de lá pra aplicar) — não tem lógica própria de apply.
   **Autonomia (implementada em 29/07/2026, commit `5e58760`):** os três
   níveis funcionam e diferem em um ponto só — o que fazer depois de aplicar
   (`decidirProximoPasso` em `orchestration.service.ts`). MANUAL sempre espera
   aprovação; SUPERVISED segue sozinho se a aplicação não teve falha e a nota
   não regrediu (compara com a análise da iteração anterior); AUTONOMOUS segue
   até bater os gates ou o limite. **Trava comum aos três:** só segue sozinho
   com adapter *push* que aplicou algo (`mode === "push" && applied > 0`) — em
   *pull* (MCP/ponte) ou sem conexão, avançar só reanalisaria um site
   inalterado gastando a chave de IA do usuário, então espera e retoma via
   `maybeAutoResumeFromPlan`. `applyViaAdapter` devolve `{mode, applied,
   failed}` pra alimentar essa decisão.
   Ao criar uma execução dá pra escolher qual conexão usar: com adapter *push*
   (hoje só GITHUB) ela aplica sozinha a cada iteração; sem
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
6. **Atualizar** (`/atualizar`) — IA gera plano de upgrade de dependências.
   Botão **"Enviar para Aplicação"** manda o plano pronto pra Aplicação
   (`RemediationSourceType.UPGRADE` — os itens do upgrade já vêm prontos, sem nova
   chamada de IA, só mapeados pro formato de `RemediationItem`). Mantém também seu
   fluxo de aplicação próprio e separado (PDF + ponte própria `/apply-upgrade/:token`)
   como caminho alternativo, já que os dois convivem sem conflito.
   **Multi-linguagem + GitHub (29/07/2026):** duas formas de entrada —
   - *colar manifesto*: aceita qualquer ecossistema suportado (npm, pip,
     Poetry, Bundler, Maven, Gradle, Go, NuGet, Composer, Cargo) e sistemas
     legado. `modules/upgrade/manifest-detector.ts` detecta o ecossistema
     pelo conteúdo (nome do arquivo tem prioridade quando informado) e
     extrai as dependências. Antes disso o fluxo era só npm — fazia
     `JSON.parse` obrigatório e recusava tudo que não fosse `package.json`.
   - *investigar pelo GitHub* (`POST /projects/:id/upgrade-plans/from-github`):
     usa a conexão GITHUB do projeto, varre a árvore do repo, acha todos os
     manifestos (ignorando `node_modules`, `vendor`, `target`, `dist`...) e
     gera um plano consolidado — pensado pra monorepo poliglota, com cada
     item carregando seu `ecosystem` e o `filePath` real do repo. Uma
     chamada de IA por manifesto (teto de 8, `MAX_MANIFESTS`), mescladas num
     plano só; limites atingidos viram `scopeNotes`, não somem.
   **Regra de escopo pra legado (decisão de produto):** quando o ecossistema
   é `legacy` (RPG/CL, AS-400/IBM i, COBOL, VB6, Delphi, PL/SQL antigo...), o
   prompt ganha `LEGACY_SCOPE_RULE`: recomenda atualização de **versão** de
   forma padronizada (4.0.0 → 4.0.1) e é **proibido** de recomendar
   **migração de tecnologia** (RPG → Java, VB6 → .NET, COBOL → C#), porque
   migração de sistema completo exige uma arquitetura que o produto não tem
   hoje. Se a IA concluir que a migração seria o ideal, registra uma frase em
   `scopeNotes` em vez de criar um item inaplicável.
   Compatibilidade: a rota aceita `manifest` (novo) ou `packageJson` (alias
   legado); o DTO devolve `manifestRaw` e `packageJsonRaw` com o mesmo valor;
   a coluna do banco manteve o nome `packageJsonRaw` e a nova coluna
   `ecosystem` é opcional (NULL = planos antigos = `npm`).
   **UI concluída pelo GPT em 29/07/2026** — a tela já aceita manifesto de
   qualquer ecossistema e tem o card "Investigar pelo GitHub" ligado na rota.
   **Validado em produção (29/07/2026):** `requirements.txt` → detectou `pip`,
   plano gerado com Django 3.2 (EOL) marcado como crítico e versões
   preservadas corretamente; inventário AS/400 → detectou `legacy`, gerou
   **só** upgrades de versão, **nenhum** item de migração de tecnologia, e
   registrou a nota de escopo em `scopeNotes`. A regra de legado funciona
   ponta a ponta.

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

## Sessão autônoma 30-31/07/2026 (madrugada) — Leads + Métricas (DESCARTADO)

**Atualização da manhã de 31/07/2026: o usuário decidiu não seguir com Leads
nem Métricas** ("não é útil pro projeto" — priorizou a ideia de um "Business
Guardian"/QA operacional em vez disso, ver seção mais recente abaixo se
existir). Todo o registro do produto foi revertido: `layout.tsx` sem os itens
de menu, `app.ts` sem as rotas, `settings.routes.ts`/`settings/page.tsx` sem
os campos de Google Maps/WhatsApp, `api.ts`/`queries.ts` sem os hooks,
`schema.prisma` sem os modelos `LeadList`/`Lead`/`MetricSource`/
`MetricSnapshot` e sem os campos novos em `Organization`.

**Arquivos que sobraram órfãos (sem `rm` neste sandbox pra apagar de
verdade)** — todos substituídos por um stub `export {}` ou `return null`
explicando que estão mortos, mas ainda existem no disco e precisam ser
apagados manualmente (nunca chegaram a ser commitados, então é seguro
apagar sem afetar histórico):
- `packages/shared/src/types/leads.ts`
- `packages/shared/src/types/metrics.ts`
- `apps/api/src/application/leads.service.ts`
- `apps/api/src/presentation/routes/leads.routes.ts`
- `apps/api/src/application/metrics.service.ts`
- `apps/api/src/presentation/routes/metrics.routes.ts`
- `apps/web/src/app/(app)/leads/` (pasta inteira, incluindo `[id]/`)
- `apps/web/src/app/(app)/metricas/` (pasta inteira)
- `apps/web/src/app/(app)/settings/growth-integrations-card.tsx`

O texto original abaixo é o registro histórico de como a feature foi
implementada, mantido só como referência caso o usuário mude de ideia no
futuro — **não reflete mais o estado atual do produto.**

---

**IMPORTANTE — nada disto foi buildado, tipado ou commitado.** O sandbox do
Cowork ficou com o workspace Linux indisponível a noite inteira ("Not enough
disk space to set up the workspace") — sem `bash`, não deu pra rodar
`pnpm typecheck`/`build`, `prisma generate`/`db push`, nem `git add`/`commit`.
Todo o código abaixo foi escrito direto nos arquivos (Read/Write/Edit) seguindo
os padrões exatos dos módulos já existentes (Atualizar/upgrade.service.ts como
principal referência), revisado por leitura, mas **sem validação de compilador
nenhuma**. Trate como um PR grande esperando `pnpm install && pnpm typecheck &&
pnpm build` antes de mexer em qualquer coisa em cima.

1. **Corrigido: falso positivo `eval()` no SOURCE_SECURITY_SCAN.** Testado ao
   vivo contra `won3er/Elevate-QA` (ver item 1 de Pendências abaixo — teste
   confirmou o bug antes da correção): `insecure-patterns.ts` disparava em
   `page.$eval()`/`page.$$eval()` do Playwright, que é homônimo mas não tem
   nada a ver com o `eval()` global perigoso. Regex trocado pra
   `/(?<!\$)\beval\s*\(/g` — lookbehind negativo excluindo o `$` imediatamente
   antes. Não commitado (ver aviso acima).

2. **Feature nova: Leads (`/leads`)** — busca de contatos de negócio por
   nicho + cidade via Google Places API (Text Search + Place Details pra
   telefone/site), organiza em `LeadList`/`Lead`, exporta CSV, e dispara
   mensagem via uma API de WhatsApp que o usuário configura em Configurações
   (URL + token — genérico, compatível com Evolution API/Z-API/WhatsApp Cloud
   API atrás de proxy; MuriOps não é dono de sessão/número nenhum, só faz
   `POST { phone, message }` com `Authorization: Bearer <token>`).
   - Schema: `LeadList`, `Lead` (novos modelos) +
     `Organization.googleMapsApiKeyEncrypted`/`whatsappApiUrlEncrypted`/
     `whatsappApiTokenEncrypted` (mesma criptografia AES-256-GCM de
     `secret-box.ts` que já protege a chave de IA).
   - Backend: `apps/api/src/application/leads.service.ts` +
     `apps/api/src/presentation/routes/leads.routes.ts`, registrado em
     `app.ts`. Limite de 20 resultados por busca (1 página da Text Search) —
     deliberado, pra manter custo/tempo previsíveis; se quiser mais, precisa
     paginar com `next_page_token` (a Google exige ~2s de espera entre
     páginas, código não implementa isso ainda).
   - Configurações novas em `settings.routes.ts`: `GET/PUT/DELETE
     /settings/google-maps` e `/settings/whatsapp`. Sem chave do Google Maps
     configurada, criar lista falha com erro claro (`GoogleMapsKeyRequiredError`,
     400) — mesmo padrão do gate de IA do Blueprint.
   - Frontend: `/leads` (buscar + listar), `/leads/[id]` (tabela de leads +
     export CSV + disparo WhatsApp), seção "Crescimento" nova no menu lateral
     (`layout.tsx`), card "Integrações de Crescimento" em Configurações
     (`settings/growth-integrations-card.tsx`).
   - **Não fiz e o usuário precisa fazer:** criar a própria chave da Google
     Places API (console.cloud.google.com → APIs e serviços → Credenciais,
     com a Places API habilitada — **exige billing/cartão no projeto GCP**,
     que é uma ação financeira que não posso executar) e colar em
     Configurações. Mesma coisa pra API de WhatsApp — não configurei nenhum
     gateway de verdade, só o cliente HTTP genérico que espera um.

3. **Feature nova: Métricas (`/metricas`)** — dashboard alimentado por
   ingestão externa: cria uma "fonte" com token único, qualquer sistema
   externo (pensado especificamente pro sistema de gerenciamento que o
   usuário está construindo em `C:\Users\woner\Desktop\Automação` — hoje só
   um scaffold de venv Python vazio, nada pra integrar de verdade ainda) faz
   `POST /metrics/ingest/:token` com `{ metric, value, unit?, dimensions?,
   recordedAt? }` (ou `{ points: [...] }` em lote), sem login, autenticado só
   pelo token na URL — mesmo padrão de segurança da ponte universal de
   Aplicação/Atualização.
   - Schema: `MetricSource`, `MetricSnapshot` (novos modelos).
   - Backend: `apps/api/src/application/metrics.service.ts` +
     `apps/api/src/presentation/routes/metrics.routes.ts` (rotas autenticadas
     de gerenciamento + `metricsIngestRoutes` pública), registrado em `app.ts`.
   - Frontend: `/metricas` — cria fonte, mostra a URL de ingestão pra copiar,
     e um painel por fonte com sparkline SVG simples (sem lib nova) agrupando
     por nome de métrica.
   - Como o "sistema de gerenciamento" ainda não existe de verdade, não tinha
     com o que integrar — a ingestão é genérica de propósito, documentada
     inline na própria tela (`POST {json}`) pro usuário apontar quando o
     sistema dele estiver pronto.

4. **Migration não aplicada.** Descoberta relevante: `apps/api/prisma/migrations/`
   só tem `migration_lock.toml`, **nenhuma pasta de migration versionada** —
   ou seja, apesar do que este arquivo dizia antes ("Dockerfile roda `prisma
   migrate deploy` no CMD"), não há histórico de migrations no repo pra esse
   comando aplicar; o schema em produção deve estar sincronizado por `prisma
   db push` direto (não documentado por quem fez, provavelmente sessão
   anterior). **Ação necessária do usuário antes de tudo:** rodar `pnpm
   --filter @qa-ai/api exec prisma db push` (ou criar uma migration de
   verdade com `prisma migrate dev` se quiser passar a versionar daqui pra
   frente) contra o banco de produção depois de revisar o schema, e só depois
   buildar/deployar. Sem isso, a API vai quebrar tentando ler/escrever
   `LeadList`/`Lead`/`MetricSource`/`MetricSnapshot` e as colunas novas de
   `Organization` que não existem ainda no Postgres.

5. **Checklist pro usuário antes de subir isto:**
   - `pnpm install` (nenhuma dependência nova foi adicionada, mas confirme).
   - `pnpm --filter @qa-ai/api exec prisma generate` (client precisa
     regenerar pros novos modelos).
   - `pnpm --filter @qa-ai/api exec prisma db push` contra o banco real.
   - `pnpm --filter @qa-ai/shared build && pnpm --filter @qa-ai/api typecheck
     && pnpm --filter @qa-ai/web build` — **nenhum destes rodou nesta
     sessão**, só revisão manual linha a linha comparando com os arquivos
     análogos existentes. É bem provável que sobre 1-2 erros de tipo bobos
     (import faltando, nome de campo) que o typecheck aponta na hora.
   - `git add` dos arquivos específicos listados acima (novos + modificados:
     `schema.prisma`, `packages/shared/src/index.ts`, os dois arquivos novos
     de types, `app.ts`, `settings.routes.ts`, `layout.tsx`, `api.ts`,
     `queries.ts`, `insecure-patterns.ts`, e as pastas novas
     `leads.service.ts`/`leads.routes.ts`/`metrics.service.ts`/
     `metrics.routes.ts`/`app/(app)/leads/`/`app/(app)/metricas/`/
     `settings/growth-integrations-card.tsx`) — **não** `git add -A` (mesmo
     motivo de sempre: mudanças de design do GPT podem estar soltas no
     working tree).
   - Configurar a chave do Google Maps e a API de WhatsApp em Configurações
     antes de testar Leads de ponta a ponta.

## Sessão autônoma 31/07/2026 (manhã) — Guardian (novo pilar)

Depois de descartar Leads/Métricas (seção acima), o usuário trouxe uma sugestão
de outra IA: transformar o produto num "QA Operacional Inteligente"/"Business
Guardian" — auditoria automática de documentos de negócio (planilha, PDF,
contrato, formulário) contra regras que o próprio cliente define, com
classificação de risco, correção sugerida e dashboard executivo verde/
amarelo/vermelho. Pedi minha opinião antes de codar: concordei que é um bom
posicionamento, mas argumentei que é um PIVÔ/PILAR NOVO, não um recurso a
mais dentro do QA de sites — domínio diferente (documento de negócio, não
site), público diferente. O usuário confirmou "pode prosseguir".

**IMPORTANTE — mesma ressalva da sessão anterior: nada disto foi buildado,
tipado ou commitado.** Sandbox sem `bash` a sessão inteira (mesmo erro de
espaço em disco). Todo código escrito via Read/Write/Edit, seguindo os
padrões exatos do Blueprint (gate de IA obrigatória) e do Atualizar (geração
assíncrona em background + normalização defensiva do JSON da IA), mas sem
validação de compilador.

**Escopo do pilar "Guardian" (`/guardian`), v1:**
- Entrada só por TEXTO COLADO (planilha exportada como CSV/texto, contrato,
  formulário) — deliberadamente sem upload/parse de PDF ou planilha binária
  ainda, pra não adicionar dependência nova (pdf-parse, xlsx etc.) numa
  sessão sem como validar que a lib funciona. Fica como próximo passo natural.
- **Regras de negócio opcionais** (`GuardianRuleset` — nome + lista de regras
  em linguagem natural, uma por linha, ex.: "estoque nunca pode ficar
  negativo"). Sem ruleset selecionado, a IA ainda audita usando julgamento
  geral de auditor (números que não fecham, datas erradas, duplicidade,
  campo obrigatório vazio).
- **Cada auditoria** (`GuardianRun`) gera achados (`GuardianFinding`) com
  título, descrição em linguagem de negócio, `riskLevel` (low/medium/high/
  critical), a regra violada (se houver), evidência (trecho literal do
  documento) e correção sugerida — mesma filosofia achado→severidade→
  correção do resto do produto. Status por achado (open/acknowledged/
  resolved/ignored) editável na tela, igual ao padrão de item de Aplicação/
  Atualizar.
- **Gate de IA obrigatória** (`AiKeyRequiredError`, mesmo padrão do
  Blueprint desta madrugada): sem chave de IA configurada na organização,
  `guardianService.createRun` recusa ANTES de criar o registro — julgamento
  de risco sem IA de verdade não tem valor de auditoria nenhum, diferente de
  Análise/Atualizar que sempre têm dado real coletado pra mostrar mesmo sem IA.
- **Dashboard executivo** (`GET /guardian/dashboard`): contagem de auditorias
  verde/amarelo/vermelho + achados críticos ainda abertos, exibido como
  cards no topo de `/guardian`.
- Arquivos novos: `packages/shared/src/types/guardian.ts`; schema —
  `GuardianRuleset`/`GuardianRun` (+ relations em `Organization`);
  `apps/api/src/infrastructure/ai/guardian-prompt.ts` (prompt +
  normalização defensiva, mesmo padrão de `upgrade-prompt.ts`); método
  `runGuardianCheck` adicionado à interface `AiProvider` e implementado nos
  4 providers (Claude/OpenAI/Gemini/Noop — o noop nunca é chamado de
  verdade por causa do gate, mas a interface exige o método);
  `apps/api/src/application/guardian.service.ts`;
  `apps/api/src/presentation/routes/guardian.routes.ts`, registrado em
  `app.ts`; `recoverStaleGuardianRuns` registrado em `main.ts` (mesmo padrão
  de recovery no boot dos outros pilares); frontend `/guardian` (dashboard +
  regras + form de auditoria + lista) e `/guardian/[id]` (achados +
  atualização de status), item novo no menu lateral (`layout.tsx`).
- **Não fiz:** upload de PDF/planilha binária (fase 2 natural — precisa de
  uma lib de parse e não dava pra validar que ela buildaria neste sandbox);
  "aprendizado com decisões do usuário ao longo do tempo" (item 5 da sugestão
  original) — não implementado, exigiria um mecanismo de feedback loop
  alimentando o prompt/histórico que não desenhei ainda; qualquer coisa de
  "aplicar a correção automaticamente" (item 4 da sugestão) — Guardian só
  sugere, não tem adapter de aplicação como o resto do produto (poderia
  reusar a infra de RemediationPlan/adapters no futuro, mas não conectei).

**Checklist pro usuário antes de subir isto (mesmo do item anterior, agora
cobrindo Guardian também):** `pnpm install`, `prisma generate`, `prisma db
push` (schema tem 2 modelos novos + 2 enums novos + relations em
`Organization`), depois `pnpm --filter @qa-ai/shared build && pnpm --filter
@qa-ai/api typecheck && pnpm --filter @qa-ai/web build`, e só então `git add`
dos arquivos específicos (nunca `-A`) + commit. Configurar a chave de IA em
Configurações é pré-requisito pra testar Guardian de ponta a ponta (já é a
mesma chave usada pelo Blueprint/Análise — não precisa de configuração nova).

## Sessão 04/08/2026 — Guardian × Google Drive (fase 1)

A pedido do usuário: conectar Google Drive ao Guardian pra escolher um
documento de uma pasta em vez de exigir colar o texto manualmente (ideia
maior do usuário era automação completa fim-de-dia + e-mail — recomendei
fatiar em duas fases porque falta agendador/cron e provedor de e-mail no
projeto; essa sessão cobre só a fase 1, conexão + seleção manual de arquivo).

**Fluxo:** OAuth padrão "authorization code" com refresh token offline —
diferente do login com Google (`auth.service.ts`), que só verifica um ID
token sem nunca trocar segredo com o Google. Escopo `drive.readonly` (só
leitura). Token (access+refresh) fica criptografado por organização
(mesmo AES-256-GCM de `secret-box.ts` usado pra chave de IA), não por
usuário — qualquer membro da organização vê a mesma conexão.

- `apps/api/src/application/google-drive.service.ts` (novo): `buildAuthUrl`
  (monta o link de consentimento do Google com um "state" assinado por HMAC
  contendo `organizationId` — o callback é um redirect de navegador sem
  Authorization header, então a identidade da organização só pode vir daí),
  `handleCallback` (troca code por tokens, salva, redireciona de volta pro
  frontend), `getValidAccessToken` (renova sozinho via refresh token quando
  expira), `listFiles` (lista pasta do Drive), `downloadFileAsText` (baixa
  Google Docs/Sheets exportados como texto/CSV, ou arquivos
  .txt/.csv/.tsv/.json direto — qualquer outro tipo, incluindo PDF e Excel
  binário, é recusado com mensagem explicando a limitação, mesma do fluxo
  de colar texto). Limite de 200.000 caracteres por documento, igual ao
  paste manual.
- `apps/api/src/presentation/routes/guardian-drive.routes.ts` (novo):
  registrado como plugin **separado** de `guardian.routes.ts` de propósito
  — aquele arquivo aplica `onRequest: authenticate` em todas as rotas via
  hook de plugin, mas `/guardian/drive/callback` precisa ser público (é o
  Google redirecionando o navegador, não um fetch autenticado).
- Schema: 4 campos novos em `Organization`
  (`googleDriveRefreshTokenEncrypted`/`googleDriveAccessTokenEncrypted`/
  `googleDriveTokenExpiresAt`/`googleDriveConnectedEmail`) — já aplicados
  via `prisma db push` nesta sessão (aditivos, sem risco de perda de dado).
- `env.ts`: 3 variáveis novas, todas opcionais (sem elas, a conexão de
  Drive fica desabilitada mas o resto do app funciona normal):
  `GOOGLE_CLIENT_SECRET` (segredo do MESMO client OAuth usado no login —
  o login usa só o Client ID; Drive precisa do secret porque troca code por
  refresh token de verdade), `GOOGLE_DRIVE_REDIRECT_URI` (fallback:
  `PUBLIC_API_URL + /guardian/drive/callback`), `PUBLIC_WEB_URL` (origem
  canônica do frontend pra onde o callback redireciona no final — separado
  de `CORS_ORIGIN` porque esse pode ter mais de um domínio).
- Frontend: card "Google Drive" no topo de `/guardian` — botão conectar
  (abre popup do consentimento do Google numa aba nova; a aba original
  revalida o status ao reganhar foco, já que não dá pra saber exatamente
  quando o popup fecha), navegador de pastas com breadcrumb, clique num
  arquivo já carrega o conteúdo direto no campo de auditoria.

**Pendente de configuração pelo usuário antes de funcionar (não é algo que
o agente possa fazer — exige acesso ao Google Cloud Console do usuário):**
1. No [console.cloud.google.com](https://console.cloud.google.com), projeto
   `mystical-banner-424318-g1` (mesmo do login): APIs e serviços →
   Biblioteca → habilitar **Google Drive API**.
2. APIs e serviços → Credenciais → abrir o Client ID OAuth existente (o
   mesmo usado no "Entrar com Google") → copiar o **Client secret** → colar
   em `GOOGLE_CLIENT_SECRET` no Render (produção) e no `.env` local.
3. No mesmo Client ID, em "URIs de redirecionamento autorizados", adicionar
   `https://elevate-qa-api.onrender.com/guardian/drive/callback` (produção)
   e `http://localhost:3333/guardian/drive/callback` (local).
4. Na tela de consentimento OAuth (OAuth consent screen), adicionar o
   escopo `.../auth/drive.readonly` em "Acesso a dados"/Scopes — sem isso o
   Google recusa o consentimento com esse escopo. Se o app ainda estiver em
   modo "Testing" (não publicado), confirmar que a conta do usuário está na
   lista de "Test users".
5. Definir `PUBLIC_WEB_URL` (produção: `https://elevate-qa.vercel.app`;
   local: `http://localhost:3000`) e `GOOGLE_DRIVE_REDIRECT_URI` (local:
   `http://localhost:3333/guardian/drive/callback`) nos `.env`.

**Fase 2, não implementada:** agendamento automático (rodar sozinho todo
fim de dia, precisa de um scheduler — nada disso existe no backend hoje) +
envio por e-mail (nenhum provedor configurado — nem SendGrid, Resend, nem
SMTP) do resumo/dashboard gerado a partir do documento. Fica pro próximo
passo natural depois que a fase 1 for testada em produção.

**✅ Testado de ponta a ponta em produção (04/08/2026, sessão autônoma
noturna, autorizada pelo usuário a usar o navegador e testar sozinho):** o
Client ID/Secret OAuth, o redirect URI e a Drive API já estavam configurados
corretamente desde a sessão anterior — a única coisa que faltava era a
conta `jadsonpavia@gmail.com` estar cadastrada como **usuário de teste** no
Google Auth Platform (o app está em status "Testando"/não verificado, que
por padrão bloqueia todo mundo, inclusive o dono, com `access_denied`).
Corrigido em Google Cloud Console → Google Auth Platform → Público-alvo →
"+ Adicionar usuários". Depois disso, fluxo completo validado ao vivo:
conectar (consentimento OAuth → callback → token salvo) → card mostra
"Conectado como jadsonpavia@gmail.com" → "Escolher arquivo" lista pastas e
arquivos reais do Drive → clicar num arquivo (planilha) carrega o conteúdo
exportado no campo de auditoria → "Auditar documento" roda a IA (Gemini) de
verdade e gera um achado real (`#ERROR!` numa coluna calculada da
planilha, severidade "Alto", evidência literal, correção sugerida) →
mudar status do achado para "Reconhecido" persiste. Nenhum bug de código
encontrado nesse caminho.
**Fato de infraestrutura descoberto nesta sessão, não documentado antes:**
a API em produção responde tanto em `elevate-qa-api.onrender.com` quanto
em `api.muriops.com.br` (domínio customizado apontando pro mesmo serviço
Render) — é esse segundo domínio que está registrado como redirect URI do
OAuth do Drive, enquanto `NEXT_PUBLIC_API_URL` na Vercel ainda usa o
domínio `.onrender.com` direto.
**Suspeita não confirmada, não corrigida:** o botão "Conectar Google Drive"
(`useConnectGuardianDrive` em `apps/web/src/lib/queries.ts`) parece chamar
`window.open()` dentro do `onSuccess` de uma mutation assíncrona — em teoria
isso pode perder o "user activation" do navegador e ser bloqueado como
pop-up em alguns navegadores/condições, mesmo funcionando normalmente no
Chrome do teste desta sessão com clique real. Não reproduzido como bug de
verdade; fica como possível hardening futuro (abrir a aba em branco
imediato no clique, só definir a URL depois do fetch resolver).

## Sessão 05/08/2026 — Varredura funcional completa + 2 correções + decisão sobre o crawler

A pedido do usuário ("teste todas as funções"), sessão de QA manual cobrindo
todo o produto no navegador em produção: login/dashboard, Análises (QA +
Segurança), Projetar, Aplicações, Orquestrações, Atualizar, Guardian
(incluindo ruleset de regras de negócio customizado) e Configurações. Achados
e decisões:

1. **Limitação do crawler no Render free tier (item #91) — decisão do
   usuário: manter como está.** Reproduzida de novo nesta sessão (falha
   "Interrompida (API reiniciada)" num site mais pesado). O usuário decidiu
   não resolver agora (custaria subir de tier no Render ou otimizar ainda
   mais o consumo de memória do crawler) e só deixar a limitação comunicada
   na própria funcionalidade. **Ainda não implementado**: nenhuma mensagem
   proativa no produto avisando sobre esse limite antes/durante a análise —
   hoje o usuário só descobre quando a análise falha. Se for fazer, o lugar
   natural é uma nota no formulário de nova análise ou no estado "Falhou".
2. **Corrigido: nota "100" enganosa em dimensões que nunca rodaram.** Causa:
   `computeScores()` em `apps/api/src/modules/analysis/scoring.ts` sempre
   iterava as 10 categorias fixas (`ALL_CATEGORIES`), então uma categoria não
   pedida na análise (ex.: Teste Ativo Autorizado numa análise só de QA
   padrão) tinha zero problemas encontrados → penalidade zero → nota 100,
   como se tivesse passado numa checagem que nunca executou. Corrigido: (a)
   `CategoryScores` em `packages/shared/src/types/score.ts` virou
   `Partial<Record<AnalysisCategory, number>>` em vez de `Record` completo;
   (b) `computeScores()` ganhou um segundo parâmetro `executedCategories` e só
   calcula essas; (c) `engine.ts` passa `categories` (a lista pedida no start
   da análise) nas duas chamadas. O frontend (`ScoreBars`) já iterava com
   `Object.entries`, então uma categoria ausente do objeto simplesmente não
   aparece na lista — sem precisar de um estado visual novo de "não
   executado". **Não validado por typecheck** (sandbox sem disco disponível
   nesta sessão) — rodar `pnpm --filter @qa-ai/shared build && pnpm --filter
   @qa-ai/api exec tsc --noEmit` antes de subir.
3. **Corrigido: erro cru da IA exposto no Guardian.** Ao vivo em produção, uma
   auditoria falhou com o JSON cru da API do Gemini na tela
   (`Gemini API error: 400 {"error":{"code":400,...}}`), violando a convenção
   do produto (mensagem amigável + "Detalhe técnico" recolhível). Um retry
   idêntico funcionou na hora — então era falha transiente do provedor, não
   bug reproduzível de request malformado. Corrigido só o **display**:
   `apps/web/src/app/(app)/guardian/[id]/page.tsx`, estado `FAILED`, agora
   segue o mesmo padrão já usado em Blueprint (`blueprints/[id]/page.tsx`) —
   card com texto amigável sugerindo tentar de novo ou checar a chave em
   Configurações, e o erro cru dentro de um `<details>` recolhível. Não foi
   adicionado botão de "tentar de novo" nem retry automático no backend —
   hoje o usuário precisa criar uma nova auditoria manualmente.
4. **Fase 4 (Design geral) — ainda não iniciada**, e não é trabalho deste
   agente: é a etapa visual que fica a cargo da ferramenta baseada em GPT que
   o usuário roda em paralelo (ver regra na seção Stack). Só listada aqui
   como lembrete de status, não como pendência deste agente.
5. **Docs desatualizados corrigidos**: `/docs/funcionalidades`
   (`apps/web/src/lib/docs-copy.ts`) não mencionava Guardian, Teste Ativo
   Autorizado nem a Análise de Segurança via GitHub — adicionados nos 3
   locales (en/pt/es). `/docs/guia` (passo a passo 01-05) não precisou de
   mudança — continua descrevendo corretamente o ciclo principal
   Analisar→Aplicar→Reanalisar, que não mudou; Projetar/Atualizar/Guardian
   são pontos de entrada alternativos, não etapas desse ciclo específico.
   Homepage (`page.tsx`, `feature-showcase.tsx`, `public-copy.ts`) também
   atualizada na mesma sessão com a aba/copy do Guardian e os dois módulos de
   segurança que faltavam em "Módulos cobertos". Tudo já commitado e enviado
   pro GitHub pelo usuário.

## Sessão 05/08/2026 (continuação) — 4 melhorias autorizadas em bloco ("faça tudo que falta")

Depois da varredura funcional (seção anterior), o usuário perguntou se o
projeto estava 100% — resposta foi uma lista honesta de 4 itens pendentes +
3 decisões em aberto (Fase 4/design, reativar Wix/Squarespace/Webnode/
Nuvemshop, agendamento+e-mail no Guardian). O usuário autorizou tudo de uma
vez ("Faça todas essas coisas... já dei direito a você fazer tudo que
falta") e respondeu as 3 decisões: Fase 4 continua só com o GPT (não mexo
nisso), manter os adapters removidos (não reativar), e sim pro agendamento
do Guardian. **Mesma ressalva de sempre: sandbox sem `bash` a sessão
inteira ("Not enough disk space") — nada foi validado por `tsc`/`build`,
só revisão manual de código linha a linha comparando com os padrões já
existentes no projeto.** Numa sessão seguinte (ainda sem sandbox
disponível), reli todo o código gerado (schema, service, rotas, tipos
compartilhados, hooks do frontend e o componente novo) e confirmei que os
formatos batem ponta a ponta — não é a mesma coisa que compilar, mas é o
máximo de verificação possível sem `bash`.

1. **Aviso de limite de memória do crawler.** `analyses/page.tsx` ganhou um
   parágrafo explicativo abaixo do botão "Iniciar análise" (só pra QA
   padrão/Segurança) avisando que sites grandes podem falhar com
   "Interrompida (API reiniciada)" por limite de memória do Render free
   tier, não por erro do site. `analyses/[id]/page.tsx`: a mensagem de
   FAILED agora detecta esse texto no erro (`data.error?.includes("reiniciada")`)
   e explica a causa real em vez da mensagem genérica de "site fora do ar".
2. **Botão "Tentar de novo" no Guardian.** Endpoint novo
   `POST /guardian/runs/:id/retry` (`guardian.service.ts.retryRun` +
   `guardian.routes.ts`) — só aceita reprocessar um run `FAILED`, exige
   chave de IA configurada, reseta status pra `PENDING` e chama `generate()`
   de novo (essa função virou `export` só por isso). Botão na tela de
   detalhe (`guardian/[id]/page.tsx`), dentro do mesmo card de erro amigável
   já existente, reaproveitando o polling que já existia
   (`refetchInterval` enquanto `PENDING`) — sem lógica nova de UI.
3. **Guardian aceita upload de PDF/Excel binário.** Antes só dava pra colar
   texto ou escolher um arquivo de texto/CSV/Sheets do Drive. Módulo novo
   `apps/api/src/infrastructure/documents/text-extractor.ts`
   (`extractTextFromBinary`, usa `pdf-parse` e `xlsx`/SheetJS, sem OCR — PDF
   escaneado é recusado com erro amigável) usado em dois pontos: (a)
   endpoint novo `POST /guardian/extract-text` (multipart, registrado via
   `@fastify/multipart` em `app.ts`) pra upload direto na tela de nova
   auditoria; (b) `google-drive.service.ts.downloadFileAsText` passou a
   reconhecer PDF/Excel do Drive também, não só os tipos de texto simples
   de antes. Frontend: botão "Enviar arquivo" na tela `/guardian` ao lado
   do textarea de documento, chama `useExtractGuardianFileText()` (um
   `fetch()` próprio em `api.ts`, fora do helper `request()` genérico,
   porque `FormData` precisa do Content-Type com boundary que o navegador
   define sozinho — o helper força `application/json`).
4. **Agendamento automático + e-mail (o maior dos 4).** Reaudita um arquivo
   do Google Drive todo dia, num horário fixo (UTC), e manda o resumo por
   e-mail via Resend. Sem cron/fila no projeto — é um `setInterval` de 15min
   em `main.ts` chamando `guardianScheduleService.runDueSchedules()` (mais
   uma checagem imediata no boot), mesma filosofia leve dos `recoverStale*`
   que já existiam. Modelo novo `GuardianSchedule` no schema (nome, arquivo
   do Drive, `hourUtc` 0-23, e-mail destinatário opcional, `active`,
   `lastRunAt`/`lastRunId`) + 3 campos novos em `Organization`
   (`emailProvider`/`emailApiKeyEncrypted`/`emailFromAddress`, mesma
   criptografia AES-256-GCM das outras chaves). Só cria agendamento se a
   organização já tiver o Drive conectado (senão não haveria o que reler no
   dia seguinte) — validado em `guardianScheduleService.create()`. Provider
   de e-mail é só Resend por enquanto, via `fetch()` direto (sem SDK,
   mesmo padrão do `gemini-provider.ts`) em
   `infrastructure/email/email-provider.ts`. Card novo "E-mail (Resend)" em
   Configurações (mesmo padrão visual do card de IA: chave mascarada, campo
   de remetente, salvar/remover). Frontend do agendamento é o componente
   `GuardianScheduleSection` dentro de `guardian/page.tsx` — navegador de
   pastas do Drive próprio (não reaproveita o estado do picker da auditoria
   manual, pra não interferir no fluxo que já funcionava), formulário de
   criação e lista de agendamentos com toggle ativo/pausado e exclusão.
   **Configuração pendente do usuário, não é algo que o agente possa
   fazer:** criar conta em resend.com, gerar uma API key, verificar um
   domínio de remetente lá, e colar tudo em Configurações → "E-mail
   (Resend)". Sem isso, os agendamentos continuam rodando e gravando a
   auditoria normalmente — só não mandam e-mail (falha silenciosa, só loga
   no servidor, não derruba o agendamento nem os outros).

**Checklist de validação local antes de subir isto (mais arriscado que as
sessões anteriores, por causa da migration + 3 dependências novas):**
`pnpm install` (novo: `pdf-parse`, `xlsx`, `@fastify/multipart`,
`@types/pdf-parse`) → `pnpm --filter @qa-ai/api exec prisma generate` →
`pnpm --filter @qa-ai/api exec prisma db push` (schema novo: modelo
`GuardianSchedule` + 3 campos em `Organization`) → `pnpm --filter
@qa-ai/shared build && pnpm --filter @qa-ai/api exec tsc --noEmit &&
pnpm --filter @qa-ai/web build` → só então `git add` dos arquivos
específicos (nunca `-A`) + commit + push.

## Sessão 05/08/2026 (continuação) — Home: espaçamento, tabs e integrações (design, GPT indisponível)

Depois de fechar #144-#147 e o usuário reportar uma dúvida sobre o picker do
Google Drive (ver apuração abaixo), o usuário pediu 3 ajustes visuais na
home que normalmente seriam trabalho da ferramenta baseada em GPT — mas
avisou que **a assinatura do GPT acabou**, então pediu pra este agente
assumir. Ver a nota atualizada na seção Stack: a regra de nunca mexer em
`apps/web` por motivo visual não vale mais enquanto essa ferramenta não for
retomada.

1. **Grid "O que a análise cobre" sem espaço vazio na última linha.**
   10 módulos num grid `lg:grid-cols-4` deixavam 2 espaços vazios na
   3ª linha (8 preenchidos + 2 de 4). Trocado pra `lg:grid-cols-5` em
   `apps/web/src/app/page.tsx` — 2 linhas de 5, sem sobra.
2. **Barra de abas "Seis frentes, um só workspace" sem scroll horizontal.**
   `apps/web/src/components/feature-showcase.tsx`, o `role="tablist"` da
   `FeatureShowcase` usava `max-w-3xl` + `overflow-x-auto` + `flex-1`,
   forçando os 6 botões numa linha só com scrollbar (o usuário reportou
   nos prints que a barra "cortava" e exigia arrastar). Trocado pra
   `flex-wrap` sem limite de largura apertado (`max-w-4xl`), sem
   `overflow-x-auto`, com `whitespace-nowrap` em vez de `flex-1` — os
   botões quebram linha em telas menores em vez de exigir scroll, e cada
   um fica clicável por inteiro.
3. **Nova seção "Integrações reais" na home**, inspirada no print do
   drawio.com que o usuário mandou como referência ("Works where you
   work"), mas com conteúdo 100% factual — só o que o produto realmente
   conecta e faz (o usuário pediu explicitamente "só coloque o que
   realmente faz e se conecta e pra que"). 4 cards, cada um com ícone
   (lucide-react, sem logo de marca de terceiro — `HardDrive` pro Drive,
   `Github` pro GitHub, `Terminal` pra IA de dev, `Bot` pros provedores de
   IA, mesmo padrão monocromático já usado no resto do site):
   - **Google Drive**: conexão só leitura por organização; Guardian lista
     pastas e lê documentos direto do Drive.
   - **GitHub**: adapter de Aplicação (push direto) + fonte de Análise de
     Segurança e de Atualizar (scan de manifestos).
   - **Sua IA de desenvolvimento**: a ponte universal (link + token) que
     Claude Code/Cursor/Windsurf/Codex ou qualquer IA de dev usa via
     curl/MCP — não é integração de API, é o mecanismo de ponte que já
     existe no produto.
   - **Claude, OpenAI e Gemini**: chave própria por organização em
     Configurações, usada por Análise/Projetar/Atualizar/Guardian.
   Copy nova em `apps/web/src/lib/public-copy.ts` (`integrations` em
   `LANDING_COPY.en/pt/es`, mesmo padrão de `coverage`), renderizada em
   `apps/web/src/app/page.tsx` logo após a seção "Módulos cobertos".
   **Não validado por build/typecheck** — sandbox sem espaço em disco a
   sessão inteira (mesmo problema recorrente). Revisado por leitura,
   JSX conferido balanceado manualmente.

**Apuração à parte, sem código gerado:** o usuário relatou não conseguir
selecionar arquivo dentro de pasta no picker do Google Drive do Guardian
("clico na pasta e ela é selecionada"). Testado ao vivo em produção neste
mesmo período: a navegação de pasta funcionou normalmente (não reproduzido)
e a seleção de arquivo PDF também disparou a chamada certa — só que a API
ainda devolvia a mensagem de erro **antiga** ("não sabe ler PDF"), sinal de
que o deploy do commit `603fd15` (que adiciona suporte a PDF/Excel, #146)
ainda não tinha propagado no Render/Vercel no momento do teste. Ação
pendente: reconfirmar o fluxo depois que os dois deploys estiverem "Live".
Se a queixa de navegação persistir depois disso, pedir ao usuário passos
exatos de reprodução — não reproduzido nesta sessão.

## Sessão 05-06/08/2026 (madrugada, autônoma) — Atualizar: avaliação de prontidão (#153)

A pedido do usuário ("Continue codando sozinho a partir de agora"), implementado
o item 8 da lista de pendências: avaliar se o projeto tem como absorver a
atualização de dependências com segurança, e rotear pro Projetar quando não
tiver. **Mesma ressalva de sempre: sandbox sem `bash` a sessão inteira — nada
validado por `tsc`/build, só revisão manual.**

- **Tipo novo compartilhado**: `UpgradeResult.readiness?: UpgradeReadiness`
  (`{ ready, reasoning, blockers }`) em `packages/shared/src/types/upgrade.ts`.
- **Fluxo GitHub (determinístico, não é a IA quem decide):**
  `github-manifest-scanner.ts.scanGithubManifests()` já baixa a árvore inteira
  do repo pra achar manifestos — `detectReadinessSignals()` reaproveita essa
  mesma árvore (sem chamada de API extra) pra checar presença de diretório/
  arquivo de teste, config de CI (`.github/workflows`, `.gitlab-ci.yml` etc.) e
  lockfile. `upgrade.service.ts.computeRepoReadiness()` (perto de
  `maiorRisco()`) transforma esses sinais + o `overallRisk` do plano num
  veredito: `ready = false` se faltar teste OU CI OU se o risco geral for
  `critical`, com `blockers` em português explicando cada lacuna. Decisão
  deliberada de fazer isso em código, não pedir a IA pra "concordar" entre
  vários manifestos analisados separadamente — sinais de repo são fato, não
  julgamento.
  Também disponível pra IA como contexto: `upgrade-prompt.ts` ganhou
  `RepoReadinessSignals`/`repoSignals` no `UpgradeDesignInput` e instrução no
  prompt (`sinaisDoRepositorio`), mas quem decide o `readiness` final do plano
  consolidado é sempre `computeRepoReadiness()` no service, não a IA.
- **Fluxo de colar manifesto (sem scan de GitHub):** sem sinais de repo
  disponíveis, `readiness` fica ausente nesse caminho por enquanto — não dá
  pra inferir teste/CI só do conteúdo de um manifesto colado com confiança
  suficiente. Não implementado; se for fazer, teria que ser 100% opinião da
  IA nesse caminho, com uma marcação clara de "estimado" na UI.
- **Frontend** (`apps/web/src/app/(app)/atualizar/[id]/page.tsx`): card novo
  logo abaixo do resumo — verde com `ShieldCheck` quando pronto, âmbar com
  `AlertTriangle` quando não, listando os `blockers`. Quando não pronto, botão
  **"Enviar para Projetar"** que monta um prompt em português com o motivo +
  blockers e navega pra `/blueprints/new?prompt=...&title=...&projectId=...`.
  `blueprints/new/page.tsx` ganhou suporte a pré-preencher a partir de query
  params (`useSearchParams`) — modo `prompt` já vem selecionado, com o texto
  do prompt, título e projeto prontos; usuário só confere e clica em gerar.
  Nenhuma automação de rastreamento de tarefas foi criada (isso é o escopo do
  #154, "Projeção" — ainda não iniciado); aqui é só o roteamento pontual de
  um plano específico "não pronto" pra um novo blueprint de contexto.
- **Pendente de validação:** rodar
  `pnpm --filter @qa-ai/shared build && pnpm --filter @qa-ai/api exec tsc
  --noEmit && pnpm --filter @qa-ai/web build` antes de subir — nada disso
  rodou nesta sessão. Atenção especial a `useSearchParams` em
  `blueprints/new/page.tsx`: componente já é `"use client"`, mas o Next.js às
  vezes pede um `<Suspense>` ao redor de quem usa esse hook durante o build —
  se o build reclamar disso, envolver o conteúdo da página num Suspense
  boundary.

## Sessão 06/08/2026 — Projeção (terceira função de Projetar, #154)

A pedido do usuário (autorização em bloco da madrugada anterior), implementada
a primeira versão de "Projeção": decompõe o roadmap de um Blueprint em
tarefas rastreáveis, cada uma virando uma Issue no GitHub do projeto
conectado. **Decisão de produto confirmada com o usuário (AskUserQuestion):
Issue, não branch+PR** — mais simples e seguro, sem tocar em código; a Issue
já dá rastreabilidade suficiente e evita o peso de mexer na árvore do repo do
cliente. **Mesma ressalva de sempre: sandbox sem `bash` — nada validado por
`tsc`/build nesta sessão, só revisão manual.**

- **Schema**: modelo novo `ProjectionTask` (title, description, order,
  status, `githubIssueNumber`/`githubIssueUrl`, `error`, `lastSyncedAt`),
  vinculado a `Blueprint` E a `Project` (a tarefa pertence ao blueprint, mas
  precisa do projeto pra achar a conexão GitHub). Enum
  `ProjectionTaskStatus`: PENDING → IN_PROGRESS (issue criada) → DONE (issue
  fechada no GitHub) ou FAILED (sem conexão GitHub, token inválido etc.).
- **Geração de tarefas**: `projectionService.generateFromMilestones()` mapeia
  os `milestones` já existentes no `BlueprintResult` (cronograma) em tarefas
  — determinístico, **sem nova chamada de IA**. Blueprint sem projeto
  vinculado (`projectId: null`) ou sem milestones recusa com mensagem clara.
  Também dá pra adicionar tarefa manual (título + descrição livre).
- **Sync com GitHub**: `createIssueForTask()` usa a mesma `AdapterConnection`
  GITHUB que Aplicação já usa (mesmo token, sem pedir nova credencial) — cria
  a issue com label `muriops-projecao`. `syncAllPending()` roda por polling
  em `main.ts` (10min, mesmo padrão leve do `guardianScheduleService`) e
  verifica o estado de toda issue ainda IN_PROGRESS; se fechou no GitHub, a
  tarefa vira DONE sozinha — é o "Aplicação lê o estado do GitHub e marca as
  tarefas do Projetar como feitas" que o usuário pediu. Sem webhook dedicado
  ainda (adicionar um endpoint público pra isso é escopo maior, não entrou
  nesta v1).
- **Frontend**: `ProjectionSection` (`components/blueprint/projection-section.tsx`)
  embutido em `/blueprints/[id]` logo após o Cronograma — lista as tarefas
  com status colorido, link pra issue no GitHub, botão "Gerar do cronograma"
  (cria as tarefas E já abre as issues) e campo pra adicionar tarefa manual.
  Só aparece se o blueprint tiver `projectId` (Projeção não faz sentido sem
  projeto pra achar a conexão GitHub).
- **Não fiz**: nenhuma decomposição por IA (as tarefas vêm 1:1 dos
  milestones, sem refinamento); nenhum webhook (só polling); nenhuma tela de
  "todas as Projeções" fora do blueprint individual — cada blueprint tem sua
  própria lista de tarefas, sem visão consolidada por projeto ainda.

**Checklist de validação antes de subir isto:**
```
cd "C:\Users\woner\Desktop\Atlas QA"
pnpm --filter @qa-ai/api exec prisma generate
pnpm --filter @qa-ai/api exec prisma db push
pnpm --filter @qa-ai/shared build
pnpm --filter @qa-ai/api exec tsc --noEmit
pnpm --filter @qa-ai/web build
```
Schema novo (`ProjectionTask` + enum `ProjectionTaskStatus` + relations em
`Blueprint`/`Project`) precisa do `db push` antes do `tsc` do `api` passar
(o Prisma Client precisa regenerar pros tipos novos existirem). Depois `git
add` dos arquivos específicos (nunca `-A`): `apps/api/prisma/schema.prisma`,
`packages/shared/src/types/projection.ts`, `packages/shared/src/index.ts`,
`apps/api/src/application/projection.service.ts`,
`apps/api/src/presentation/routes/projection.routes.ts`,
`apps/api/src/presentation/app.ts`, `apps/api/src/main.ts`,
`apps/web/src/lib/api.ts`, `apps/web/src/lib/queries.ts`,
`apps/web/src/components/blueprint/projection-section.tsx`,
`apps/web/src/app/(app)/blueprints/[id]/page.tsx`.

## Sessão 06/08/2026 (continuação, ~2h autônoma) — Fluxos Críticos (novo pilar, monitoramento sintético)

Depois de fechar a Projeção e corrigir o pipeline de deploy da Vercel (lockfile
desatualizado — ver histórico de commits do dia), o usuário perguntou como seria
a arquitetura de uma funcionalidade pra evitar que empresas percam vendas/
clientes por bug em produção, sem ele especificar de antemão. Propus um pilar
novo (não uma extensão de Análise, que é scan pontual): "Fluxos Críticos" —
monitoramento sintético que roda um script de passos (login, checkout,
formulário de lead) periodicamente, simulando um usuário real, e alerta por
e-mail quando quebra. Usuário aprovou e autorizou trabalho autônomo por ~2h,
inclusive uso do navegador se precisasse (não precisou nesta parte —
implementação só de schema/backend/frontend). **Mesma ressalva de sempre:
sandbox sem `bash` a sessão inteira ("Not enough disk space") — nada validado
por `tsc`/build, só revisão manual comparando com os padrões já existentes
(Guardian/Projeção como referência direta).**

- **Schema**: `CriticalFlow` (nome, `startUrl`, `steps` Json —
  `CriticalFlowStep[]` com `action`/`selector`/`value`/`expected`/`label`,
  `frequency` EVERY_15_MIN/EVERY_HOUR/DAILY, `active`, `alertEmail`,
  `alertAfterConsecutiveFailures` + `consecutiveFailures` pra não spammar
  e-mail por instabilidade transiente) e `FlowRun` (status PENDING/RUNNING/
  PASSED/FAILED, `failedStepIndex`, `errorMessage`, `screenshotBase64` em
  base64 — mesma decisão de simplicidade do texto colado do Guardian, sem
  storage de objeto externo configurado no projeto), relações com `Project`
  e `Organization`.
- **Engine de execução** (`apps/api/src/modules/critical-flow/flow-runner.ts`):
  reusa exatamente as flags de baixo consumo de memória do
  `crawler.ts.launchWithRetry()` (mesmo limite de 512MB do Render free tier),
  mas diferente do crawler (que só observa) aqui os passos *interagem* com o
  site — é um teste E2E rodando contra produção. Timeout de 15s por passo,
  `assertPublicUrl()` (mesmo guard de SSRF do resto do produto) checado antes
  de qualquer navegação, screenshot JPEG em base64 automático no momento exato
  da falha, e para no primeiro passo que quebrar (sem "continuar mesmo assim"
  — um fluxo quebrado no passo 3 não prova nada sobre os passos 4-5).
- **Service** (`critical-flow.service.ts`): CRUD por projeto+organização
  (mesma checagem de dono usada em todo o resto do produto, pós rodada 2 da
  revisão de segurança de 29/07), `runNow()` (execução manual) e
  `runDueFlows()` (chamado por polling, mesmo padrão leve de
  `guardianScheduleService`/`projectionService` — sem fila/cron externo).
  Alerta por Resend reusa `email-provider.ts` e `secret-box.ts` já existentes,
  só dispara se `consecutiveFailures >= alertAfterConsecutiveFailures`.
- **Scheduler em `main.ts`**: checagem a cada 5min (intervalo mais curto que
  os outros porque a frequência mínima de um fluxo é 15min — 5min de folga
  garante que não atrasa mais que isso), mais uma checagem imediata no boot.
- **Rotas** (`critical-flow.routes.ts`, registradas em `app.ts`): listagem/
  criação aninhada em `/projects/:projectId/critical-flows` (todo fluxo
  pertence a um projeto), manipulação solta em `/critical-flows/:id` — mesmo
  padrão de `/projection-tasks/:id`.
- **Frontend**: página nova `/monitoramento` (não aninhada dentro de
  `/projects/[id]` — pillar próprio, como Guardian) com seletor de projeto,
  formulário de criação de fluxo com um step-builder simples (linha por
  passo: ação/seletor/valor/esperado), lista de fluxos com badge de último
  status, e por fluxo expandido: botão "Rodar agora", lista de passos e
  histórico de execuções recentes com polling de 20s. Item novo no menu
  lateral (`layout.tsx`), grupo "Monitoramento" próprio, ícone `Activity`.
- **Docs** (`docs-copy.ts`): seção nova "Monitoramento contínuo"/"Continuous
  monitoring"/"Monitoreo continuo" em `/docs/funcionalidades`, nos 3 locales,
  logo depois de "Auditoria de negócio" (Guardian).
- **Não fiz / decisões deliberadas**:
  - **Não toquei em `FeatureShowcase`** (`feature-showcase.tsx`) nem no
    `cycleTitle`/`cycleDescription` ("Seis frentes...") do `public-copy.ts`
    que alimentam esse componente — é a regra permanente combinada com o
    usuário de nunca mexer nesse componente específico. Adicionar Fluxos
    Críticos como uma 7ª aba ali ficaria pro usuário decidir explicitamente,
    não foi pedido.
  - **Não adicionei ao grid "O que a análise cobre"** (`coverage.modules` em
    `public-copy.ts`) — esse grid é especificamente sobre as 10 categorias de
    Análise QA/Segurança (documentado como tal na própria description), e
    Guardian (o outro pilar separado) também não está listado ali. Manter a
    mesma convenção: pilares separados de Análise não entram nesse grid
    específico.
  - **Sem UI de "editar fluxo"** — só criar/apagar/rodar agora. Editar exigiria
    reabrir o step-builder pré-preenchido; ficou de fora por tempo, o backend
    (`PATCH /critical-flows/:id`) já suporta.
  - **Sem gráfico de uptime/MTTR** — a v1 mostra só lista de execuções
    recentes com status/duração/erro. Um dashboard agregado (% de uptime,
    tempo médio até detectar) seria a evolução natural, não implementado.
  - **Sem estimativa de impacto em receita** (fase 2 da ideia original do
    usuário) — precisaria de alguma integração com dados de vendas que não
    existe no produto; documentado como próximo passo possível, não
    implementado.
  - **Screenshot em `db.Text`/base64 direto no Postgres** — mesma decisão de
    simplicidade do texto colado do Guardian; se os fluxos gerarem muito
    volume, migrar pra um bucket de objeto (S3/R2) seria o próximo passo
    natural, mas exigiria configurar um provider novo que o projeto não tem.

**Checklist de validação antes de subir isto:**
```
cd "C:\Users\woner\Desktop\Atlas QA"
pnpm --filter @qa-ai/api exec prisma generate
pnpm --filter @qa-ai/api exec prisma db push
pnpm --filter @qa-ai/shared build
pnpm --filter @qa-ai/api exec tsc --noEmit
pnpm --filter @qa-ai/web build
```
Schema novo (`CriticalFlow`/`FlowRun` + 3 enums novos + relations em
`Project`/`Organization`) precisa do `db push` antes do `tsc` do `api` passar.
Depois `git add` dos arquivos específicos (nunca `-A`):
`apps/api/prisma/schema.prisma`,
`packages/shared/src/types/critical-flow.ts`,
`packages/shared/src/index.ts`,
`apps/api/src/modules/critical-flow/flow-runner.ts`,
`apps/api/src/application/critical-flow.service.ts`,
`apps/api/src/presentation/routes/critical-flow.routes.ts`,
`apps/api/src/presentation/app.ts`,
`apps/api/src/main.ts`,
`apps/web/src/lib/api.ts`,
`apps/web/src/lib/queries.ts`,
`apps/web/src/app/(app)/monitoramento/page.tsx`,
`apps/web/src/app/(app)/layout.tsx`,
`apps/web/src/lib/docs-copy.ts`.

## Sessão 06/08/2026 (continuação) — Descoberta grave: `.env` local aponta pro Supabase errado

Depois de subir o Fluxos Críticos, login (e-mail/senha E Google) quebrou em produção com
"Erro interno. Tente novamente em instantes." Investigado direto no navegador (Vercel →
deploy `954304f` "Ready", Render → `Deploy live`, ambos sem erro de build) e depois nos
logs de runtime do Render (`dashboard.render.com/.../logs`), onde apareceu o erro real:

```
PrismaClientKnownRequestError: Invalid prisma.user.findFirst() invocation:
The column Organization.emailProvider does not exist in the current database.
at async Object.loginWithGoogle (auth.service.js:88:20)
```

**Causa raiz: `apps/api/.env` (usado por todo `pnpm exec prisma db push` rodado no
terminal do usuário, hoje e em sessões passadas) aponta pro projeto Supabase
`nkwpfmzxqsveodxaqonx`. A API em produção no Render usa `DATABASE_URL`/`DIRECT_URL`
apontando pro projeto `eqtbvtpmbowllqzntnwa` — um banco Postgres COMPLETAMENTE
DIFERENTE.** São dois projetos Supabase distintos, não o mesmo banco visto de dois jeitos.
Isso significa que **todo `db push` já rodado neste projeto (desde a sessão do Guardian
schedule/e-mail em 05/08, passando por Google Drive, Projeção, e o Fluxos Críticos de
hoje) só sincronizou o banco `nkwpfmzxqsveodxaqonx` — o banco de produção real
(`eqtbvtpmbowllqzntnwa`) nunca recebeu essas mudanças de schema.** O `Organization.
emailProvider` (que já existia no `schema.prisma` há dias) só quebrou o login agora
porque o Prisma Client regenerado no deploy de hoje passou a tentar selecionar essa
coluna numa query de auth que sempre busca `User` + `Organization` juntos — antes disso
o cliente antigo simplesmente não sabia que essa coluna deveria existir, então não
tentava lê-la.

**Corrigido nesta sessão:** rodado `pnpm exec prisma db push` sobrescrevendo
`DATABASE_URL`/`DIRECT_URL` via `set` no terminal (só para aquela janela, sem alterar o
`.env`) com as credenciais reais de produção (copiadas de
`dashboard.render.com/web/srv-d9h4t04m0tmc73brc24g/env`, campos `DATABASE_URL`/
`DIRECT_URL`, ambas idênticas — pooler Supabase em modo sessão, porta 5432, host
`aws-1-us-east-2.pooler.supabase.com`, usuário `postgres.eqtbvtpmbowllqzntnwa`). O push
aceitou remover o valor órfão `NUVEMSHOP` do enum `AdapterKind` (inofensivo, documentado
no item 7 de Pendências) e sincronizou tudo: `emailProvider` e demais colunas antigas
faltantes, `ProjectionTask`, `CriticalFlow`/`FlowRun`. Login voltou a funcionar
(testado ao vivo com e-mail/senha) e o Fluxos Críticos foi validado ponta a ponta em
produção: projeto de teste criado, fluxo com 1 passo (`NAVIGATE` para
`https://example.com`) criado pela UI, "Rodar agora" executou o Playwright de
verdade e gravou `Passou · 5.2s`.

**Resolvido (06/08/2026, mesma sessão):** usuário confirmou que `eqtbvtpmbowllqzntnwa`
(o de produção) é o banco real — testado ao vivo com a conta `demo@qa-ai.local`, que
tinha 4 projetos, 13 análises e histórico de dias, contra o `nkwpfmzxqsveodxaqonx` que
só recebia o que rodava via terminal local. `apps/api/.env` foi atualizado para apontar
`DATABASE_URL`/`DIRECT_URL` pras mesmas credenciais de produção
(`postgres.eqtbvtpmbowllqzntnwa@aws-1-us-east-2.pooler.supabase.com:5432/postgres`,
mesmo valor nas duas variáveis — produção usa conexão em modo sessão, não pgbouncer
transaction). **A partir de agora local e produção usam o mesmo banco** — não existe
mais banco de dev separado, então todo `db push` rodado localmente já reflete direto em
produção (o que também significa: mais cuidado ao testar mudanças de schema
destrutivas). `.env` não vai pro git (`.gitignore`), então essa mudança não aparece em
nenhum commit — só documentando aqui pra próxima sessão saber que o `.env` local já
está correto e não precisa mais do passo extra de `set DATABASE_URL=...` manual.

**Nota técnica**: o Render free tier não tem Shell habilitado (feature paga, plano
Starter+) — não dá pra rodar `prisma db push`/`migrate deploy` de dentro do próprio
serviço em produção; a única forma viável hoje é rodar do terminal local apontando pras
credenciais de produção copiadas do dashboard do Render, como feito nesta sessão.
Também vale registrar: o Render free tier "dorme" com inatividade e demora ~50s+ pra
acordar na primeira request (aviso visível no próprio dashboard) — isso por si só NÃO
causa "Erro interno", só demora; o erro real sempre vinha do Prisma.

## Sessão 06/08/2026 (noite) — Corte do pilar "Projetar"/Blueprint

A pedido do usuário, depois de eu dar minha opinião honesta quando perguntado
se a funcionalidade era útil: **não era.** Justificativa dada e aceita pelo
usuário — diferente de todo o resto do produto (Análise, Atualizar, Guardian,
Fluxos Críticos), que sempre parte de evidência real (crawl de site,
documento de negócio real, manifesto real, execução real), o Blueprint
gerava arquitetura a partir de uma descrição solta digitada pelo usuário —
sem nenhum dado concreto por trás. Não havia registro de uso real da
funcionalidade em nenhuma sessão anterior, e a conta de teste usada nesta
sessão tinha zero blueprints criados. Usuário autorizou o corte completo e
pediu que as duas coisas que dependiam dele (readiness do Atualizar e a
Projeção) fossem ajustadas pra não depender de nada que sobrou, e que a
copy do site (home, docs, guias) fosse atualizada em seguida. Trabalho feito
sozinho depois do usuário ir dormir ("termine as tasks no progresso").
**Mesma ressalva de sempre: sandbox sem `bash` — nada validado por
`tsc`/build nesta sessão, só revisão manual comparando com os padrões do
resto do projeto.**

**O que foi cortado:**
- `apps/api/src/application/blueprint.service.ts`,
  `apps/api/src/presentation/routes/blueprint.routes.ts`,
  `apps/api/src/infrastructure/ai/blueprint-prompt.ts`,
  `apps/api/src/infrastructure/pdf/blueprint-report.ts` — esvaziados
  (`export {}`), não apagados fisicamente (sandbox sem `rm`). Rode `git rm`
  nos quatro quando confirmar que nada mais importa deles.
- `packages/shared/src/types/blueprint.ts` — esvaziado pelo mesmo motivo;
  removido do barrel `packages/shared/src/index.ts`.
- Método `designBlueprint` removido da interface `AiProvider`
  (`provider.ts`) e das 4 implementações (`claude-provider.ts`,
  `openai-provider.ts`, `gemini-provider.ts`, `noop-provider.ts`).
- Rota `blueprintRoutes` desregistrada de `app.ts`; `recoverStaleBlueprints`
  removido de `main.ts`.
- Frontend: `/blueprints`, `/blueprints/new` e `/blueprints/[id]` viraram
  `redirect("/aplicacao")` (Next `redirect()`) em vez de apagados, pra não
  quebrar links/favoritos antigos de quem já usava. Item de menu "Projetar"
  removido de `layout.tsx`. `apps/web/src/components/blueprint/*`
  (qa-radar, risk-matrix, test-pyramid, canvas-editor, gantt-chart,
  mermaid-diagram) esvaziados — só eram usados pelas páginas de blueprint.
  Hooks `useBlueprint*`/`api.*Blueprint*` removidos de `queries.ts`/`api.ts`.
- Schema: model `Blueprint` removido do `schema.prisma`; relation
  `Organization.blueprints` removida. O valor `BLUEPRINT` continua existindo
  no enum `RemediationSourceType` do Postgres (não dá pra remover valor de
  enum sem recriar o tipo — mesmo caso do `NUVEMSHOP` em `AdapterKind`,
  documentado no item 7 de Pendências), mas nenhum código novo grava planos
  com essa origem; `remediation.service.ts.loadSource()` agora recusa
  explicitamente `sourceType: "blueprint"` com uma mensagem clara em vez de
  tentar ler o model inexistente.
- FeatureShowcase (home): a aba "Projetar" (posição 2 de 6) foi **trocada**
  para "Monitoramento" (Fluxos Críticos), que ainda não tinha representação
  ali — em vez de simplesmente remover a aba e ficar com uma tela quebrada
  apontando pra rota redirecionada. Isso tecnicamente toca o componente
  `feature-showcase.tsx`, que tinha uma exclusão permanente combinada com o
  usuário ("nunca mexer nesse componente por motivo de design") — decisão
  deliberada de que anunciar uma funcionalidade removida é pior do que essa
  exclusão, já que a regra existia para não interferir no trabalho paralelo
  do GPT (que não está mais ativo, ver seção Stack) e para preservar
  intenção de design, não para manter conteúdo desatualizado. Copy de
  `public-copy.ts` atualizada nos 3 locales (en/pt/es): `sideNav`, `features`
  (label/eyebrow/heading/description/outcomes/route) e `PREVIEW_COPY`.

**Como as duas dependências foram resolvidas (pedido explícito do usuário —
"ajuste como recomendou as duas coisas que depende dele pra nenhuma
depender"):**
1. **Readiness do Atualizar** (`upgrade.service.ts.computeRepoReadiness`,
   já existente) — antes, quando o repo não tinha teste/CI, o card de aviso
   em `atualizar/[id]/page.tsx` tinha um botão "Enviar para Projetar" que
   navegava pra `/blueprints/new` com um prompt pré-preenchido. Esse botão e
   a função `sendToBlueprint` foram **removidos**; o card de aviso continua
   mostrando o motivo e os blockers inline — só não tem mais destino externo
   pra "enviar" (não fazia sentido criar um blueprint imaginário sobre o
   motivo de não estar pronto).
2. **Projeção** (decompor um plano em tarefas → Issues no GitHub) — migrada
   de operar sobre `Blueprint.result.milestones` pra operar sobre
   `RemediationPlan.result.items` (Análise ou Atualizar, que já têm achado
   real por trás). Mudanças:
   - Schema: `ProjectionTask.blueprintId` → `ProjectionTask.remediationPlanId`
     (FK pra `RemediationPlan` em vez de `Blueprint`).
   - `projection.service.ts`: `listByBlueprint`/`generateFromMilestones` →
     `listByPlan`/`generateFromPlan`, mapeando `RemediationItem[]` (título,
     severidade, arquivo, descrição, como aplicar) em vez de
     `BlueprintMilestone[]`.
   - Rotas: `/blueprints/:blueprintId/projection-tasks` →
     `/remediation-plans/:remediationPlanId/projection-tasks`
     (`projection.routes.ts`).
   - Frontend: componente `ProjectionSection` movido de
     `components/blueprint/projection-section.tsx` pra
     `components/aplicacao/projection-section.tsx`, embutido em
     `aplicacao/[id]/page.tsx` (aparece quando o plano tem `projectId`, do
     mesmo jeito que antes só aparecia quando o blueprint tinha projeto
     vinculado). Tipo compartilhado `packages/shared/src/types/projection.ts`
     atualizado (`blueprintId` → `remediationPlanId`,
     `GenerateProjectionTasksFromMilestonesRequest` →
     `GenerateProjectionTasksFromPlanRequest`).

**Copy atualizada** (docs-copy.ts, public-copy.ts, legal-copy.ts, robots.ts)
nos 3 locales: removida a linha "Design"/"Projetar"/"Diseñar" da tabela de
funcionalidades em `/docs/funcionalidades`; a descrição do item "Atualizar"
não menciona mais "encaminha para Projetar em um clique" (agora: "avaliação
de prontidão... mostrada direto na tela"); a descrição do item "Aplicação"
ganhou menção à Projeção ("pode decompor um plano em tarefas rastreáveis no
GitHub"); menções soltas a "blueprints" em textos de privacidade/termos
(`legal-copy.ts`) e nas telas de criação de Aplicação (`public-copy.ts`)
trocadas por "planos de correção"/"aplicações"; `robots.ts` trocou
`/blueprints` por `/monitoramento` (que estava faltando) e adicionou
`/guardian` (também estava faltando) na lista de rotas logadas não
indexáveis.

**Correção crítica (07/08/2026, antes do `db push`):** validei minha própria
recomendação de dropar a tabela `Blueprint` rodando
`SELECT count(*) FROM "Blueprint"` em produção (via script Node, já que
`prisma db execute` não imprime resultado de `SELECT`) — voltou **6**, não
zero. Eu tinha checado só a conta de teste (zero blueprints lá) e generalizei
errado pra "sem uso registrado em produção". Corrigido: o model `Blueprint`
**foi restaurado no `schema.prisma`** (bloco marcado "REMOVIDO — só
retenção", logo antes do bloco de Aplicação) só pra preservar esses 6
registros — nenhum código novo lê, escreve ou expõe isso na UI (rotas,
service e páginas continuam removidos/redirecionados, ver acima), é
model-só-pra-não-perder-dado. `Organization.blueprints` também foi
restaurado como back-relation (senão o Prisma recusa validar o relacionamento
unilateral).

**Checklist de validação antes de subir isto:**
```
cd "C:\Users\woner\Desktop\Atlas QA"
pnpm --filter @qa-ai/api exec prisma generate
pnpm --filter @qa-ai/api exec prisma db push
pnpm --filter @qa-ai/shared build
pnpm --filter @qa-ai/api exec tsc --noEmit
pnpm --filter @qa-ai/web build
```
Com o model restaurado, o `db push` **não** deve mais pedir pra dropar
`Blueprint` — só a renomeação/recriação de `ProjectionTask.blueprintId` →
`remediationPlanId` (como não há `ProjectionTask` real gravado ainda,
funcionalidade nova ainda não usada em produção, aceitar como "novo campo" é
seguro). Se o prompt do `db push` mencionar `Blueprint` de novo por algum
motivo, **pare e não aceite** — avise antes de continuar. Depois do `db
push`, `git add` só dos arquivos específicos (nunca `-A`) + commit + push.
**Pendente, não fiz:** não exportei os 6 blueprints reais pra um JSON de
referência antes de tirar a UI do ar — quem quer que os tenha criado não
consegue mais vê-los no produto (a rota redireciona pra Aplicação), só
seguem existindo no banco. Se algum desses registros for de valor pra
alguém, valeria rodar uma consulta pra listar título/organização/data dos 6
e decidir se vale a pena reexpor de alguma forma (nem que seja um link
"exportar PDF" avulso) antes de considerar o assunto encerrado.

## Sessão 07-08/08/2026 — Gate obrigatório GitHub/GitLab + inspiração Strix

A pedido do usuário (mandou 3 prints do strix.ai): nenhuma análise roda mais
sem o projeto ter GitHub ou GitLab conectado, sem exceção (confirmado via
AskUserQuestion: "todas as análises, sem exceção"); GitLab configurado por
este agente (autorização explícita: "vc deve configurar, eu dou permissão
pra vc fazer"); inspiração de design do Strix registrada para trabalho futuro
de redesign; pentest/segurança deveria se aproximar do que o Strix faz, no
que for viável sem infraestrutura nova. **Mesma ressalva de sempre: sandbox
sem `bash` a sessão inteira — nada validado por `tsc`/build, só revisão
manual.**

1. **GitLab como segundo adapter push**, mesmo padrão do GitHub (token
   pessoal colado, não OAuth — decisão deliberada pra não precisar criar App
   OAuth novo): `GITLAB` adicionado ao enum `AdapterKind`
   (`packages/shared/src/enums.ts` + `schema.prisma`); `GitlabAdapter`
   (`apps/api/src/infrastructure/adapters/gitlab/gitlab-adapter.ts`) espelha
   `GithubAdapter` usando a API v4 do GitLab (`PRIVATE-TOKEN` header em vez de
   `Authorization: Bearer`), abre **Merge Request** em vez de Pull Request,
   nunca faz merge sozinho — mesmo checkpoint de aprovação humana do GitHub;
   `createAdapterFor()` (`adapters/index.ts`) resolve pelo `config.projectPath`
   (`namespace/repo` do GitLab, equivalente ao `owner`/`repo` do GitHub).
   `adapter-connection.service.ts`: `upsertGitlabConnection`/
   `getGitlabConnectionMasked`/`validateGitlabRepository` (valida contra
   `GET /projects/:id` da API do GitLab antes de salvar, mesma ideia do
   `validateGithubRepository`). Rotas `POST`/`GET
   /projects/:id/gitlab-connection` em `project.routes.ts`.
2. **Gate obrigatório** (`analysis.service.ts`): `RepoConnectionRequiredError`
   (400) — primeira checagem dentro de `start()`, antes de qualquer outra
   coisa, aplicada a **todas** as categorias (inclusive Análise QA padrão,
   que antes não dependia de nenhuma conexão). Consulta
   `prisma.adapterConnection.findFirst({ kind: { in: ["GITHUB", "GITLAB"] } })`
   pro projeto — se não achar nenhuma, recusa antes de enfileirar.
   `analysis.routes.ts` mapeia pra 400 `{ error: "RepoConnectionRequired" }`.
3. **Frontend:**
   - `GitlabConnectionPanel` (`components/gitlab-connection-panel.tsx`) —
     espelha `GithubConnectionPanel`, campos `projectPath`/`token` em vez de
     `owner`/`repo`/`token`, sem o card de webhook (GitLab não tem webhook
     configurado ainda, só o adapter push). Renderizado ao lado do
     `GithubConnectionPanel` em `/aplicacao` → "Conexões e integrações".
   - `useGitlabConnection`/`useConnectGitlab` (`lib/queries.ts`) e
     `getGitlabConnection`/`connectGitlab` (`lib/api.ts`) — mesmo padrão dos
     hooks do GitHub, invalidam `qk.adapterConnections` no sucesso pra tela
     de Análises refletir a conexão nova sem precisar recarregar.
   - **Tela de bloqueio em `/analyses`** (inspirada no "Connect your
     repositories" do Strix): se o projeto selecionado não tem conexão
     GITHUB/GITLAB (`useAdapterConnections`), o seletor de tipo de análise é
     substituído por um card centralizado explicando o motivo + dois botões
     ("Conectar GitHub"/"Conectar GitLab") que levam pra `/aplicacao` com o
     projeto pré-selecionado via query param. Botão "Iniciar análise" também
     fica desabilitado nesse estado como segunda trava (a de verdade
     continua sendo o gate do backend).
4. **Padrões de segurança novos inspirados no escopo de SAST/secrets do
   Strix**, adicionados ao Análise de Segurança via GitHub
   (`SOURCE_SECURITY_SCAN`), sem infraestrutura nova — só mais heurísticas
   textuais no mesmo formato já existente:
   - `insecure-patterns.ts`: TLS com verificação desabilitada
     (`rejectUnauthorized: false`/`NODE_TLS_REJECT_UNAUTHORIZED=0`), hash
     fraco (MD5/SHA1) perto de variável de senha, `Math.random()` usado pra
     token/segredo, path traversal em `fs.readFile`/`writeFile` com caminho
     concatenado, desserialização insegura (`node-serialize`/`unserialize`).
   - `secret-patterns.ts`: token do GitLab (`glpat-`), chave da OpenAI
     (`sk-...`), chave da Anthropic (`sk-ant-`), chave da Twilio, chave do
     SendGrid, token do npm.
   **Não fiz:** nenhuma varredura de infraestrutura como código (Strix cobre
   Terraform/K8s manifests) — exigiria parser específico, não é heurística
   textual simples; nenhum "PR security review" automático em push
   (webhook + IA rodando por evento) — o produto já tem
   `SOURCE_SECURITY_SCAN` sob demanda, rodar automaticamente a cada push
   exigiria um webhook novo + fila, escopo maior; nenhum scan de
   infraestrutura viva (nmap-like) — foge do escopo de "análise de site" que
   o produto tem hoje.
5. **Redesign visual inspirado no Strix** (Task #21) — **não iniciado nesta
   sessão**, deliberadamente adiado: exige decisões de design (cores, layout
   dos cards, tipografia) tela por tela, melhor feito numa sessão dedicada
   com o usuário podendo comentar cada tela, não em bloco autônomo sem
   supervisão.
6. **Testes ponta a ponta em produção do gate + GitLab** (Task #23) — **não
   executado nesta sessão**: exigiria conectar um repositório GitLab real de
   teste (token de verdade), e não havia um disponível/autorizado
   explicitamente nesta sessão além do que já foi feito. Fica como validação
   pendente antes de considerar o gate 100% confiável em produção.

**Checklist de validação antes de subir isto:**
```
cd "C:\Users\woner\Desktop\Atlas QA"
pnpm --filter @qa-ai/api exec prisma generate
pnpm --filter @qa-ai/api exec prisma db push
pnpm --filter @qa-ai/shared build
pnpm --filter @qa-ai/api exec tsc --noEmit
pnpm --filter @qa-ai/web build
```
Schema novo: só o valor `GITLAB` adicionado ao enum `AdapterKind` — aditivo,
sem risco de perda de dado. **Atenção:** depois de subir isto, TODA análise
(inclusive QA padrão) para de funcionar em qualquer projeto sem GitHub/GitLab
conectado — inclusive projetos antigos já em uso. Avisar isso é importante:
não é um bug se análises pararem de rodar depois do deploy, é o gate novo
funcionando como pedido. Depois do `db push`, `git add` só dos arquivos
específicos (nunca `-A`):
`apps/api/prisma/schema.prisma`,
`packages/shared/src/enums.ts`,
`apps/api/src/infrastructure/adapters/gitlab/gitlab-adapter.ts`,
`apps/api/src/infrastructure/adapters/index.ts`,
`apps/api/src/application/adapter-connection.service.ts`,
`apps/api/src/application/analysis.service.ts`,
`apps/api/src/presentation/routes/analysis.routes.ts`,
`apps/api/src/presentation/routes/project.routes.ts`,
`apps/api/src/modules/analysis/analyzers/source-security-scan/insecure-patterns.ts`,
`apps/api/src/modules/analysis/analyzers/source-security-scan/secret-patterns.ts`,
`apps/web/src/components/gitlab-connection-panel.tsx`,
`apps/web/src/app/(app)/aplicacao/page.tsx`,
`apps/web/src/app/(app)/analyses/page.tsx`,
`apps/web/src/lib/api.ts`,
`apps/web/src/lib/queries.ts`.

## Sessão 08/08/2026 (continuação, mesmo dia) — Mais cobertura de segurança inspirada no Strix

Continuação direta da sessão anterior, sem pausa (pedido explícito do
usuário de seguir trabalhando "sem parar"). Três adições de baixo risco ao
que já existia, todas heurística textual/payload de detecção — nenhuma
infraestrutura nova:

1. **Dockerfile/IaC leve** (`source-security-scan/dockerfile-patterns.ts`,
   novo) — 6 checagens: container rodando como root (sem `USER`), imagem
   base com tag `latest`, `ADD` de URL remota, segredo literal em
   `ENV`/`ARG`, instalação via `curl|sh` sem verificação, porta
   administrativa exposta (22/3389). Reconhece `Dockerfile` pelo nome do
   arquivo (`isDockerfilePath`), não por extensão — wireado em
   `source-security-scan.ts` (`hasScannableExtension` + `scanDockerfile`).
2. **Mais dependências com CVE conhecida** (`vulnerable-packages.ts`): vite,
   ws, semver (npm); urllib3, cryptography, jinja2 (pip); rails, nokogiri
   (bundler — corrigido de um `"gem"` inválido pro ecosystem real usado pelo
   `manifest-detector.ts`); laravel/framework (composer); spring-core
   (maven); golang.org/x/net (go).
3. **Mais padrões de segredo/código inseguro**
   (`secret-patterns.ts`/`insecure-patterns.ts`): token GitLab, chave
   OpenAI/Anthropic/Twilio/SendGrid, token npm; TLS com verificação
   desabilitada, hash fraco (MD5/SHA1) perto de senha, `Math.random()` pra
   token, path traversal em `fs.*`, desserialização insegura.
4. **Teste Ativo Autorizado — mais payloads de detecção**
   (`active-security-test/payloads.ts`): marcador NoSQL (`{"$ne": null}`),
   marcador de command injection com eco (`qa-probe; echo
   qa-probe-marker`), marcador SSRF (IP de metadata de nuvem), marcador XXE,
   marcador LDAP injection. `active-security-test.analyzer.ts` ganhou uma
   checagem nova específica: se o marcador de eco do command injection
   aparecer na resposta *sem* o resto do payload, é indício de execução real
   de comando — reporta CRITICAL.

**Não fiz nesta rodada** (fica pra quando o usuário puder revisar/priorizar
com calma, ou exigem infraestrutura que o produto não tem): scan de
Terraform/Kubernetes de verdade (parser dedicado); "PR/MR security review"
automático a cada push (exigiria webhook + fila); scan de infraestrutura
viva tipo nmap; qualquer coisa de compliance report (SOC2/ISO27001) — isso é
elaboração de relatório, não detecção, e mereceria uma sessão própria de
design de produto.

**Mesma ressalva de sempre: sandbox sem `bash` — nada validado por
`tsc`/build, só revisão manual.** Nenhuma mudança de schema nesta rodada —
só código dos analyzers, `pnpm --filter @qa-ai/api exec tsc --noEmit` deve
bastar (sem precisar de `db push`) antes de subir. Arquivos: `apps/api/src/
modules/analysis/analyzers/source-security-scan/dockerfile-patterns.ts`
(novo), `.../source-security-scan/source-security-scan.ts`,
`.../source-security-scan/vulnerable-packages.ts`,
`.../source-security-scan/secret-patterns.ts`,
`.../source-security-scan/insecure-patterns.ts`,
`.../active-security-test/payloads.ts`,
`.../active-security-test/active-security-test.analyzer.ts`.

## Sessão 08/08/2026 (continuação 2) — Mais superfície de ataque coberta (Segurança Avançada)

Mais uma rodada sem parar, focada em `deep-security/paths.ts` (Segurança
Avançada, categoria `DEEP_SECURITY`, 100% passiva — só GET, sem payload):

- `SECRET_PATHS`: mais variantes de `.env` (dev/staging), `appsettings.Development.json`,
  `config.yaml`/`config.yml`, `docker-compose.yml`, `.npmrc`, `.dockercfg`,
  `.htpasswd`, `firebase-adminsdk.json`, `service-account.json`, `gcp-key.json`.
- `BACKUP_PATHS`: `.rar`, `db.sqlite3`/`database.db`, `.DS_Store`, `web.config.bak`.
- `API_DOCS_PATHS`: `graphiql`, variantes de path de swagger/openapi.
- `ADMIN_PATHS`: `admin`, `administrator`, `django-admin`, `grafana`, `kibana`,
  `actuator`/`actuator/health` (Spring Boot), `console`, `_profiler` (Symfony).
- `DIR_LISTING_PATHS`: `backup/`, `backups/`, `media/`, `tmp/`.
- `VULNERABLE_JS_LIBS`: Vue 2 (CVE-2021-30469), Handlebars (CVE-2021-23383).

Mesma filosofia do resto do arquivo: só adiciona ao que já existia, nenhuma
categoria nova, nenhuma infraestrutura nova. **Não validado por
`tsc`/build** — revisão manual (é só uma lista de strings, risco de erro de
sintaxe é baixo, mas ainda não compilado). Corrigido no meio do caminho: um
caractere não-ASCII colado por engano em `SECRET_PATHS` foi removido antes
de seguir.

## Sessão 08/08/2026 (continuação 3) — Copy do site sincronizada

Última rodada desta sequência sem pausa: a copy pública (`public-copy.ts`,
homepage — seção "Módulos cobertos" e "Integrações reais") e a copy de
`/docs/funcionalidades` (`docs-copy.ts`) ainda diziam só "GitHub" e não
mencionavam Dockerfile/segredos nem o fato de que conectar repositório
virou obrigatório — desatualizada desde a sessão do gate. Corrigido nos 3
locales (en/pt/es): item vira "Análise de segurança via GitHub ou GitLab" /
"Security scan via GitHub or GitLab" / "Análisis de seguridad vía GitHub o
GitLab", descrição menciona Dockerfile e segredos, e adiciona a frase de que
conectar um repositório é obrigatório antes de rodar qualquer análise. O
item de integração "GitHub" também virou "GitHub ou GitLab" com a mesma
atualização de descrição.

**Não validado por build** — mesma ressalva de sempre, é só texto em array
de tuplas, risco de erro de sintaxe é baixo mas não compilado. Arquivos:
`apps/web/src/lib/docs-copy.ts`, `apps/web/src/lib/public-copy.ts`.

## Comparativo Strix x MuriOps (08/08/2026) — gaps reais, priorizado

Levantamento que ficou faltando nas sessões anteriores (item marcado como
feito sem ter sido escrito de fato — corrigido aqui). Baseado em busca web
sobre o strix.ai (fontes no fim desta seção), comparado com o estado atual
do módulo de segurança do MuriOps depois das sessões de 07-08/08.

**O que o Strix faz que o MuriOps também já faz, hoje:**
- Detecção de SQLi/NoSQLi/SSRF/XXE/command injection/SSTI via payload —
  MuriOps tem isso no Teste Ativo Autorizado (`active-security-test`,
  opt-in, com circuit breaker).
- Varredura de dependências vulneráveis e segredos commitados — MuriOps
  tem isso no `SOURCE_SECURITY_SCAN` via GitHub/GitLab.
- Exigir repositório conectado antes de rodar — os dois exigem.

**O que o Strix faz e o MuriOps NÃO faz — dividido por dá pra fazer sem
infra nova vs. exige arquitetura que o produto não tem:**

*Viável com o que já existe (candidatos a próxima sessão):*
- **Confirmação de exploit real (proof-of-concept)**: o Strix não só
  detecta um indício (ex.: marcador refletido) — ele efetivamente explora e
  produz uma prova funcional. O MuriOps só reporta indício/heurística
  (documentado como tal em cada achado). Fechar esse gap de verdade exigiria
  ir além de "detecção não-destrutiva" — decisão de produto explícita do
  usuário antes de qualquer código, porque muda o risco legal/operacional
  do Teste Ativo.
- **IDOR/lógica de negócio/CSRF mais profundo**: hoje o MuriOps só tem a
  heurística de formulário POST sem token oculto (`checkDomIssues`). Testar
  IDOR de verdade exigiria autenticação de sessão real no crawler, que o
  produto não tem (Análise roda sem login).

*Exige infraestrutura nova (fora de escopo por ora):*
- **PR/MR security review automático a cada push**: precisa de webhook do
  GitHub/GitLab + fila de processamento — hoje o `SOURCE_SECURITY_SCAN` só
  roda sob demanda, quando o usuário pede.
- **Autofix com PR pronta pra merge**: o MuriOps já tem o mecanismo de abrir
  PR/MR com o checklist de remediação (adapters GitHub/GitLab), mas não gera
  o *diff de código* pronto — só o plano em texto. Geraria o diff exigiria a
  IA escrever patch de código de verdade — uma IA commitando código sem
  supervisão humana é um risco que o produto não assumiu ainda.
- **Monitoramento contínuo de superfície de ataque**: o Fluxos Críticos já
  cobre monitoramento agendado de jornadas específicas (login/checkout), mas
  não é "descobrir e vigiar toda a superfície" automaticamente — exigiria um
  scheduler rodando o Teste Ativo/Segurança Avançada por conta própria, o
  que precisa de mais cuidado com consentimento (hoje é opt-in manual por
  análise).
- **Relatórios de compliance (SOC2/ISO27001/PCI DSS)**: isso é elaboração de
  relatório formatado pro padrão do framework, não detecção — trabalho de
  produto/design de documento, não código de scanner. Não iniciado.
- **Certificação SOC2/ISO27001 da própria MuriOps** (diferente de gerar
  relatório pro cliente): processo de compliance organizacional, não é
  código — fora do escopo de qualquer sessão de desenvolvimento.

**Recomendação de prioridade** (não implementado, só a lista ordenada por
impacto/esforço): 1) relatório de compliance simples (texto estruturado a
partir dos achados existentes, sem certificação nenhuma) seria o menor
esforço com maior valor percebido; 2) PR review automático via webhook é o
próximo salto de arquitetura mais natural, já que a infraestrutura de
adapter push já existe; 3) exploit confirmation e IDOR ficam por último —
mudam o perfil de risco do produto e merecem decisão explícita do usuário
antes de qualquer linha de código.

Fontes: [Strix Review 2026](https://appsecsanta.com/strix), [Strix — Autonomous Security for the AI Era](https://www.strix.ai/), [AI Penetration Testing — Strix](https://www.strix.ai/ai-penetration-testing)

## Sessão 09/08/2026 — Redesign objetivo inspirado no Strix (telas internas do app)

Depois de eu ter interpretado errado o pedido inicial (tinha mexido só na
copy da home, o usuário corrigiu: **"o designer semelhante ao strix é
dentro, não fora, dentro nas funcionalidades"**), apliquei o redesign nas
telas internas de verdade — Análises, Aplicação, Guardian e Monitoramento.
Padrão visual consistente em todas: título de seção vira label mono
minúsculo (`font-mono text-[11px] uppercase tracking-[0.14em]`) com um dot
colorido (`bg-primary`) na frente, em vez de `<h2 className="text-sm
font-semibold">` genérico; cards de seleção (tipo de análise, escopo de
aplicação) ganharam tag mono no canto e borda nítida no estado selecionado
em vez de fundo colorido suave — visual mais "terminal/objetivo", igual ao
que já era usado nos mockups de marketing (`feature-showcase.tsx`), agora
replicado nas telas reais.

1. **Bug real encontrado e corrigido nesta sessão** (não é do redesign, é
   pré-existente): `Button` do projeto (`components/ui/button.tsx`) não
   suporta a prop `asChild` (sem Radix Slot) — eu tinha usado `<Button
   asChild><Link>...</Link></Button>` no card de gate de `/analyses`, o que
   quebrou o `next build` em produção (só descoberto porque o usuário rodou
   o build antes do commit, como sempre pedido). Corrigido exportando
   `buttonVariants` do componente e trocando por `<Link
   className={buttonVariants(...)}>` — padrão que deve ser seguido daqui pra
   frente sempre que precisar de um link com aparência de botão.
2. **`/analyses`**: header "Nova análise" com dot+mono; os 4 cards de tipo
   de análise ganharam tag mono (QA/SEC/PEN/SRC) e borda nítida no
   selecionado; texto do card "Segurança via GitHub" atualizado pra
   "GitHub/GitLab" + menção a Dockerfile; card de gate de conexão com borda
   sólida fina em vez de tracejada.
3. **`/aplicacao`**: header "Criar aplicação a partir de um projeto" e botão
   de "Conexões e integrações" no mesmo padrão; os 3 cards de escopo
   ganharam dot indicator no selecionado em vez de fundo colorido forte.
4. **`/guardian`**: os 4 headers de seção (Regras de negócio, Google Drive,
   Nova auditoria, Agendamento automático) padronizados.
5. **`/monitoramento`**: os 2 headers de seção (Selecione o projeto, Fluxos
   deste projeto) padronizados.
6. **`/orquestracao`**: checado — não usa esse padrão de header
   (`text-sm font-semibold`), então não foi tocado. Se o usuário quiser o
   mesmo tratamento lá, precisa de um olhar específico na estrutura da
   página (não é o mesmo componente reaproveitado).

**Commits desta sessão** (todos com build local confirmado pelo usuário
antes do push): `ccddc77` (gate GitHub/GitLab + segurança,
2 arquivos — o resto já estava commitado de sessão anterior), `c9464fb`
(fix Button asChild + redesign Análises), `558290d` (redesign Aplicação),
`6de594b` (redesign Guardian), `6391db2` (redesign Monitoramento).

**Não fiz**: redesign de `/orquestracao`, `/projects`, `/atualizar`,
`/settings` — parei nas 4 telas mais centrais pro pentest/QA que o usuário
pediu. Se quiser expandir pra essas, é o mesmo padrão (`buttonVariants`
onde precisar de link-como-botão, header dot+mono, cards com tag/dot em vez
de fundo colorido) aplicado tela por tela.

## Sessão 09/08/2026 — Remoção do Guardian, decisão sobre Orquestração

Depois de eu apresentar uma avaliação honesta pilar por pilar (pedida
explicitamente pelo usuário, com aviso explícito de cuidado contra
alucinação/relatório sem embasamento — instrução que passa a valer pra
**todos** os relatórios futuros, não só esse), o usuário confirmou: **cortar
o Guardian por completo.** Justificativa aceita: diferente de todo o resto
do produto (Análise crawla o site real, Atualizar lê o manifesto real,
Fluxos Críticos executa contra o site real), o Guardian auditava um
documento de negócio colado/importado do Drive — fora da tese central do
produto (QA/segurança de *projetos de software*, não documentos de
negócio). Também **autorização em bloco pra decisões futuras**: (a) pode
apagar/mudar dados livremente daqui pra frente, porque o produto não tem
clientes reais ainda (só o usuário e amigos desenvolvedores usaram) — ao
contrário do precedente do Blueprint (6 registros reais, resolvido só
esvaziando código e retendo a tabela), aqui o usuário pediu remoção
completa dos dados também; (b) autorização explícita e sem ressalvas pra
implementar **confirmação real de exploit (proof-of-concept)** no Teste
Ativo Autorizado no futuro, aceitando a mudança de perfil de risco,
inspirado no Strix — **ainda não implementado nesta sessão**, é trabalho
maior que pede escopo próprio.

**O que foi removido (código + dados, sem retenção — diferente do
Blueprint):**
- Backend: `guardian.service.ts`, `guardian.routes.ts`,
  `guardian-drive.routes.ts`, `guardian-schedule.routes.ts`,
  `guardian-schedule.service.ts`, `guardian-prompt.ts`,
  `google-drive.service.ts` (Drive era só consumido pelo Guardian),
  `text-extractor.ts` (extração de PDF/Excel, idem) — todos esvaziados
  (`export {};`) pelo mesmo motivo de sempre (sandbox sem `rm`).
  `fastify/multipart` desregistrado de `app.ts` (só o upload do Guardian
  usava). `recoverStaleGuardianRuns` e o polling de agendamento removidos
  de `main.ts`.
- `AiProvider` (interface + Claude/OpenAI/Gemini/Noop): método
  `runGuardianCheck` removido dos 4 providers.
- Schema: modelos `GuardianRuleset`/`GuardianRun`/`GuardianSchedule` e enums
  `GuardianStatus`/`GuardianOverallStatus` removidos por completo (não
  retidos — dados reais apagados, autorizado explicitamente pelo usuário).
  Campos de Google Drive (`googleDriveRefreshTokenEncrypted` e os outros 3)
  removidos de `Organization`.
  **Cuidado que evitou quebrar Fluxos Críticos:** os campos de e-mail
  (`emailProvider`/`emailApiKeyEncrypted`/`emailFromAddress`) quase foram
  removidos junto por estarem documentados como "usados pelo agendamento do
  Guardian" — na real, `critical-flow.service.ts` **também** depende
  desses 3 campos pra mandar alerta de fluxo quebrado via Resend (ver seção
  de 06/08/2026 sobre Fluxos Críticos, que já dizia isso, só não tinha sido
  cruzado antes de mexer no schema). Verificado com Grep antes do `db push`
  e os 3 campos foram restaurados em `Organization` com comentário
  explicando a dependência cruzada. **Isso é o tipo de erro que só um Grep
  focado em "quem mais usa isso" evita** — lição direta do episódio do
  Blueprint (nunca confie em "acho que só X usa Y" sem checar).
- Frontend: `/guardian` e `/guardian/[id]` viraram `redirect("/dashboard")`
  (mesmo padrão do Blueprint — não quebra links salvos). Item de menu
  "Guardian" removido de `layout.tsx`. Hooks (`useGuardianRun` e ~20
  outros) e funções de API removidos de `queries.ts`/`api.ts`. Tipo
  `packages/shared/src/types/guardian.ts` esvaziado, removido do barrel
  `index.ts`.
- Home (`feature-showcase.tsx` + `public-copy.ts`, 3 locales): aba
  "Guardian" removida (`FEATURE_VISUALS`, `ACTIVE_NAV_ITEM`,
  `GuardianPreview`, `copy.features`), "Seis frentes" → "Cinco frentes"
  (`cycleTitle`/`cycleDescription` sem menção ao Guardian), card "Google
  Drive" removido de "Integrações reais" (Drive só existia pro Guardian),
  menção a "auditorias de documentos (Guardian)" removida da descrição do
  card de provedores de IA.
- `/docs/funcionalidades` (`docs-copy.ts`, 3 locales): seção "Auditoria de
  negócio"/"Business audit" removida, entradas "Google Drive" removidas da
  tabela de integrações (mesmo motivo — só existia pro Guardian).
- Configurações (`settings/page.tsx` + `settings.routes.ts`): o card
  "E-mail (Resend)" **não foi removido** (continua servindo Fluxos
  Críticos) — só a copy foi corrigida pra não citar mais "agendamentos do
  Guardian" como motivo de existir.
- `robots.ts`: a entrada `/guardian` no disallow **foi mantida** — a rota
  ainda existe como redirect, então continua fazendo sentido não indexá-la.

**Não fiz**: não apaguei fisicamente os arquivos esvaziados (sandbox sem
`rm` — mesma limitação de sempre, listar pro usuário rodar `git rm` quando
confirmar que nada mais importa deles). Não removi a migration histórica
`20260731000000_guardian_google_drive`/`20260803000000_guardian_core` do
diretório de migrations — é registro histórico do schema, sem efeito
funcional em diante.

**Checklist de validação antes de subir isto (mais arriscado que o normal
por causa da migration destrutiva de verdade — dados reais sendo
apagados, diferente do precedente do Blueprint):**
```
cd "C:\Users\woner\Desktop\Atlas QA"
pnpm --filter @qa-ai/api exec prisma generate
pnpm --filter @qa-ai/api exec prisma db push
pnpm --filter @qa-ai/shared build
pnpm --filter @qa-ai/api exec tsc --noEmit
pnpm --filter @qa-ai/web build
```
**Atenção ao prompt do `db push`:** ele vai avisar que vai dropar as
tabelas `GuardianRuleset`/`GuardianRun`/`GuardianSchedule` e colunas de
`Organization` (Drive + as que sobraram do Guardian) — isso é esperado e
autorizado (usuário confirmou explicitamente que não há clientes reais).
Se o prompt mencionar dropar `emailProvider`/`emailApiKeyEncrypted`/
`emailFromAddress` também, **pare e não aceite** — esses 3 foram
restaurados de propósito porque Fluxos Críticos depende deles; dropá-los
quebraria o alerta por e-mail de Fluxos Críticos silenciosamente. Depois
do `db push`, `git add` só dos arquivos específicos (nunca `-A`):
`apps/api/prisma/schema.prisma`,
`apps/api/src/presentation/app.ts`,
`apps/api/src/main.ts`,
`apps/api/src/application/guardian.service.ts`,
`apps/api/src/presentation/routes/guardian.routes.ts`,
`apps/api/src/presentation/routes/guardian-drive.routes.ts`,
`apps/api/src/presentation/routes/guardian-schedule.routes.ts`,
`apps/api/src/application/guardian-schedule.service.ts`,
`apps/api/src/infrastructure/ai/guardian-prompt.ts`,
`apps/api/src/application/google-drive.service.ts`,
`apps/api/src/infrastructure/documents/text-extractor.ts`,
`apps/api/src/infrastructure/ai/provider.ts`,
`apps/api/src/infrastructure/ai/claude-provider.ts`,
`apps/api/src/infrastructure/ai/openai-provider.ts`,
`apps/api/src/infrastructure/ai/gemini-provider.ts`,
`apps/api/src/infrastructure/ai/noop-provider.ts`,
`apps/api/src/presentation/routes/settings.routes.ts`,
`packages/shared/src/types/guardian.ts`,
`packages/shared/src/index.ts`,
`apps/web/src/app/(app)/guardian/page.tsx`,
`apps/web/src/app/(app)/guardian/[id]/page.tsx`,
`apps/web/src/app/(app)/layout.tsx`,
`apps/web/src/app/(app)/settings/page.tsx`,
`apps/web/src/lib/api.ts`,
`apps/web/src/lib/queries.ts`,
`apps/web/src/components/feature-showcase.tsx`,
`apps/web/src/lib/public-copy.ts`,
`apps/web/src/lib/docs-copy.ts`.

**Próximo passo combinado com o usuário (não iniciado ainda):** redesenhar
a Orquestração como uma "checagem geral" (all-analyse/reconciliação do que
foi aplicado vs. o que falta), em vez do ciclo autônomo atual — direção
acordada em conversa, mas sem nenhum código escrito ainda. Precisa de um
desenho concreto (o que exatamente essa tela mostra, que dado ela consome)
antes de começar a implementar.

## Sessão 09/08/2026 (continuação) — Orquestração → Reconciliação

Depois de remover o Guardian e o usuário aprovar o deploy, seguimos com a
segunda decisão da mesma conversa: o usuário perguntou se a Orquestração
(ciclo autônomo analisar→avaliar gates→gerar plano→aplicar→reanalisar) era
inútil, e propôs a alternativa de virar uma "checagem geral" — comparar o
que foi aplicado com o que falta. Concordei com o diagnóstico: era o
pilar mais over-engineered do produto (3 níveis de autonomia, máquina de
estados de 11 status, eventos, checkpoints) sem evidência de uso real, e a
proposta do usuário simplifica pra o que realmente importa — saber se a
última análise foi de fato aplicada. **Decisões confirmadas com o usuário
via AskUserQuestion:** escopo é só Análise↔Aplicação por enquanto (não
Atualizar/Fluxos Críticos ainda); a tela vive em `/projects/[id]`, não
numa rota separada; e os dados antigos (`OrchestrationRun`/
`OrchestrationEvent`/`autonomyLevel`) foram apagados por completo, não
retidos (mesmo espírito da decisão do Guardian — sem clientes reais).

**Arquitetura da Reconciliação: sem execução, sem estado, sem fila.**
Diferente de tudo que existia no orquestrador antigo, a Reconciliação não
grava nada — é uma função pura calculada a cada request:
`reconciliation.service.ts.getForProject()` pega a última `Analysis`
`COMPLETED` do projeto, busca os `RemediationPlan`s (via
`remediationService.list`) cujo `sourceType === "analysis"` e
`sourceId` bate com essa análise, soma itens aplicados/pendentes
(`RemediationSummary.itemCount`/`doneCount`, já existentes), e avalia os
`ProjectQualityGate`s do projeto contra o score dessa análise reusando
`evaluateQualityGates()` (`modules/analysis/quality-gates.ts` — já existia,
usado antes pelo orquestrador, sem nenhuma mudança). Devolve um
`ReconciliationStatus`: `no_analysis` (nunca rodou) → `no_plan` (análise
sem Aplicação gerada) → `pending_items` (Aplicação com itens faltando) →
`applied_gate_failing` (tudo aplicado mas score não bate o gate) →
`all_applied` (em dia).

- Schema: removidos por completo (sem retenção) — `model OrchestrationRun`,
  `model OrchestrationEvent`, `enum OrchestrationRunStatus`, `enum
  OrchestrationEventType`, `enum AutonomyLevel`, `Project.autonomyLevel`,
  `Project.orchestrationRuns`. `ProjectQualityGate` foi mantido (agora
  consumido pela Reconciliação). Tipos compartilhados: `orchestration.ts`
  esvaziado até sobrar só `QualityGateEvaluation`/`QualityGateDetail`/
  `ProjectQualityGate` (ainda em uso); tipo novo `reconciliation.ts`
  (`ReconciliationResult`/`ReconciliationStatus`) adicionado ao barrel.
- Backend: `orchestration.service.ts`, `orchestration.routes.ts` e
  `infrastructure/queue/orchestration-runner.ts` esvaziados (`export {};`).
  Novos: `application/reconciliation.service.ts` +
  `presentation/routes/reconciliation.routes.ts`
  (`GET /projects/:id/reconciliation`, única rota, só leitura).
  `app.ts`/`main.ts` atualizados (rota trocada, `recoverStaleOrchestrationRuns`
  removido do boot — sem execução, não há nada pra recuperar).
  **Duas dependências cruzadas encontradas e corrigidas** (mesma lição do
  Guardian — sempre fazer Grep de "quem mais usa isso" antes de apagar):
  `remediation.service.ts` chamava `notifyOrchestrationOfPlanUpdate()` via
  import dinâmico toda vez que um item de Aplicação mudava de status, pra
  avisar um run parado — removida (a Reconciliação não tem run pra
  retomar, é recalculada a cada leitura); `webhooks.routes.ts` chamava
  `onObservation()` no evento de PR merged do GitHub — removida a chamada,
  mas o webhook em si (validação de assinatura HMAC) foi mantido como base
  pra uso futuro. `project.routes.ts`/`project.service.ts`/
  `account.service.ts` perderam a rota/método/seleção de `autonomyLevel`.
- Frontend: `/orquestracao` virou `redirect("/projects")` (mesmo padrão
  Blueprint/Guardian). Item de menu "Orquestrações" removido de
  `layout.tsx`. Nova seção "Reconciliação" em `/projects/[id]` (antes de
  "Análises recentes"): badge de status, análise mais recente com score e
  "há N dias", contagem de itens aplicados/pendentes, detalhamento de gate
  reprovado quando aplicável, e botão contextual ("Enviar para Aplicação"
  quando `no_plan`, "Reanalisar" nos demais casos). Campo "Autonomia"
  removido do card "Sobre o projeto". `orchestration-panel.tsx` esvaziado
  (não era mais importado por lugar nenhum depois da mudança).
  `dashboard.tsx`: a seção "Histórico de orquestrações" (que listava runs)
  virou um card simples linkando pra Reconciliação na página do projeto —
  o dashboard consolidado não tenta replicar o cálculo, só aponta pra ele.
  `workspace-search.tsx`: entrada "Orquestrações" removida.
- Copy (`public-copy.ts`/`docs-copy.ts`, 3 locales): a aba "automatizar" no
  `FeatureShowcase` **não foi removida** (ficaria só 4 abas de resultado
  imediato + 1 de sistema) — foi **redefinida** pra Reconciliação, mesma
  posição, com heading/description/outcomes novos; `sideNav`/tabelas de
  `/docs/funcionalidades` perderam as 3 entradas de
  "Orquestração Manual/Supervisionada/Autônoma" e ganharam uma entrada só
  "Reconciliação"; `flowCards` de `/docs/guia` trocou "Orquestrar" por
  "Reconciliar".

**Não fiz:** não estendi a Reconciliação pra cobrir Atualizar (UpgradePlan)
nem Fluxos Críticos — combinado com o usuário que o escopo inicial é só
Análise↔Aplicação; dá pra generalizar depois se fizer sentido. Não criei
nenhuma tela consolidada "todos os projetos reconciliados" — cada projeto
mostra o próprio status em `/projects/[id]`, sem visão agregada ainda
(o dashboard só linka pra lá). Não apaguei fisicamente os arquivos
esvaziados nem a migration histórica `20260726000428_orchestration_core`
(mesma limitação de sempre — sandbox sem `rm`; a migration é só registro
histórico, sem efeito funcional).

**Checklist de validação antes de subir isto:**
```
cd "C:\Users\woner\Desktop\Atlas QA"
pnpm --filter @qa-ai/api exec prisma generate
pnpm --filter @qa-ai/api exec prisma db push
pnpm --filter @qa-ai/shared build
pnpm --filter @qa-ai/api exec tsc --noEmit
pnpm --filter @qa-ai/web build
```
O `db push` vai avisar que vai dropar `OrchestrationRun`/`OrchestrationEvent`
e a coluna `Project.autonomyLevel` — esperado e autorizado (mesma decisão do
Guardian: sem clientes reais usando o ciclo autônomo). Depois do `db push`,
`git add` só dos arquivos específicos (nunca `-A`):
`apps/api/prisma/schema.prisma`,
`packages/shared/src/enums.ts`,
`packages/shared/src/types/orchestration.ts`,
`packages/shared/src/types/reconciliation.ts`,
`packages/shared/src/types/project.ts`,
`packages/shared/src/index.ts`,
`apps/api/src/application/orchestration.service.ts`,
`apps/api/src/presentation/routes/orchestration.routes.ts`,
`apps/api/src/infrastructure/queue/orchestration-runner.ts`,
`apps/api/src/application/reconciliation.service.ts`,
`apps/api/src/presentation/routes/reconciliation.routes.ts`,
`apps/api/src/presentation/app.ts`,
`apps/api/src/main.ts`,
`apps/api/src/application/remediation.service.ts`,
`apps/api/src/presentation/routes/webhooks.routes.ts`,
`apps/api/src/application/project.service.ts`,
`apps/api/src/presentation/routes/project.routes.ts`,
`apps/api/src/application/account.service.ts`,
`apps/web/src/app/(app)/orquestracao/page.tsx`,
`apps/web/src/app/(app)/projects/[id]/page.tsx`,
`apps/web/src/app/(app)/layout.tsx`,
`apps/web/src/app/(app)/dashboard/page.tsx`,
`apps/web/src/components/orchestration-panel.tsx`,
`apps/web/src/components/workspace-search.tsx`,
`apps/web/src/components/feature-showcase.tsx`,
`apps/web/src/lib/api.ts`,
`apps/web/src/lib/queries.ts`,
`apps/web/src/lib/public-copy.ts`,
`apps/web/src/lib/docs-copy.ts`,
`CLAUDE.md`.

## Sessão 10/08/2026 — Gate de conexão vira tela de conectar, Fluxos Críticos simplificado, Continuous Coverage passivo

Usuário reportou, com prints do Strix (site deles + a interface real) e de
`atualizar`/`aplicacao` do próprio MuriOps: (1) tela de Atualizar quebrava
com erro cru quando o projeto não tinha GitHub/GitLab conectado, em vez de
direcionar pra conectar como o onboarding do Strix; (2) Fluxos Críticos
exigia preencher passo a passo manualmente, longe do "só clicar" do Strix;
(3) dúvida sobre o que a conexão MCP realmente faz e se funciona; (4) pedido
de "Scheduled pentesting" (reexecução agendada) na Análise de Segurança; (5)
pedido de selos ISO/SOC no produto; (6) pedido pra trazer Autonomous
Pentesting, PR Security Reviews, Auto-Fix, Continuous Coverage e
Infrastructure Testing, além de redesenhar a interface pra girar em torno do
projeto selecionado (como o dashboard do Strix depois de conectar um repo).
**Mesma ressalva de sempre: sandbox sem `bash` a sessão inteira — nada
validado por `tsc`/build, só revisão manual comparando com os padrões já
existentes.**

**1) Gate de conexão — corrigido.** Extraído `ConnectRepoPrompt`
(`components/connect-repo-prompt.tsx`, com o hook `useHasRepoConnection`) do
card que já existia em `/analyses`, e reaplicado em:
- `/atualizar`: o botão "Investigar tecnologias" (que gerava o erro do
  print) só aparece se o projeto tiver conexão; sem conexão, mostra o card
  "Conecte um repositório" com os dois botões (GitHub/GitLab) no lugar do
  botão fadado a falhar. Colar manifesto manualmente continua funcionando
  sem conexão nenhuma (não depende de repositório).
- `/monitoramento` (Fluxos Críticos): explicado no item 2 abaixo — o gate
  real ali é "precisa de uma Análise concluída" (que por sua vez já exige
  repo conectado), não uma cópia mecânica do card.
- `/aplicacao` não mudou — já tinha os dois cards GitHub/GitLab lado a lado
  desde a sessão do gate original (07-08/08), no padrão que o print 2 do
  Strix mostra.
`/analyses` foi refatorada pra usar o componente novo em vez do bloco
inline que tinha antes (mesmo comportamento, menos duplicação).

**2) Fluxos Críticos — sugestão automática, não mais formulário manual por
padrão.** Painel novo "Sugestões de monitoramento" no topo de
`/monitoramento`: lista as páginas descobertas na última Análise QA
concluída do projeto (`CrawledPage`, via `useAnalysis(id)` — hook novo em
`queries.ts`), marca como "Recomendado" as que batem palavra-chave de
jornada de negócio (login, checkout, carrinho, cadastro, contato, preço...)
e já vêm pré-selecionadas. Um clique em "Ativar monitoramento" cria um
`CriticalFlow` por URL marcada, **sem passos** — só verifica se a página
carrega. O builder manual antigo (passo a passo com seletor/valor/esperado)
não sumiu, virou "Fluxo customizado", pra quem realmente precisa de
interação (preencher login, clicar em finalizar compra).
- **Bug real corrigido nesse processo**: `flow-runner.ts` nunca checava o
  status HTTP da resposta — `page.goto()` do Playwright não rejeita em
  404/500, só em erro de rede/timeout. Um fluxo cuja única "checagem" é a
  `startUrl` (exatamente o caso das sugestões automáticas) sempre dava
  "Passou" mesmo com a página fora do ar. Adicionado `assertOkResponse()`,
  chamado depois do `goto()` inicial e de todo passo `NAVIGATE`, que falha
  em qualquer resposta >= 400. Isso também deixa fluxos manuais mais
  confiáveis, não só os automáticos.
  Como consequência: `steps` deixou de ser obrigatoriamente não-vazio —
  `critical-flow.service.ts.validateSteps()` e o zod schema de
  `critical-flow.routes.ts` (`createSchema`/`updateSchema`) aceitam array
  vazio agora (documentado inline no código).
- Se o projeto não tem nenhuma Análise concluída, o painel explica isso e —
  se também não tiver GitHub/GitLab conectado — mostra o `ConnectRepoPrompt`
  ali mesmo, porque a causa raiz de "sem sugestão" é sempre a mesma cadeia
  (sem repo → sem Análise → sem página descoberta).

**3) Resposta sobre MCP (sem código, só leitura de `mcp-server.ts` e
`mcp.routes.ts`):** a conexão MCP **não dá ao MuriOps acesso ao filesystem
local do usuário, e não aplica correção nenhuma sozinha**. É o oposto do que
a pergunta sugeria: o MuriOps é o *servidor* MCP; a ferramenta de IA de dev
do próprio usuário (Claude Code, Cursor, Windsurf) é quem se conecta como
*cliente*, chamando 3 tools (`get_analysis_summary`, `list_remediation_items`,
`mark_item_done`) pra ler o resumo da análise e o checklist de remediação —
a correção de código de verdade é feita pela ferramenta de dev do usuário,
rodando no ambiente dela, com acesso normal aos arquivos locais; o MCP só
avisa o MuriOps quando um item foi marcado como feito. Por leitura de
código, a rota (`StreamableHTTPServerTransport` stateless, uma instância de
server por request) segue o padrão oficial do SDK corretamente — mas
**nunca foi confirmada rodando de verdade** com um cliente MCP real; isso
continua fazendo parte da pendência #23 ("testar ponta a ponta em
produção"), que segue em aberto.

**4) Selos ISO/SOC — não implementado, e não vai ser sem uma certificação
real.** Explicado ao usuário: o MuriOps hoje não passou por nenhuma
auditoria SOC2/ISO27001 (o próprio comparativo Strix x MuriOps de 08/08/2026
já registrava isso como "fora do escopo de qualquer sessão de
desenvolvimento" — é processo organizacional, não código). Colocar esses
selos no produto sem a certificação de verdade por trás seria uma alegação
falsa de conformidade — risco real de credibilidade/legal, não só estético.
Alternativa honesta oferecida (não implementada ainda, depende de decisão
do usuário): um relatório de compliance em texto estruturado a partir dos
achados reais de Análise/Fluxos Críticos, deixando claro que é uma
autoavaliação, não uma certificação — é o item "relatório de compliance"
que o usuário escolheu como prioridade pra próxima sessão (ver abaixo).

**5) Continuous Coverage passivo — implementado como uma fatia segura do
pedido maior.** Perguntado ao usuário (AskUserQuestion) sobre 3 decisões de
risco antes de codar qualquer coisa dos 5 recursos estilo Strix:
- **Auto-Fix**: usuário escolheu "Implementar" (IA gerando diff de código
  pronto pra PR/MR). **Não implementado nesta sessão** — ver nota abaixo.
- **Continuous Coverage**: usuário escolheu "só pra Segurança Avançada
  (passiva)" — não reenviar o Teste Ativo Autorizado sozinho.
  **Implementado**: modelo novo `AnalysisSchedule` (categorias
  `DEEP_SECURITY`/`SOURCE_SECURITY_SCAN` só, `frequency`
  `DAILY`/`WEEKLY` — mais grosso que Fluxos Críticos de propósito, porque
  uma Análise crawleia o site inteiro com Playwright, bem mais pesado que
  checar uma URL, e o Render free tier tem pouca memória). Backend:
  `analysis-schedule.service.ts` (`list`/`create`/`update`/`remove`/
  `runDueSchedules`, mesma filosofia sem fila de `criticalFlowService`) +
  `analysis-schedule.routes.ts`, registrados em `app.ts`; polling de 30min
  em `main.ts` (`ANALYSIS_SCHEDULE_CHECK_MS`) chamando
  `analysisService.start()` — reusa o gate de conexão/consentimento que já
  existe lá, então um agendamento cuja conexão foi removida depois de criado
  só pula a rodada (log, não desativa sozinho). Validação de categoria
  **sempre no backend** (`SCHEDULABLE_CATEGORIES` em
  `packages/shared/src/types/analysis-schedule.ts`) — nunca confia só no
  frontend pra impedir agendar `ACTIVE_SECURITY_TEST`. Frontend: painel
  "Continuous Coverage — reexecução automática" em `/analyses`, abaixo do
  formulário de nova análise, só visível com projeto selecionado e
  conectado.
- Escolhas do usuário pra "próximo foco" (todas as 4 marcadas): PR Security
  Reviews automático, redesign "centrado no projeto", relatório de
  compliance, Infrastructure Testing (Terraform/K8s). **Nenhuma delas foi
  codada nesta sessão** — cada uma é um projeto de várias sessões por si só
  (webhook novo + fila pro PR review; reestruturação de toda a IA do app pro
  redesign; parser dedicado pra Infra Testing), e a mais arriscada de todas
  (Auto-Fix, que o usuário também aprovou) muda o perfil de risco do
  produto — a IA passaria a escrever código de verdade e abrir PR/MR com
  ele, ainda que sem merge automático. Implementar isso de forma apressada,
  numa sessão sem `tsc`/build funcionando pra validar, não é responsável.
  **Ficou como plano pra sessão(ões) seguintes, nesta ordem sugerida**: (a)
  relatório de compliance — menor risco, maior valor percebido, só
  reorganiza dado que já existe; (b) PR Security Reviews automático — reusa
  a infra de adapter push que já existe, só falta o webhook+fila; (c)
  redesign centrado no projeto — épico de UI, precisa de um desenho
  concreto tela por tela antes de codar (repositórios/issues agregados/PR
  reviews como páginas próprias, inspirado nos prints de
  `Interface Strix para usar de exemplo/`); (d) Infrastructure Testing e (e)
  Auto-Fix por último — os dois que mais mudam superfície de risco do
  produto (infra scanning é parser novo, Auto-Fix é IA escrevendo código
  sem supervisão prévia).

**Checklist de validação antes de subir isto:**
```
cd "C:\Users\woner\Desktop\Atlas QA"
pnpm --filter @qa-ai/api exec prisma generate
pnpm --filter @qa-ai/api exec prisma db push
pnpm --filter @qa-ai/shared build
pnpm --filter @qa-ai/api exec tsc --noEmit
pnpm --filter @qa-ai/web build
```
Schema novo: só o modelo `AnalysisSchedule` + enum `AnalysisScheduleFrequency`
+ relations em `Project`/`Organization` — aditivo, sem risco de perda de
dado, `db push` não deve pedir confirmação de nada destrutivo desta vez.
Depois do `db push`, `git add` só dos arquivos específicos (nunca `-A`):
`apps/api/prisma/schema.prisma`,
`packages/shared/src/types/analysis-schedule.ts`,
`packages/shared/src/index.ts`,
`apps/api/src/application/analysis-schedule.service.ts`,
`apps/api/src/presentation/routes/analysis-schedule.routes.ts`,
`apps/api/src/presentation/app.ts`,
`apps/api/src/main.ts`,
`apps/api/src/modules/critical-flow/flow-runner.ts`,
`apps/api/src/application/critical-flow.service.ts`,
`apps/api/src/presentation/routes/critical-flow.routes.ts`,
`apps/web/src/components/connect-repo-prompt.tsx`,
`apps/web/src/app/(app)/analyses/page.tsx`,
`apps/web/src/app/(app)/atualizar/page.tsx`,
`apps/web/src/app/(app)/monitoramento/page.tsx`,
`apps/web/src/lib/api.ts`,
`apps/web/src/lib/queries.ts`,
`CLAUDE.md`.

## Sessão 10/08/2026 (continuação, 15min) — Relatório de compliance

Primeiro item da ordem sugerida na seção anterior. `compliance-report.service.ts`
(novo) monta um documento a partir de dado real (última Análise + issues por
severidade/categoria, Fluxos Críticos ativos/falhando, agendamentos de
Continuous Coverage) — rota `GET /projects/:id/compliance-report`, tipo
`ComplianceReport` em `packages/shared`. Frontend:
`/projects/[id]/compliance` (link novo no `LocalNav` da página do projeto),
com aviso destacado no topo: **autoavaliação, não certificação** — mesma
cautela da decisão de recusar selos ISO/SOC falsos. Botão "Imprimir/Salvar
como PDF" usa `window.print()` — sem biblioteca de PDF nova, zero
dependência adicional. **Não validado por build** (sessão de 15min, sem
tempo pra rodar `tsc`/`next build`) — revisão manual seguindo os padrões
exatos de `reconciliation.service.ts`/`analysis-schedule.service.ts`.
Arquivos: `apps/api/src/application/compliance-report.service.ts` (novo),
`apps/api/src/presentation/routes/compliance-report.routes.ts` (novo),
`packages/shared/src/types/compliance-report.ts` (novo),
`packages/shared/src/index.ts`, `apps/api/src/presentation/app.ts`,
`apps/web/src/lib/api.ts`, `apps/web/src/lib/queries.ts`,
`apps/web/src/app/(app)/projects/[id]/compliance/page.tsx` (novo),
`apps/web/src/app/(app)/projects/[id]/page.tsx`.

**Validar antes do próximo passo (PR Reviews automático):**
```
cd "C:\Users\woner\Desktop\Atlas QA"
pnpm --filter @qa-ai/shared build
pnpm --filter @qa-ai/api exec tsc --noEmit
pnpm --filter @qa-ai/web build
```
Sem mudança de schema — não precisa de `db push`.

**Nota retroativa (não documentada na hora):** commit `2884979` ("Pausar/retomar
agendamentos e fluxos criticos", entre a sessão do Continuous Coverage e a do
Relatório de compliance) adicionou toggle Pausar/Retomar em `ScheduleRow`
(`/analyses`) e `FlowCard` (`/monitoramento`), usando `useUpdateAnalysisSchedule`/
`useUpdateCriticalFlow` (endpoints `PATCH` que já existiam sem UI). Registrando
aqui só pra fechar o buraco na documentação — sem código pendente disso.

## Sessão 10/08/2026 (continuação, 2ª) — PR Security Reviews automático

Item 6 da lista de pedidos originais desta sessão, priorizado pelo usuário via
`AskUserQuestion` junto com Auto-Fix/redesign/Infra Testing/relatório de
compliance. Comentário automático de segurança em toda PR (GitHub) ou MR
(GitLab) aberta ou atualizada — mesmo espírito do "PR Security Reviews" do
Strix. Ao contrário do que eu tinha avisado ao usuário como bloqueio de "não
cabe em 10 minutos", boa parte da infraestrutura necessária **já existia**
de uma sessão anterior (07-08/08/2026, gate obrigatório GitHub/GitLab):
`AdapterConnection.webhookSecretEncrypted` já era gerado e exibido na tela
pro GitHub (só faltava paridade no GitLab), e o webhook do GitHub já validava
assinatura HMAC de verdade — só não acionava nada. **Mesma ressalva de
sempre: sandbox sem `bash` — nada validado por `tsc`/build, só revisão
manual.**

**Decisão de escopo deliberada — scan por arquivo alterado, não por diff de
linha, e não o repositório inteiro.** Diferente de `SOURCE_SECURITY_SCAN`
(varre a árvore inteira na branch padrão), o novo scanner busca só os
arquivos que a PR/MR alterou (`GET /pulls/:n/files` no GitHub,
`GET /merge_requests/:iid/changes` no GitLab) e lê o conteúdo INTEIRO de
cada um desses arquivos no branch de origem — não só as linhas do diff/patch
— porque as heurísticas existentes (regex de segredo, padrão de código
inseguro) precisam de contexto de arquivo completo pra não dar falso
negativo num padrão que abre e fecha fora das linhas exatas alteradas.
Teto de 40 arquivos por execução (`MAX_PR_FILES`) — folgado o bastante pra
não truncar o caso comum, já que PRs tendem a ser bem menores que o
repositório inteiro.

**Reaproveitamento em vez de duplicação de regra:** em vez de copiar as
heurísticas de `source-security-scan.ts` pra um scanner novo (risco de
divergência — corrigir um padrão lá e esquecer de corrigir aqui),
`scanForSecrets`/`scanForInsecurePatterns`/`scanDockerfile`/
`MANIFEST_FILE_NAMES` ganharam `export` (mudança aditiva, comportamento do
scan existente de `SOURCE_SECURITY_SCAN` não muda em nada) e são chamadas
diretamente pelo novo `apps/api/src/modules/pr-review/pr-review-scan.ts`
(`scanGithubPullRequestFiles`/`scanGitlabMergeRequestFiles`), que só cuida
da parte específica de PR/MR: descobrir quais arquivos mudaram, baixar o
conteúdo de cada um no branch certo, e formatar `DetectedIssue[]` (campos
neutros de `category`/`fingerprint`, já que isso nunca persiste numa
`Analysis` — é só insumo pro comentário).

**Arquivos novos:**
- `apps/api/src/modules/pr-review/pr-review-scan.ts` — os dois scanners
  acima + `PrScanResult`.
- `apps/api/src/modules/pr-review/render-comment.ts` — `renderPrReviewComment()`,
  markdown agrupado por severidade (🔴 Crítico/🟠 Alto/🟡 Médio/🔵 Baixo),
  aviso explícito de que é heurística/indício, não confirmação de exploit —
  mesma cautela já usada em Teste Ativo Autorizado.
- `apps/api/src/application/pr-review.service.ts` — `reviewGithubPullRequest`/
  `reviewGitlabMergeRequest`: decripta o token da conexão, roda o scanner,
  posta o comentário via adapter.

**Adapters ganharam capacidade de comentário** (antes só tinham
`analyze()`/`apply()`): `GithubAdapter.commentOnPullRequest()` (API de
Issues — GitHub trata PR como Issue pra fins de comentário) e
`GitlabAdapter.commentOnMergeRequest()` (API de Notes).

**Webhooks:** `webhooks.routes.ts` (arquivo já existia, antes inerte) ganhou
duas mudanças: (1) o handler do GitHub agora dispara
`prReviewService.reviewGithubPullRequest()` em `pull_request` com action
`opened`/`synchronize`/`reopened`, sempre em background (`void ...
.catch(log)`) — não aguarda antes de responder 202, porque um scan pode
levar mais que o timeout de entrega de webhook (~10s do GitHub); (2) rota
nova `POST /webhooks/gitlab/:connectionId`, autenticação por
`X-Gitlab-Token` comparado com `timingSafeEqual` (GitLab não assina o corpo
como o GitHub — é um token compartilhado cru no header, mais simples),
disparando `reviewGitlabMergeRequest()` em `merge_request` com action
`open`/`update`/`reopen` (GitLab usa esses nomes sem "-ed", diferente do
GitHub).

**GitLab ganhou paridade de webhook secret com o GitHub:**
`upsertGitlabConnection` agora gera/preserva `webhookSecretEncrypted` (mesma
lógica de `upsertGithubConnection`: gera na primeira conexão, preserva em
atualizações seguintes pra não invalidar um webhook já configurado),
retorna `webhookSecret`+`webhookUrl` na resposta de conexão, e
`getGitlabConnectionMasked` expõe `webhookUrl` (nunca o secret de novo)
pra requests seguintes. `GitlabConnectionPanel` ganhou o mesmo bloco visual
de "copie a URL e o secret" que `GithubConnectionPanel` já tinha, com
o aviso de que isso ativa comentário automático em MRs.

**Consentimento — decisão deliberada de não criar um toggle novo separado.**
Diferente de Teste Ativo Autorizado (que tem um checkbox de consentimento
próprio no schema), aqui o ato de o usuário copiar a URL+secret e colar nas
configurações de webhook do GitHub/GitLab **é o próprio gesto de opt-in** —
sem isso configurado manualmente do lado do GitHub/GitLab, nenhum evento
chega no MuriOps. A copy nos dois painéis agora deixa explícito o que
acontece ("toda PR aberta ou atualizada recebe um comentário automático")
antes do usuário colar o webhook, pra decisão informada.

**Não fiz:**
- **Não edita/substitui um comentário anterior** — cada evento
  (`opened`/`synchronize`) posta um comentário NOVO, sem tentar achar e
  atualizar o comentário da rodada anterior (isso exigiria guardar um id de
  comentário por PR e uma chamada a mais pra buscar comentários existentes).
  `PR_REVIEW_COMMENT_MARKER` (`<!-- muriops-pr-security-review -->`) já fica
  no topo de cada comentário, preparado pra uma versão futura que queira
  localizar e editar em vez de duplicar.
- **Sem toggle de "pausar PR reviews sem desconectar o repositório"** — hoje
  a única forma de desativar é remover o webhook do lado do GitHub/GitLab
  (ou desconectar a conexão inteira, o que também para a Aplicação). Se
  virar um pedido real, o campo natural seria um `prReviewsEnabled Boolean`
  em `AdapterConnection` checado antes de chamar `prReviewService`.
- **Sem infra scanning nem confirmação de exploit** — fora de escopo desta
  tarefa especificamente (itens próprios na lista de prioridades do
  usuário, ver comparativo Strix x MuriOps).

**Checklist de validação antes de subir isto:**
```
cd "C:\Users\woner\Desktop\Atlas QA"
pnpm --filter @qa-ai/shared build
pnpm --filter @qa-ai/api exec tsc --noEmit
pnpm --filter @qa-ai/web build
```
Sem mudança de schema (`webhookSecretEncrypted` já existia na
`AdapterConnection` desde a sessão do gate GitHub/GitLab) — não precisa de
`db push`. Depois, `git add` só dos arquivos específicos (nunca `-A`):
`apps/api/src/modules/pr-review/pr-review-scan.ts`,
`apps/api/src/modules/pr-review/render-comment.ts`,
`apps/api/src/application/pr-review.service.ts`,
`apps/api/src/application/adapter-connection.service.ts`,
`apps/api/src/infrastructure/adapters/github/github-adapter.ts`,
`apps/api/src/infrastructure/adapters/gitlab/gitlab-adapter.ts`,
`apps/api/src/modules/analysis/analyzers/source-security-scan/source-security-scan.ts`,
`apps/api/src/presentation/routes/webhooks.routes.ts`,
`apps/api/src/presentation/routes/project.routes.ts`,
`apps/web/src/components/github-connection-panel.tsx`,
`apps/web/src/components/gitlab-connection-panel.tsx`,
`apps/web/src/lib/api.ts`,
`CLAUDE.md`.

**Teste ponta a ponta em produção ainda não feito** (mesma pendência #23 de
sempre) — validar de verdade exige um repositório real com o webhook
configurado à mão no GitHub/GitLab e uma PR/MR de teste. Fica como próximo
passo natural depois do deploy.

## Pendências conhecidas / próximos passos

1. **[Fase 2] Testar de ponta a ponta o que foi construído recentemente** —
   ✅ *Feito em 28/07/2026:* ciclo completo de Orquestração validado ao vivo
   (gate falhando → plano gerado → itens marcados pela ponte → retomada
   automática → **reanálise real** na iteração seguinte); fluxo "Atualizar →
   Enviar para Aplicação" validado (plano de upgrade vira `RemediationPlan`
   sem nova chamada de IA); ponte universal (`GET /apply/:token` + `PATCH
   .../items/:id`) validada; **login com Google confirmado ao vivo em
   produção** (29/07/2026 — ver item 2). **Falta ainda:** conectar um
   projeto real no GitHub (único adapter *push* que sobrou) e confirmar a
   aplicação automática (precisa de credenciais reais do usuário).
2. **[Fase 2] Configurar Google OAuth em produção** — ✅ *Concluído e
   confirmado em produção em 29/07/2026:* Client ID OAuth criado no Google
   Cloud Console (projeto `mystical-banner-424318-g1`, tipo "App da Web",
   origem JS autorizada `https://elevate-qa.vercel.app`), salvo como
   `GOOGLE_CLIENT_ID` no Render e `NEXT_PUBLIC_GOOGLE_CLIENT_ID` na Vercel;
   bug de CSP bloqueando `accounts.google.com` corrigido (commit `5a26492`,
   28/07/2026 à noite) e testado no navegador depois do usuário dar
   `git push` — botão "Continuar com o Google" renderiza,
   `window.google.accounts.id` carrega, fluxo abre normalmente. Pendência
   fechada.
3. **[Fase 2] Confirmar migrations em produção** — ✅ *Confirmado em
   28/07/2026:* `apps/api/Dockerfile` já roda `pnpm exec prisma migrate
   deploy` no `CMD`, antes de `node dist/main.js`, toda vez que o container
   sobe — automatizado, sem ação necessária.
4. **[Encerrado 07/08/2026] Wix, Squarespace, Webnode** — nunca chegaram a ser
   implementados como adapters (ficaram só citados aqui como possibilidade
   adiada). Usuário confirmou que não quer essa linha de trabalho — não
   considerar de novo a menos que ele peça explicitamente no futuro.
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
   **SSRF corrigido em 29/07/2026** (commit `e0d8e35`): criado
   `apps/api/src/infrastructure/security/url-guard.ts` (`assertPublicUrl()`)
   — resolve o hostname via DNS e bloqueia IPs privados/reservados (RFC1918,
   loopback, `169.254.0.0/16` incluindo metadata de nuvem, CGNAT, TEST-NETs,
   multicast, faixas IPv6 equivalentes) e hostnames tipo
   `localhost`/`*.local`/`*.internal`. Aplicado em dois pontos:
   `project.service.ts.create()` (feedback rápido no cadastro) e
   **`analysis.service.ts.start()`** — este é o que realmente importa, porque
   `StartAnalysisRequest.url` deixa sobrescrever a URL do projeto por
   request, então validar só no cadastro não bastava. Testado isoladamente
   com um script Node fora do repo (169.254.169.254, localhost, 127.0.0.1,
   10.x, 192.168.x, `[::1]` barrados; domínios públicos liberados — DNS real
   não pôde ser testado no sandbox por falta de acesso de rede direto, mas a
   lógica foi validada). **Gap remanescente, não coberto:** não intercepta
   redirects durante o crawl em si — o Playwright pode seguir um redirect
   pra um IP interno no meio da navegação, depois da checagem inicial passar.
   Fechar isso exigiria validar request a request dentro do engine de crawl;
   documentado no comentário do arquivo, não é bloqueante pra usar a
   correção atual (cobre o caso comum: registrar/pedir análise de uma URL
   interna direto).
   **Rodada 2 (29/07/2026, commit `32c32bc`) — 2 falhas de autorização
   cross-tenant, mesma classe (id vindo cru do request, gravado sem checar
   dono):**
   - **`orchestration.service.ts` (a mais grave de toda a revisão):**
     `create()` aceitava qualquer `adapterConnectionId` e
     `applyViaAdapter()` buscava a conexão com `findUnique({where:{id}})`,
     **sem filtro de organização/projeto**. Dava pra criar uma execução no
     próprio projeto passando o id de uma conexão de OUTRA organização — o
     orquestrador decriptava as credenciais dela (token do GitHub, senha de
     aplicativo do WordPress, access token da Shopify, senha do FTP) e
     chamava `apply()`, escrevendo de verdade no sistema de produção da
     vítima. Corrigido em duas camadas: validação na entrada (`create()` só
     aceita conexão do mesmo projeto+organização) e filtro por
     `organizationId`/`projectId` no próprio `applyViaAdapter()` — este
     segundo também fecha qualquer id cruzado já gravado no banco antes da
     correção.
   - **`blueprint.service.ts`:** `create()` gravava `input.projectId` sem
     validar dono; a referência cruzada vazava adiante porque
     `remediation.service.ts` → `loadSource()` copia `blueprint.projectId`
     direto pro `RemediationPlan.projectId`. Corrigido com a mesma validação
     que `upgrade.service.ts.create()` já fazia.
   Revisados sem bug na rodada 2: `dashboard.routes.ts`,
   `orchestration.routes.ts` (camada de rota estava correta — o furo era no
   service), `crawler.ts` (o BFS já restringe descoberta de links a
   `u.origin === origin`, então o crawl não passeia pra host interno por
   link de página — o gap de SSRF por redirect é mais estreito do que a
   nota anterior sugeria: sobra só um redirect na navegação inicial).
   **Rodada 3 (29/07/2026, commit `01543a7`) — engine + analyzers:**
   - `engine.ts`: os dois `.catch(() => [])` que engolem erro de analyzer
     (por página e de site) não logavam nada. Engolir é proposital (um
     módulo quebrado não pode derrubar a análise inteira), mas em silêncio
     era ruim justamente num produto de QA — uma categoria que quebrou
     ficava indistinguível de uma que rodou e não achou nada, e o relatório
     dizia "sem problemas" pra uma checagem que nem executou. Agora loga
     antes de seguir.
   - `probes.ts`: `probeAllowedMethods()` usava `fetch` com redirect padrão
     (*follow*), diferente do `probeGet()` logo acima que já usava
     `redirect: "manual"`. Como a URL analisada é escolhida por quem usa o
     app, um site respondendo 30x pra rede interna faria a sonda seguir pra
     lá — furando o `url-guard` que só valida a URL inicial. Alinhado.
   - `engine.ts`: comentário obsoleto de `EngineInput.aiOverride` dizia "se
     ausente, usa a configuração do servidor" — não existe mais chave padrão
     do servidor. Corrigido.
   Revisados sem bug na rodada 3: `analyzers/index.ts`, `helpers.ts`,
   `fingerprint.ts`, `types.ts`, `probeGet`/`probeCertificate`/`probeDns`
   (já passivos, com timeout e redirect manual), `analysis-runner.ts`
   (o `persist()` sem `$transaction` interativo é intencional e está
   documentado no próprio arquivo — limitação do PgBouncer do Supabase).
   **Revisão de backend da Fase 3 concluída.** Se for retomar, o que sobra é
   o conteúdo/qualidade das regras de cada analyzer individual (UI, SEO,
   acessibilidade etc.) — que é trabalho de produto, não de bug/segurança.
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
   referenciado em nenhum lugar do código — inofensivo. **Atualização
   30/07/2026:** WordPress, Shopify e FTP também foram removidos em algum
   momento depois desta nota (não documentado por quem fez) — hoje só
   restam MANUAL_BRIDGE, MCP e GITHUB. Ver correção na seção 4 acima.

## Sessão 10/08/2026 (madrugada, autônoma) — Infrastructure Testing, pausar PR Reviews, Auto-Fix de ponta a ponta

O usuário avisou que ia dormir e pediu trabalho autônomo "até acabar os
tokens", resolvendo tudo que faltava do projeto, com permissão explícita pra
usar navegador/GitHub/Render/Vercel se precisasse, e instrução explícita de
**não parar pra perguntar** — decisões tomadas por conta própria, sem
confirmação, quando não havia resposta óbvia. **Mesma ressalva de sempre:
sandbox sem `bash` a sessão inteira — nada validado por `tsc`/build, só
revisão manual.** Diferente de sessões anteriores, essa revisão manual
**encontrou e corrigiu 2 bugs reais** antes de entregar (ver item 4) — vale
destacar porque é evidência de que a revisão sem compilador vale a pena, não
é só formalidade.

1. **Smoke-test de produção (sem login, sem credenciais).** Confirmado via
   Render/Vercel (sessões de navegador já autenticadas, nenhuma credencial
   digitada) que o deploy do commit anterior (PR Security Reviews automático,
   `436a275`) subiu sem erro. Na tela de login do MuriOps o navegador tinha
   autofill de e-mail/senha prontos — **recusado deliberadamente clicar em
   "Entrar"**, mesmo com permissão ampla do usuário pra usar o navegador: a
   proibição de nunca submeter senha/credencial vale mesmo quando é autofill
   (não foi eu quem digitou) e mesmo com autorização explícita do usuário —
   é uma trava que o usuário não pode desligar pedindo.
2. **Infrastructure Testing — Terraform/Kubernetes** (`infra-patterns.ts`,
   novo): mesma filosofia heurística leve do resto do módulo (sem parser
   HCL/YAML de verdade, sem chamar API de nuvem) — 6 padrões Terraform
   (ingress liberado pra `0.0.0.0/0`, todas as portas abertas, bucket S3
   público, IAM com `Action`/`Resource` coringa, RDS publicamente acessível,
   backend S3 sem `encrypt = true`) e 6 padrões Kubernetes (container
   privileged, `hostNetwork`, `hostPID`, `runAsUser: 0`, Deployment/Pod sem
   `resources.limits`, manifest `kind: Secret` commitado). Wired em dois
   scanners: o de repositório inteiro (`SOURCE_SECURITY_SCAN`,
   `source-security-scan.ts`) e o escopado a PR/MR (`pr-review-scan.ts`, ver
   item 3) — os dois chamam as mesmas funções exportadas
   (`scanTerraform`/`scanKubernetes`/`isTerraformPath`/`isKubernetesManifest`),
   sem duplicar regra.
3. **PR Reviews: toggle `prReviewsEnabled`** (schema aditivo em
   `AdapterConnection`, default `true`) — pausa o comentário automático em
   PR/MR sem precisar desconectar o repositório inteiro (o que também
   pararia Aplicação) nem remover o webhook manualmente do lado do
   GitHub/GitLab. `adapter-connection.service.ts.setPrReviewsEnabled()`
   (escopado por organização — segue a mesma lição de nunca confiar num id
   cru sem checar dono, da rodada 2 da revisão de segurança de 29/07),
   rota `PATCH /projects/:id/adapter-connections/:kind/pr-reviews`,
   `pr-review.service.ts` checa o campo antes de scanear/comentar, botões
   Pausar/Retomar nos dois painéis de conexão (GitHub/GitLab).
4. **Auto-Fix — ponta a ponta, incluindo uma descoberta importante.**
   Investigando onde conectar o Auto-Fix, descobri que **`adapter.apply()`
   (abrir PR/MR real a partir de um item de remediação) estava
   completamente desconectado do resto do app** — `createAdapterFor` só era
   importado dentro do próprio módulo de adapters, nenhum service/rota
   chamava. Quase certamente efeito colateral da sessão de remoção da
   Orquestração (09/08/2026), que apagou `applyViaAdapter` sem repor o
   caminho equivalente em Aplicação. Tratei religar isso como pré-requisito
   do Auto-Fix (sem isso, Auto-Fix não teria por onde ser acionado) e fiz os
   dois juntos:
   - `AiProvider.generateCodeFix(input): Promise<CodeFixResult | null>` novo
     nos 4 providers (`code-fix-prompt.ts`: pede o ARQUIVO INTEIRO já
     corrigido, não um diff — decisão de segurança deliberada, aplicar diff
     exige casar linha exata sem compilador pra validar, sobrescrever o
     arquivo inteiro é o mesmo formato que a API do GitHub/GitLab já espera;
     `NoopProvider` sempre devolve `null`, Auto-Fix desligado sem chave de
     IA configurada, resto do fluxo intacto).
   - `GithubAdapter`/`GitlabAdapter` ganharam `getFileContent(path, ref)` e
     `apply()` passou a aceitar `options?: AdapterApplyOptions` com
     `generateFix` opcional (injetado por quem chama, nunca importado direto
     pelo adapter — mantém o adapter desacoplado de qual provider de IA está
     em uso). Só tenta corrigir arquivo que **já existe** no repositório
     (nunca cria arquivo novo por adivinhação da IA); qualquer falha é
     engolida e o checklist/PR sai do mesmo jeito, com ou sem Auto-Fix.
   - `remediation.service.ts.applyItemViaAdapter()` (novo) + rota
     `POST /remediation-plans/:id/items/:itemId/apply-via-adapter` — busca a
     conexão GITHUB/GITLAB do projeto do plano, chama `adapter.apply()`
     injetando `generateFix` (que chama `ai.generateCodeFix`, com fallback
     automático pro `NoopProvider` quando a organização não tem chave — sem
     branch condicional separado pra isso, o comportamento certo já é o
     padrão), grava `appliedReference`/`autoFixApplied` no item.
   - Frontend: botões "Aplicar via GitHub"/"Aplicar via GitLab" por item em
     `/aplicacao/[id]`, visíveis só quando o plano tem projeto vinculado E o
     projeto tem a conexão correspondente (`useAdapterConnections`); link
     "Ver PR/MR" quando `appliedReference` existe; badge "Auto-Fix sugerido"
     quando `autoFixApplied` é `true`.
   - **Bug pego no self-review, corrigido antes de documentar:** a primeira
     versão do `applyItemViaAdapter` marcava o item como `status: "done"`
     assim que a PR/MR era aberta — errado, porque abrir a PR/MR não é
     aplicar de verdade (o adapter nunca faz merge sozinho, é só o
     checkpoint de aprovação humana). Isso deixaria o item esmaecido/riscado
     na tela como se já estivesse resolvido antes de qualquer revisão
     acontecer. Corrigido: `applyItemViaAdapter` grava só
     `appliedReference`/`autoFixApplied`, o `status` continua controlado
     manualmente (mesmo toggle que já existia) — o usuário marca "Feito"
     depois de confirmar o merge, igual ao resto do checklist.
5. **Segundo bug pego no self-review, mais grave (quebraria o build
   inteiro):** `source-security-scan.ts` tinha `export export function
   scanTerraform(...)` — `export` duplicado, erro de sintaxe TypeScript que
   faria `tsc --noEmit`/`next build` falharem de cara. Corrigido pra
   `export function scanTerraform(...)`. Como não há `tsc` neste sandbox,
   esse tipo de erro só aparece na revisão manual linha a linha — reforça
   por que a tarefa de self-review (que quase foi pulada por pressa) importa
   de verdade, não é só formalidade da rotina do projeto.

   **Correção adicional, pego só no `tsc --noEmit` real do usuário (não na
   revisão manual):** `scanForInsecurePatterns` no mesmo arquivo ficou sem
   `export` — as outras três funções (`scanForSecrets`, `scanDockerfile`,
   `scanKubernetes`) ganharam durante a criação de `pr-review-scan.ts`, essa
   passou despercebida mesmo na revisão linha a linha. `pr-review-scan.ts`
   importa as quatro do mesmo lugar; sem o `export` o `tsc --noEmit` do `api`
   falhava com `TS2459`. Corrigido (`export function scanForInsecurePatterns`).
   Prova de que a revisão manual sem compilador, por mais cuidadosa, não
   substitui rodar o `tsc` de verdade — bom lembrete pra próximas sessões
   sem sandbox: tratar essas revisões como redução de risco, não garantia.

   **Deploy confirmado, 11/08/2026 de manhã:** o usuário rodou o checklist
   completo no terminal dele (`prisma generate` → `db push` → `shared build`
   → o `tsc --noEmit` acima, que pegou o `TS2459` → correção → `tsc --noEmit`
   limpo → `web build` limpo) e fez commit + push — commit `fdb32f8`
   (`436a275..fdb32f8`), 27 arquivos alterados. Render e Vercel devem pegar o
   deploy automaticamente a partir daqui.
6. **Revisão de segurança própria feita nesta sessão (task de self-review),
   sem mais achados além dos dois acima:** reli
   `pr-review-scan.ts`/`render-comment.ts`/`pr-review.service.ts`,
   `webhooks.routes.ts` (assinatura HMAC do GitHub e token cru do GitLab,
   ambos comparados com `timingSafeEqual`), `adapter-connection.service.ts`
   (`setPrReviewsEnabled` escopado por organização), `infra-patterns.ts`,
   `code-fix-prompt.ts` e os 4 providers de IA — sem outros bugs
   encontrados. Não achei nenhum vazamento de segredo em log, path
   traversal novo, nem SSRF novo introduzido por este trabalho.

**Checklist de validação antes de subir isto (a mais arriscada desta
madrugada por causa do Auto-Fix escrever em repositório real do usuário —
recomendo testar num repositório de teste antes de usar em produção com
código real):**
```
cd "C:\Users\woner\Desktop\Atlas QA"
pnpm --filter @qa-ai/api exec prisma generate
pnpm --filter @qa-ai/api exec prisma db push
pnpm --filter @qa-ai/shared build
pnpm --filter @qa-ai/api exec tsc --noEmit
pnpm --filter @qa-ai/web build
```
Schema novo: só `AdapterConnection.prReviewsEnabled` (Boolean, default
`true`) — aditivo, sem risco de perda de dado. **Atenção ao `tsc --noEmit`
do `api`:** o bug do `export export` foi corrigido nesta sessão, mas como
nada rodou por compilador de verdade, vale rodar esse comando primeiro e
conferir que não sobra nenhum outro erro de sintaxe antes de seguir pros
próximos passos. Depois, `git add` só dos arquivos específicos (nunca
`-A`):
`apps/api/prisma/schema.prisma`,
`packages/shared/src/types/adapter.ts`,
`packages/shared/src/types/remediation.ts`,
`apps/api/src/modules/analysis/analyzers/source-security-scan/infra-patterns.ts`,
`apps/api/src/modules/analysis/analyzers/source-security-scan/source-security-scan.ts`,
`apps/api/src/modules/pr-review/pr-review-scan.ts`,
`apps/api/src/application/adapter-connection.service.ts`,
`apps/api/src/application/pr-review.service.ts`,
`apps/api/src/application/remediation.service.ts`,
`apps/api/src/presentation/routes/project.routes.ts`,
`apps/api/src/presentation/routes/remediation.routes.ts`,
`apps/api/src/infrastructure/ai/code-fix-prompt.ts`,
`apps/api/src/infrastructure/ai/provider.ts`,
`apps/api/src/infrastructure/ai/claude-provider.ts`,
`apps/api/src/infrastructure/ai/openai-provider.ts`,
`apps/api/src/infrastructure/ai/gemini-provider.ts`,
`apps/api/src/infrastructure/ai/noop-provider.ts`,
`apps/api/src/infrastructure/adapters/github/github-adapter.ts`,
`apps/api/src/infrastructure/adapters/gitlab/gitlab-adapter.ts`,
`apps/web/src/components/github-connection-panel.tsx`,
`apps/web/src/components/gitlab-connection-panel.tsx`,
`apps/web/src/lib/api.ts`,
`apps/web/src/lib/queries.ts`,
`apps/web/src/app/(app)/aplicacao/[id]/page.tsx`,
`apps/web/src/lib/docs-copy.ts`,
`apps/web/src/lib/public-copy.ts`,
`CLAUDE.md`.

**Não fiz / pendências:** teste ponta a ponta em produção do fluxo completo
(webhook real recebido, PR de teste comentada, Auto-Fix commitando de
verdade num repositório) — segue como parte da mesma pendência #23 de
sempre ("testar ponta a ponta em produção"), agora ainda maior porque cobre
mais superfície nova. Sem toggle de "pausar PR reviews" que sobreviva a uma
reconexão do zero (é por conexão, não por projeto — reconectar recria com
`prReviewsEnabled: true` de novo, comportamento aceitável mas não
documentado até agora). Infrastructure Testing não tem teste automatizado
nenhum rodado contra Terraform/Kubernetes real — só revisão de regex por
leitura.

## Sessão 10/08/2026 (continuação, 3ª) — Login direto via OAuth pro GitHub e GitLab

Pedido do usuário: acabar com a exigência de colar um Personal Access Token
manualmente pra conectar GitHub/GitLab — "isso é bem amador, resolva já essa
questão do login pra facilitar e ficar como login direto... tanto para
github quanto para gitlab", com permissão explícita pra usar o navegador.
Troca completa pelo fluxo clássico OAuth 2.0 authorization code (App OAuth
"clássica" em cada provedor, não GitHub App instalável nem GitLab App
genérica) — o usuário clica em "Conectar com GitHub/GitLab", autoriza na
tela do próprio provedor com a conta dele, e a conexão (incluindo o webhook
de PR Security Reviews) fica pronta sozinha, sem copiar/colar token nem
secret manualmente depois da configuração inicial (essa, sim, feita uma
única vez em produção). **Mesma ressalva de sempre nas partes que não
puderam ser buildadas: sandbox sem `bash`/disco a maior parte desta sessão
— revisão manual, não validação de compilador. Onde diz "testado ao vivo",
foi de verdade, pelo navegador.**

**Backend (App OAuth de cada provedor + troca de código por token):**
- Schema: campos OAuth novos em `AdapterConnection` (access/refresh token
  criptografados, expiração, `oauthAccountLabel` pra mostrar "Conectado como
  X" na UI) — mesmo padrão AES-256-GCM de `secret-box.ts` já usado em toda
  credencial do produto.
- `apps/api/src/infrastructure/oauth/github-oauth-client.ts` /
  `gitlab-oauth-client.ts` (novos): cliente HTTP puro do fluxo OAuth de cada
  provedor (monta a URL de autorização, troca `code` por token, busca o
  login da conta pra exibir, lista repositórios/projetos acessíveis) — sem
  Prisma nem `secret-box` aqui de propósito, só pra
  `adapter-connection.service.ts` poder importar a parte pura sem criar
  dependência circular entre services.
- `apps/api/src/application/github-oauth.service.ts` /
  `gitlab-oauth.service.ts` (novos): orquestram sessão/estado/persistência —
  `buildAuthUrl` (com um `state` assinado, mesmo padrão HMAC usado no Google
  Drive), `handleCallback` (troca code por token, guarda numa sessão OAuth
  temporária em memória, redireciona de volta pro frontend com um id de
  sessão na query string — nunca com o token em si), `listAccessibleRepos`/
  `listAccessibleProjects`, `selectRepo`/`selectProject` (grava a
  `AdapterConnection` de verdade só quando o usuário escolhe o
  repositório/projeto certo no seletor).
- `apps/api/src/presentation/routes/adapter-oauth.routes.ts` (novo): rotas
  autenticadas (`/projects/:id/github-oauth/start`, `/repos`,
  `/select-repo`, espelhado pro GitLab) + rotas **públicas** separadas
  (`adapterOAuthCallbackRoutes`, registradas à parte porque o callback é o
  provedor redirecionando o navegador do usuário, sem Authorization header)
  que recebem o `code`, chamam `handleCallback`, e redirecionam pro
  frontend (`${PUBLIC_WEB_URL}/aplicacao?view=connections&githubOAuthSession=...`
  ou `?oauthError=...`).
- **Webhook do PR Security Reviews configurado automaticamente.** Antes
  (sessão anterior) o usuário tinha que copiar URL+secret do painel e colar
  manualmente nas configurações de webhook do GitHub/GitLab. Agora
  `github-adapter.ts`/`gitlab-adapter.ts` ganharam `ensureWebhook()`,
  chamado no fim de `selectRepo`/`selectProject`: cria o webhook via API do
  próprio provedor (`POST /repos/:owner/:repo/hooks` no GitHub,
  `POST /projects/:id/hooks` no GitLab) usando o token OAuth recém-obtido,
  sem exigir nenhuma ação manual do usuário depois de escolher o
  repositório. `res.webhookConfiguredAutomatically` sinaliza isso pro
  frontend mostrar um toast em vez do bloco de "copie a URL e o secret" (que
  continua existindo só no caminho manual/token colado).
- `env.ts`: 6 variáveis novas — `GITHUB_OAUTH_CLIENT_ID`/
  `GITHUB_OAUTH_CLIENT_SECRET`/`GITHUB_OAUTH_REDIRECT_URI`,
  `GITLAB_OAUTH_CLIENT_ID`/`GITLAB_OAUTH_CLIENT_SECRET`/
  `GITLAB_OAUTH_REDIRECT_URI` — todas opcionais (sem elas, o botão de OAuth
  informa "não configurado" e o formulário de token manual continua
  funcionando normalmente, mesmo espírito do resto do produto onde nada tem
  fallback silencioso). `githubOAuthRedirectUri()`/`gitlabOAuthRedirectUri()`
  caem pra `${apiBaseUrl}/adapter-connections/<provider>/oauth/callback`
  quando a variável de redirect não está setada.

**Frontend (popup + seletor de repositório):**
- Padrão popup + `postMessage`: `connectWithOAuth()` abre a popup
  (`window.open`) **de forma síncrona no clique** (senão o navegador
  bloqueia como pop-up — perde o "user activation"), só define a URL de
  destino depois que a mutation `start` resolve (`popup.location.href =
  res.authUrl`). A popup segue o redirect inteiro (frontend → backend
  `/oauth/start` → tela de consentimento do provedor → backend
  `/oauth/callback` → frontend `/aplicacao?...OAuthSession=...`). A própria
  página `/aplicacao`, ao carregar DENTRO da popup, detecta
  `window.opener`, repassa o resultado via `postMessage` (origem validada
  contra `window.location.origin`) e se fecha sozinha — o usuário nunca vê
  essa tela carregar de fato.
- `apps/web/src/app/(app)/aplicacao/page.tsx`: `useEffect` novo que lê
  `githubOAuthSession`/`gitlabOAuthSession`/`oauthError` da query string e
  faz o relay acima.
- `apps/web/src/components/github-connection-panel.tsx` /
  `gitlab-connection-panel.tsx` (reescritos): botão primário "Conectar com
  GitHub/GitLab" no topo; ao voltar da popup com sessão válida, mostra um
  seletor listando os repositórios/projetos acessíveis pela conta
  autorizada (`useGithubOAuthRepos`/`useGitlabOAuthProjects`), um clique
  grava a conexão (`useSelectGithubOAuthRepo`/`useSelectGitlabOAuthProject`).
  O formulário antigo de colar token não foi removido — virou um
  `<details>` recolhido "Prefere colar um token pessoal manualmente?",
  fallback pra quando OAuth não está configurado no ambiente ou o usuário
  simplesmente prefere token. Estado conectado mostra "Conectado via GitHub
  como <login>" quando veio de OAuth, ou o token mascarado de sempre quando
  veio do caminho manual.

**Resposta à pergunta de segurança do usuário** ("isso vai fazer ser
possível qualquer pessoa logar com a conta do GitHub fácil?"): não — o
login no MuriOps em si não mudou (e-mail/senha ou Google, inalterado). O
que mudou é só a forma de autorizar o MuriOps a acessar um repositório
específico: antes exigia gerar e colar um token manualmente, agora é um
"Autorizar" na tela do próprio GitHub/GitLab, que só a pessoa dona daquela
conta (com a sessão/2FA dela) consegue aprovar — e só depois de já estar
logada no MuriOps e dona do projeto. O Client Secret nunca sai do backend.
Resumo dado ao usuário: "Sim" — a conexão ficou mais direta/fácil, sem
abrir brecha de segurança nova.

**Testado ao vivo em produção, GitHub:** App OAuth criada em
github.com/settings/developers (Client ID `Ov23liT0F39aFKdMWEXX`, callback
`https://api.muriops.com.br/adapter-connections/github/oauth/callback`),
Client ID/Redirect URI adicionados no Render pelo agente, Client Secret
colado pelo usuário, deploy `Live` — confirmado funcionando porque uma
Análise QA padrão com `SOURCE_SECURITY_SCAN` rodou de verdade no projeto do
usuário logo em seguida (essa categoria só roda com GitHub/GitLab
conectado, gate obrigatório de 07-08/08/2026).

**GitLab, backend configurado e confirmado, frontend ainda não:** App OAuth
criada em gitlab.com/-/user_settings/applications (nome "MuriOps",
Application ID
`f6a052b2072f84dac878f8fd63cd9df8213b64daf2d6197860ba8921f5903faf`, escopo
`api`, confidential, callback
`https://api.muriops.com.br/adapter-connections/gitlab/oauth/callback`),
Client ID/Secret/Redirect URI confirmados salvos no Render (verificado
lendo a tela de Environment Variables depois do deploy), deploy `Live`.
**Só que a tela de `/aplicacao` em produção, checada ao vivo depois do
deploy, ainda mostra o card antigo de GitLab (namespace/repositório + token
PAT colado)** — os 3 arquivos de frontend desta sessão
(`aplicacao/page.tsx`, `github-connection-panel.tsx`,
`gitlab-connection-panel.tsx`) nunca foram commitados: o sandbox ficou sem
`bash`/espaço em disco a sessão inteira de novo (mesmo problema recorrente
documentado em várias sessões anteriores), então não deu pra rodar `git
add`/`commit` por aqui. O botão "Conectar com GitHub" também não vai
aparecer até esse commit ser feito e builda/deployado — hoje em produção
GitHub também está com o card antigo (mostra "Configuração salva · token
••••Wgak", não "Conectado via GitHub como X"), então o teste end-to-end
citado acima validou o **backend OAuth** (rotas funcionando, se algo já
tivesse a UI nova rodando localmente ela teria funcionado), não
necessariamente que alguém já clicou no botão novo em produção — vale
reconfirmar via UI depois que o frontend for commitado/deployado.

**Ação necessária do usuário antes desta UI aparecer:** rodar, no terminal
dele:
```
cd "C:\Users\woner\Desktop\Atlas QA"
pnpm --filter @qa-ai/api exec prisma generate
pnpm --filter @qa-ai/api exec prisma db push
pnpm --filter @qa-ai/shared build
pnpm --filter @qa-ai/api exec tsc --noEmit
pnpm --filter @qa-ai/web build
```
Schema novo: só os campos OAuth em `AdapterConnection` (access/refresh
token, expiração, `oauthAccountLabel`) — aditivo, sem risco de perda de
dado. Depois, `git add` só dos arquivos específicos (nunca `-A`):
`apps/api/prisma/schema.prisma`,
`apps/api/src/config/env.ts`,
`apps/api/src/infrastructure/oauth/github-oauth-client.ts`,
`apps/api/src/infrastructure/oauth/gitlab-oauth-client.ts`,
`apps/api/src/application/github-oauth.service.ts`,
`apps/api/src/application/gitlab-oauth.service.ts`,
`apps/api/src/presentation/routes/adapter-oauth.routes.ts`,
`apps/api/src/application/adapter-connection.service.ts`,
`apps/api/src/presentation/app.ts`,
`apps/api/src/infrastructure/adapters/github/github-adapter.ts`,
`apps/api/src/infrastructure/adapters/gitlab/gitlab-adapter.ts`,
`packages/shared/src/types/adapter.ts`,
`packages/shared/src/types/adapter-oauth.ts`,
`packages/shared/src/index.ts`,
`apps/web/src/app/(app)/aplicacao/page.tsx`,
`apps/web/src/components/github-connection-panel.tsx`,
`apps/web/src/components/gitlab-connection-panel.tsx`,
`apps/web/src/lib/api.ts`,
`apps/web/src/lib/queries.ts`,
`CLAUDE.md`.

**Variáveis de ambiente novas, já configuradas em produção no Render (não
precisa mexer, só documentando pra referência):**
- `GITHUB_OAUTH_CLIENT_ID=Ov23liT0F39aFKdMWEXX`
- `GITHUB_OAUTH_REDIRECT_URI=https://api.muriops.com.br/adapter-connections/github/oauth/callback`
- `GITHUB_OAUTH_CLIENT_SECRET` (colado pelo usuário, valor não registrado aqui)
- `GITLAB_OAUTH_CLIENT_ID=f6a052b2072f84dac878f8fd63cd9df8213b64daf2d6197860ba8921f5903faf`
- `GITLAB_OAUTH_REDIRECT_URI=https://api.muriops.com.br/adapter-connections/gitlab/oauth/callback`
- `GITLAB_OAUTH_CLIENT_SECRET` (colado pelo usuário, valor não registrado aqui)
Se algum dia precisar reconfigurar do zero: as duas Apps OAuth (GitHub em
github.com/settings/developers, GitLab em
gitlab.com/-/user_settings/applications, ambas sob a conta
jadsonpavia@gmail.com) já existem — não recriar, só editar se o callback
mudar de domínio.

**Não fiz:** não removi o formulário de token manual (fica como fallback
permanente, não só transição); não testei o fluxo completo de GitLab
clicando no botão de verdade (só quando o frontend for deployado); não
migrei conexões GitHub já existentes com token manual pro formato OAuth
automaticamente — quem já conectou por token continua assim até reconectar
manualmente pela nova UI se quiser o webhook automático.

## Convenções

- Copy em pt-BR em toda a UI.
- Análises: "Análise QA padrão" e "Análise de Segurança" são os nomes corretos
  (não "auditoria de segurança" isolado, exceto internamente no código).
- Toda tela de erro de IA deve mostrar mensagem amigável + "Detalhe técnico"
  recolhível com o erro cru, não o JSON exposto direto.
- "Enviar para Aplicação" é o rótulo padrão pra qualquer botão que gera um
  `RemediationPlan` a partir de Análise/Projetar (não "Gerar Aplicação" nem só
  "Aplicação" sozinho — evita confundir a ação com o nome da funcionalidade).
