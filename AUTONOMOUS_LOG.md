# Log da execução autônoma — Fase 3 + dogfooding

Sessão iniciada em 2026-07-26, seguindo o plano em
`C:\Users\woner\.claude\plans\unified-herding-snail.md`. Registro de decisões,
bloqueios e bugs encontrados, na ordem em que aconteceram.

## Verificação inicial de ferramentas (bloqueio parcial)

- `gh` (GitHub CLI): instalado (v2.94.0), **não autenticado**
  (`gh auth status` → "You are not logged into any GitHub hosts").
- `vercel` CLI: **não instalado**.

**Decisão:** parar só nos passos que dependem de GitHub/Vercel (criar
repositório, push, deploy) e seguir com o resto — a Fase 3 do orquestrador é
inteiramente backend/banco de dev, sem dependência externa. Passos 2 e 3 do
pedido do usuário (subir o projeto de demonstração e rodar o ciclo completo
contra o GitHub real) ficam **bloqueados** até:
1. `gh auth login` ser feito (precisa de browser/token — Cowork resolve), e
2. `vercel` CLI ser instalado e autenticado (`npm i -g vercel`, depois `vercel login`).

Sem isso, não dá pra criar o repositório de demonstração nem publicar a URL
que o Atlas precisaria analisar. Retomando com o restante do plano.

## Fase 3 — Loop completo do orquestrador (concluída e verificada)

Implementado o `advance()` completo em `orchestration.service.ts`:
`ANALYZING → EVALUATING_GATES → PLANNING → APPLYING → AWAITING_APPLY →
(aprovação humana ou observação do adapter) → REANALYZING → repete`. Também:

- Rotas `POST /orchestration-runs/:id/approve` e `.../cancel`.
- `GET /orchestration-runs/:id/events` (timeline — faltava no desenho original
  da Fase 3, adicionei porque a UI precisa disso pra mostrar o progresso).
- CRUD mínimo de `ProjectQualityGate` (`POST/GET/DELETE /projects/:id/quality-gates`)
  — não existia nenhuma forma de criar um gate via API antes disso, só direto
  no banco. Sem isso a Fase 3 não seria testável nem usável de verdade.
- Painel "Orquestração" no frontend (nova aba na página do projeto): seletor
  de autonomia, editor simples de quality gates, lista de execuções, timeline
  de eventos, botões Aprovar/Cancelar.

### Decisões de implementação (desvios pontuais do texto literal do plano)

1. **Espera do plano de remediação por polling, não por callback.** O plano
   sugeria encadear um callback `onComplete` em `remediationService.generate()`
   pra evitar polling. Na implementação, optei por um polling simples e
   limitado (a cada 2.5s, timeout 3min) dentro do próprio `advance()`, porque
   mudar a assinatura de `generate()`/`runAnalysis()` tocaria em código já em
   produção (Blueprint, Aplicação, Análise) usado por funcionalidades
   existentes — risco maior que o ganho. Documentando aqui pra revisão futura.
2. **`createdById` do plano gerado automaticamente = `"orchestrator"`** (sentinela,
   sem FK real no schema, mesmo padrão que `prisma/seed.ts` já usa com `"seed"`).
3. **Adapter `AdapterConnection.bridgeToken`** (campo criado na Fase 1) precisou
   ser texto plano + único, não criptografado — token criptografado com IV
   aleatório não é buscável por igualdade no banco. Detalhe já registrado na
   sessão anterior, repetido aqui por completude.

### Bug real encontrado durante o teste

`GEMINI_API_KEY` configurada no `.env` local (`AQ.Ab8RN6...`) está **inválida**
— toda chamada real à IA Gemini falha com `401 UNAUTHENTICATED /
ACCESS_TOKEN_TYPE_UNSUPPORTED`. Isso derruba corretamente qualquer
`RemediationPlan`/execução que dependa da IA (comportamento do código está
certo — o problema é a chave em si). Testei o restante da Fase 3 trocando
temporariamente `AI_PROVIDER` pra `"claude"` (sem chave configurada → cai no
`NoopProvider` determinístico), e revertive pra `"gemini"` no final. **Ação
pendente do usuário:** gerar uma chave Gemini nova e válida (formato correto
começa com `AIzaSy...`, não `AQ....` — o valor atual parece ser de outro tipo
de credencial do Google, não uma API key do AI Studio) e colar no `.env` local
(e no Render, se for pra produção).

### Cenários verificados via curl contra o banco de dev

