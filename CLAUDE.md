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

## Convenções

- Copy em pt-BR em toda a UI.
- Análises: "Análise QA padrão" e "Análise de Segurança" são os nomes corretos
  (não "auditoria de segurança" isolado, exceto internamente no código).
- Toda tela de erro de IA deve mostrar mensagem amigável + "Detalhe técnico"
  recolhível com o erro cru, não o JSON exposto direto.
- "Enviar para Aplicação" é o rótulo padrão pra qualquer botão que gera um
  `RemediationPlan` a partir de Análise/Projetar (não "Gerar Aplicação" nem só
  "Aplicação" sozinho — evita confundir a ação com o nome da funcionalidade).