- Loop completo (sem adapter): analisar → gate reprovado → gerar plano → sem
  adapter conectado → `AWAITING_APPLY` → aprovar → reanalisar → 2ª iteração →
  aprovar de novo → limite de iterações atingido → `STOPPED`.
- Loop com adapter GitHub (token falso): `apply()` falha por item (401 "Bad
  credentials", esperado) mas não derruba o run inteiro — chega em
  `AWAITING_APPLY` mesmo assim.
- `cancel()`: funciona em estados parados (`AWAITING_APPLY`), retorna 409 em
  estados ativos (proteção contra corrida com o passo em andamento).
- `approve()`: retorna 409 depois que o run já foi cancelado/parado.
- Nível de autonomia não-MANUAL (`SUPERVISED`): run falha imediatamente com
  mensagem clara ("Fase 4"), sem tentar rodar nada.
- Typecheck de `apps/api` e `apps/web` limpos; build de produção do Next.js ok.

### Pendente

- Passos 2 e 3 do pedido original (criar o projeto de demonstração, subir no
  GitHub, publicar, rodar o ciclo real) seguem bloqueados por `gh`/`vercel`.
  Rechecado ao final desta sessão (2026-07-26): `gh auth status` continua
  "not logged into any GitHub hosts"; `vercel` continua não instalado. Nenhuma
  mudança desde a checagem inicial — segue bloqueado até login manual
  (`gh auth login`) e instalação/login do `vercel` (`npm i -g vercel && vercel login`).

## Adiantado sem GitHub/Vercel (pedido do usuário, continuação da mesma sessão)

### 1. App de demonstração construído e testado de verdade

Criado em `C:\Users\woner\Desktop\atlas-qa-demo-todo` (pasta irmã, fora do
monorepo `Atlas QA` — é um projeto próprio que será um repositório separado).
"Minhas Tarefas": lista de tarefas simples (Next.js 16 + TypeScript +
Tailwind, App Router, sem backend próprio — persiste em `localStorage`).
Funcionalidades: adicionar/marcar concluída/apagar/filtrar, prioridade,
prazo. Componentes com atenção a acessibilidade (labels, `aria-label`,
`aria-pressed`, `role="group"`).

- `npm run build` e `npm run dev` rodados e confirmados funcionando (HTML
  renderizado conferido via `curl`).
- Commit local feito (`git add -A && git commit`) — git já vinha inicializado
  pelo `create-next-app`. Sem push (sem `gh` autenticado ainda).
- `README.md` e `GITHUB_ADAPTER.md` (passo a passo exato + comandos prontos
  pra criar o repo, publicar no Vercel, conectar o adapter GitHub e rodar o
  ciclo do orquestrador assim que `gh`/`vercel` destravarem) escritos na
  própria pasta do projeto.

### 2. Projeto cadastrado no Atlas QA + blueprint via Projetar

- Projeto **"Minhas Tarefas (demo)"** criado no Atlas QA (banco de dev),
  id `cms1dbg2t00015ndju88tnasa`, apontando pra `http://localhost:3100`
  (trocar pela URL real depois do deploy — ver `GITHUB_ADAPTER.md`).
- Blueprint gerado via `POST /blueprints` (pilar Projetar, modo `form`).
  Como a chave Gemini está quebrada (ver abaixo), saiu na versão
  determinística sem IA (`NoopProvider`) — regenerar depois que a chave for
  corrigida, pra um blueprint de verdade específico pro projeto.
- Dois `ProjectQualityGate` criados pro projeto: score geral ≥ 90, categoria
  Segurança ≥ 95 (headers/CSP — o HTTPS resolve sozinho ao publicar).

### 3. Bug real encontrado e corrigido: transação do Prisma incompatível com o pooler do Supabase

Ao rodar uma análise QA de verdade contra o app rodando localmente (não a
análise fake que eu tinha inserido direto no banco no Fase 0), a análise
falhava sempre com:

```
Transaction API error: Transaction not found. Transaction ID is invalid,
refers to an old closed transaction Prisma doesn't have information about
anymore, or was obtained before disconnecting.
```

Causa: `analysis-runner.ts`'s `persist()` usava
`prisma.$transaction(async (tx) => {...})` (transação interativa) pra gravar
páginas/evidências/problemas/score. `DATABASE_URL` usa o pooler do Supabase
em modo **transaction** (`pgbouncer=true`, porta 6543) — incompatibilidade
conhecida: PgBouncer em modo transaction não garante a mesma conexão/sessão
entre as várias queries de uma transação interativa do Prisma, e pode
reciclar a conexão no meio, derrubando com exatamente esse erro.

**Correção aplicada:** removi o `$transaction` interativo, mantendo os
mesmos inserts sequenciais direto em `prisma` (sem `tx`). Perde atomicidade
(uma falha no meio deixa dados parciais), mas isso já era aceito em outros
pontos do código sem transação, e destrava o problema real de
incompatibilidade com o pooler. Retestado depois da correção: análise
completou (`COMPLETED`, score 98/100, 7 achados reais — HTTPS ausente e CSP
ausente, ambos esperados em dev local sobre HTTP).

**Nota:** esse é um bug **pré-existente** do produto (não introduzido nesta
sessão) — só apareceu agora porque foi a primeira vez que uma análise real
(não fake) rodou contra este banco de dev específico. Vale considerar se
`auth.service.ts` (também usa `$transaction`, linha ~24, no registro de
usuário) tem o mesmo risco — não testei esse caminho porque usei o usuário
já semeado (`prisma/seed.ts`), que não passa pela rota de registro.

### 4. Chave GEMINI_API_KEY inválida — causa raiz provável encontrada

Além de já ter documentado que a chave falha com 401, encontrei o motivo
provável: o hint da tela de Configurações dizia `"AQ...ou AIza..."`, sugerindo
que chaves começando com `AQ.` seriam válidas pro Gemini. **Isso está
errado** — chaves reais do Google AI Studio começam com `AIzaSy...`; `AQ.`
não é um prefixo de API key do Gemini. Corrigi o hint em
`apps/web/.../settings/page.tsx` pra só mostrar `AIzaSy...` e adicionei uma
nota explicando o formato correto e onde gerar a chave (Google AI Studio).
Ação pendente do usuário continua a mesma: gerar uma chave nova no formato
certo e colar no `.env` (local e Render).

### 5. Pendência 3 do CLAUDE.md — telas mais didáticas

- `/analyses/[id]`: adicionado parágrafo explicando a escala do score (0-100)
  e pra que serve o botão "Gerar Aplicação"; rótulo "Filtrar problemas" antes
  dos filtros; estado de erro (`FAILED`) agora segue o mesmo padrão visual de
  `blueprints/[id]` (mensagem amigável + "Detalhe técnico" recolhível com o
  erro cru), que antes só mostrava o erro bruto direto na tela.
- `/settings`: corrigido o hint da chave Gemini (ver item 4) e adicionada
  nota de onde gerar a chave e qual formato é válido.
- `/aplicacao` (lista) não foi tocada — já parecia adequada; não abri mão de
  tempo nela dado o que sobrava da sessão.

### Verificação final

- Typecheck de `apps/api` e `apps/web`: limpos.
- Build de produção (`next build`) do `apps/web`: limpo, incluindo as duas
  páginas polidas.
- Servidores de teste (API na porta 3333, app demo na porta 3100) encerrados
  ao fim da sessão.

### Resumo do que ainda falta (bloqueado por `gh`/`vercel`)

1. `gh repo create ... --push` pra publicar `atlas-qa-demo-todo` de verdade.
2. `vercel --prod` pra publicar e pegar a URL real.
3. Atualizar a URL do projeto no Atlas QA (rota `PATCH /projects/:id` hoje só
   aceita `autonomyLevel` — pode precisar estender pra aceitar `url` também,
   ou criar um projeto novo com a URL certa).
4. Conectar o adapter GitHub de verdade (owner/repo/PAT reais) e configurar o
   webhook no repositório.
5. Rodar o `OrchestrationRun` de ponta a ponta contra o projeto publicado até
   bater os quality gates configurados (score ≥ 90, Segurança ≥ 95).
6. Regenerar o blueprint e a análise com uma chave Gemini válida, pra ter
   resultados de IA de verdade em vez do fallback determinístico.

Tudo documentado em `GITHUB_ADAPTER.md` (na pasta do app de demonstração) com
os comandos exatos pra cada passo.

---

STATUS: READY_FOR_BROWSER_STEPS (2026-07-26, marcado manualmente pelo Cowork após revisão do log)

## Passos de navegador executados pelo Cowork (2026-07-26)

1. **Repositório GitHub criado**: `https://github.com/won3er/atlas-qa-demo-todo`
   (público). Upload manual via interface web (sem `gh` CLI), pasta por pasta
   pra preservar a estrutura: raiz (config + docs), `src/app`,
   `src/components`, `src/lib`, `public`. Todos os arquivos do projeto local
   estão lá, exceto `node_modules`/`.next`/`.git` (não versionados).
2. **Publicado na Vercel** via dashboard (import direto do repo GitHub, sem
   `vercel` CLI): projeto `atlas-qa-demo-todo`, preset Next.js detectado
   automaticamente, deploy `Ready` de primeira. URL de produção estável:
   **`https://atlas-qa-demo-todo.vercel.app`**. Confirmado renderizando de
   verdade (tela "Minhas Tarefas" completa, formulário funcional).
3. **Projeto cadastrado no Atlas QA em PRODUÇÃO** (`elevate-qa.vercel.app`,
   não no banco de dev local) — **atenção**: como a rota `PATCH /projects/:id`
   só aceita `autonomyLevel` (não `url`), optei por criar um projeto novo em
   vez de tentar editar o que existia no banco de dev (que é inacessível
   pela produção de qualquer forma, são bancos diferentes). Nome "Minhas
   Tarefas (demo)", URL `https://atlas-qa-demo-todo.vercel.app`, id
   `cms1v1pe80001e2dosl11rpcr`.
4. **Análise QA padrão real disparada e concluída** contra a URL publicada:
   score geral **99/100**, 8 achados, 1 página. Notas por dimensão: UI/UX/
   Performance/Acessibilidade/Console/Network/Segurança Avançada em 100,
   SEO 96, Segurança 92 (headers ausentes, esperado — HTTPS via Vercel já
   cobre boa parte). Prova de ponta a ponta: app real → publicado → analisado
   pelo Atlas QA de verdade, sem dado fake.

### Observação importante pra próxima sessão do Claude Code local

O projeto de demonstração e a análise acima **vivem no banco de PRODUÇÃO**
(Render + Supabase "Elevate QA" main), não no banco "(dev)" usado pra testar
a Fase 3 do orquestrador. Os dois `ProjectQualityGate` (score ≥90, Segurança
≥95) e os quality gates criados anteriormente no banco de dev **não existem
neste projeto de produção** — precisam ser recriados aqui se for continuar o
ciclo do orquestrador contra este projeto específico. Também: a Fase 3
(orquestrador) só existe no código local até agora — não foi commitada/
enviada pro repositório principal (`won3er/Elevate-QA`), então a rota
`/orchestration-runs` e a UI de "Orquestração" **não existem em produção**.
Rodar o ciclo completo do orquestrador contra este projeto publicado (item
5 da lista de pendências acima) só é possível depois que a Fase 3 for
commitada e enviada ao repo principal — e aí, dependendo de onde o
orquestrador rodar (dev local vs. produção), pode ser necessário recriar o
projeto de novo, apontando pro banco certo.

Adapter GitHub real (owner/repo/PAT), conexão ao repositório
`atlas-qa-demo-todo`, e o ciclo completo do orquestrador continuam
pendentes — falta a Fase 3 estar em produção (ou testar tudo no banco de dev,
que exigiria rodar a API localmente de novo).

STATUS: BROWSER_STEPS_STARTED (2026-07-26, checagem automática do Cowork)

Verificação automática: o marcador `STATUS: READY_FOR_BROWSER_STEPS` já tinha,
no próprio bloco seguinte do log, a seção "Passos de navegador executados pelo
Cowork (2026-07-26)" documentando que os passos de navegador (repo GitHub,
deploy Vercel, cadastro do projeto demo no Atlas QA em produção, análise QA
real com score 99/100) já foram executados e concluídos numa execução
anterior desta mesma tarefa agendada. Não havia marcador `BROWSER_STEPS_STARTED`
registrado separadamente, então esta checagem apenas confirma que o trabalho
já está feito e adiciona este marcador agora pra evitar que uma futura
execução repita o trabalho por engano. Nenhuma ação nova de navegador foi
tomada nesta checagem — apenas leitura/confirmação do log.

Pendências que continuam em aberto (sem novidade): Fase 3 do orquestrador
ainda não commitada/enviada pro repo principal `won3er/Elevate-QA`; adapter
GitHub real (PAT) e ciclo completo do orquestrador contra o projeto publicado
seguem bloqueados até isso acontecer; chave GEMINI_API_KEY ainda precisa ser
trocada por uma válida (formato `AIzaSy...`).
