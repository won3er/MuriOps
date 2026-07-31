# Log da execução autônoma — Fase 3 + dogfooding

Sessão iniciada em 2026-07-26, seguindo o plano em
`C:\Users\woner\.claude\plans\unified-herding-snail.md`. Registro de decisões,
bloqueios e bugs encontrados, na ordem em que aconteceram.

## BUG ENCONTRADO — "Aprovar e reanalisar" não dispara nova análise (2026-07-26, Cowork)

Ao fechar o loop de dogfooding completo (implementar as 8 correções → subir pro
GitHub → redeploy Vercel → marcar os 8 itens como feitos na tela de Aplicação →
clicar "Aprovar e reanalisar" na Orquestração), foi encontrado um bug real no
orquestrador:

**Esperado**: ao aprovar a reanálise, o orquestrador deveria disparar uma NOVA
"Análise QA padrão" (novo crawl/Playwright) contra a URL do projeto
(`https://atlas-qa-demo-todo.vercel.app`, já com as 8 correções no ar), gerar uma
v2, e comparar o novo score contra o quality gate (mínimo 100).

**Observado**: o log da execução mostra, na "Iteração 2":
```
Buscando a análise mais recente do projeto.
Usando a análise v1.
1 gate(s) não atingido(s): geral (99/100)
Gerando plano de remediação a partir da análise.
Plano "Aplicação — Minhas Tarefas (demo) (Análise QA padrão v1)" gerado.
Nenhum adapter conectado — aplicação manual via tela de Aplicação ou ponte/MCP.
Aguardando aprovação humana pra reanalisar...
```
Ou seja: ele reutiliza a v1 (score 99/100, gerada ANTES das correções), gera um
plano de remediação duplicado (por isso "Aplicações" foi de 1 → 2 no histórico do
projeto), e volta a esperar aprovação — em loop, sem nunca rodar uma análise nova.
Confirmado que `/projects/.../` continua mostrando "Análises QA padrão (1)" mesmo
depois de aprovar a reanálise duas vezes.

**Hipótese de causa**: em `orchestration-runner.ts` (ou `orchestration.service.ts`),
o step de reanálise provavelmente está com uma chamada faltando que deveria
disparar `POST /projects/:id/analyses` (ou equivalente) antes de "buscar a análise
mais recente" — hoje ele só busca a mais recente já existente, sem criar uma nova.

**Impacto**: o branch REANALYZING do state machine (`QUEUED→ANALYZING→
EVALUATING_GATES→PLANNING→APPLYING→AWAITING_APPLY→REANALYZING→PASSED/STOPPED/
FAILED`) nunca é exercitado de verdade — o loop fica preso entre
AWAITING_APPLY e a reavaliação do mesmo gate, sempre com o mesmo resultado.

**Não corrigido pelo Cowork** porque é mudança de backend (TypeScript, precisa
`git commit`/push) e a sessão do Cowork não deve escrever/commitar código nesse
repo diretamente (ver seção "Sandbox sem git push" no CLAUDE.md). Fica como
próximo passo pro Claude Code local: localizar o step "reanalisar" no orchestration
runner/service e garantir que ele dispare uma análise nova antes de reavaliar o
gate, em vez de reusar a última análise existente.

### Atualização: não era bug, era passo de processo faltando — loop fechado com sucesso

Lendo `orchestration.service.ts` (`advance()`, linha ~199), o design real é: o
`REANALYZING` sempre busca a análise `COMPLETED` mais recente do projeto
(`findFirst orderBy version desc`) — ele não dispara um crawl novo sozinho. O
texto do botão "Aprovar e reanalisar" sugere que ele mesmo reanalisa, o que é
ambíguo/confuso na UI, mas o comportamento é intencional: quem deve rodar uma
"Análise QA padrão" nova é o operador (ou, futuramente, um adapter observe),
*antes* de aprovar — a aprovação só libera o run pra reavaliar contra o que já
existir de mais recente.

Corrigido o procedimento (não o código): rodei manualmente uma nova "Análise QA
padrão" contra `https://atlas-qa-demo-todo.vercel.app` (já com as 8 correções no
ar) → **v2 saiu com score 100/100, 0 problemas, em todas as 8 dimensões**
(UI, UX, SEO, Console, Network, Segurança, Performance, Acessibilidade,
Segurança Avançada). Voltei pra Orquestração e cliquei "Aprovar e reanalisar" de
novo — iteração 3 buscou a v2, todos os quality gates (mínimo 100) passaram, e o
run foi pra `PASSED`. Log final da execução:
```
Iniciando iteração 3.
Buscando a análise mais recente do projeto.
Usando a análise v2.
Todos os quality gates passaram.
Todos os quality gates foram atingidos.
```

**Loop de dogfooding fechado de ponta a ponta**: analisar (v1, 99/100) → avaliar
quality gates (gate mínimo 100, falhou) → gerar plano de remediação via Gemini →
implementar as 8 correções de verdade no código → commit/push → redeploy Vercel →
marcar itens como feitos → rodar nova análise (v2, 100/100) → aprovar reanálise →
gate passou → run PASSED.

**Sugestão de melhoria de UX (não urgente, backlog)**: renomear o botão "Aprovar e
reanalisar" pra algo como "Aprovar e reavaliar" ou adicionar um aviso "rode uma
nova Análise QA padrão antes de aprovar, senão ele reavalia a mesma análise
anterior" — evita o operador cair na mesma confusão de achar que é um bug.

## Continuação autônoma (2026-07-26, Cowork) — usuário saiu, autorizou prosseguir sem gastar dinheiro

Usuário liberou seguir trabalhando sozinho ("updates, testes, melhora de design,
correção de bugs, aplicações") até os tokens acabarem, sem permissão para compras.
Trabalho feito nessa janela:

1. **UX do botão "Aprovar e reanalisar"** — implementada a sugestão acima: texto
   de aviso adicionado em `orchestration-panel.tsx` quando o run está em
   `AWAITING_APPLY`, explicando que "Aprovar" reavalia a análise mais recente já
   existente, não dispara uma nova sozinho. Commit `af819a6` no repo principal,
   deployado.
2. **Revisão de `/analyses/[id]` e `/settings`** — já estavam adequadas (resumo em
   linguagem simples, cards de problema claros, explicação de chave de IA). Nenhuma
   mudança necessária; CLAUDE.md atualizado pra refletir isso.
3. **Rodei a Análise de Segurança pela primeira vez** no projeto demo (nunca tinha
   sido testada) — v3 encontrou 3 problemas reais e novos, não cobertos pelas 8
   correções anteriores: `Permissions-Policy` ausente, `Cross-Origin-Opener-Policy`
   ausente, `security.txt` ausente (RFC 9116). Severidade baixa/info.
4. **Corrigi os 3 problemas de verdade** no `atlas-qa-demo-todo`: adicionei os dois
   headers no `vercel.json` (commit `fc67c87`) e criei
   `public/.well-known/security.txt` (commit `1a78aa4`).
5. **Achado de instabilidade (não é bug de código)**: rodando a Análise de
   Segurança logo após o deploy (v4, v5), os 3 itens às vezes ainda apareciam como
   ausentes mesmo com os headers/arquivo já confirmados presentes via fetch direto
   no navegador. Investigado: `checkAdvancedHeaders` em `deep-security.analyzer.ts`
   usa os headers já capturados pelo Playwright no crawl principal
   (`firstPage.responseHeaders`), não uma sondagem fresca — então se a análise
   roda durante a janela de propagação do deploy nos edges da Vercel, pode pegar
   uma resposta de borda desatualizada. Não mexi no código por ser comportamento
   correto (não é bug), só esperei a propagação terminar. **v6 confirmou 100/100,
   0 problemas** — headers e security.txt realmente aplicados.
6. Runbook pra quem for rodar QA logo depois de um deploy na Vercel: esperar
   ~1-2 min de propagação de CDN antes de rodar a análise, ou tratar um resultado
   de "ausente" logo após deploy com ceticismo e rodar de novo antes de assumir
   regressão.
7. **Bug real encontrado: botão de excluir Aplicação trava a aba do navegador.**
   O projeto demo tinha 2 planos de Aplicação duplicados (sobra do bug de
   reanálise anterior). Tentativa de excluir o mais antigo via ícone de lixeira
   (`aplicacao/[id]`) trava o clique — `Input.dispatchMouseEvent` do CDP expira em
   30s e a aba fica sem resposta até eu navegar pra outra URL manualmente.
   Aconteceu de forma consistente em 2 tentativas separadas. Hipótese: o handler
   de exclusão chama `window.confirm()` de forma síncrona no clique, o que bloqueia
   a thread principal do renderer — normal em navegação manual (usuário só clica
   OK/Cancelar), mas quebra automação via CDP porque o diálogo nativo não é
   visível/controlável pelas ferramentas de clique/teclado do Chrome MCP (precisaria
   de um handler `Page.handleJavaScriptDialog`, que não está disponível aqui).
   **Não é bug pro usuário final** (só afeta automação), mas vale considerar trocar
   `window.confirm()` por um modal de confirmação in-app (ex: shadcn AlertDialog)
   pra ser mais robusto e não depender de diálogo nativo do navegador — também
   melhora a UX (dialogs nativos do Chrome são feios/inconsistentes). Não
   implementado agora por não ser prioridade; ver task de backlog.
   Efeito colateral: uma tentativa de clique+Enter acabou desmarcando os 8 itens
   do plano mais antigo (foi de "8/8 aplicado(s)" pra "0/8") sem querer. Corrigido
   remarcando os 8 itens manualmente — plano restaurado ao estado correto. Os 2
   planos duplicados continuam existindo (não consegui excluir nenhum), mas agora
   ambos estão consistentes (8/8 aplicado(s)), então não há dado incorreto, só
   uma entrada redundante no histórico — inofensivo, cosmético.
8. **Dashboard revisado** — números batendo (6 análises, 1 projeto, 16 problemas
   encontrados no histórico, score médio 100), sem bugs visuais.
9. **Tela Projetar testada de ponta a ponta** — criei um blueprint de teste
   ("Teste QA – App de lista de tarefas") pra confirmar que o bug antigo do 404 do
   Gemini (task #33) continua corrigido. Gerou normalmente: radar de maturidade de
   QA, pirâmide de testes, abordagens e ferramentas recomendadas. Sem erros.
   **Não consegui apagar esse blueprint de teste** — mesmo padrão de
   `window.confirm()` travando o clique (item 7 acima), reproduzido também na
   lista de blueprints e no detalhe. Ficou como um blueprint de teste isolado em
   `/blueprints`, inofensivo (não afeta nenhum projeto ou análise real), mas o
   usuário pode apagá-lo manualmente clicando no ícone de lixeira e confirmando o
   diálogo nativo do navegador (funciona normalmente em uso humano, só trava
   automação via CDP).

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

## Bug crítico no Teste Ativo Autorizado (achado via MCP de produção)

Origem: conectei no MCP de produção (`api.muriops.com.br/mcp/<token>`) — o que
já valida que o **adapter MCP da Fase 1 funciona em produção**. O plano de
remediação lá tinha um item pedindo pra "validar se existem telas de login,
senão marcar como falso positivo por escopo". Ao verificar, achei o oposto.

### O que foi verificado

`muriops.com.br` **tem** autenticação: `/login` e `/register` devolvem 200,
com `<form>` real contendo `input[type=email]` + `input[type=password]`, e a
própria home linka pra ambos. Ou seja, **o item NÃO deve ser marcado como
falso positivo** — o scanner é que errou.

### Causa raiz (dois bugs encadeados)

1. **`active-security-test.analyzer.ts` só inspecionava `pages[0]`** (a home).
   Login praticamente nunca fica na home, então o teste de rate-limit e de
   enumeração de usuário **nunca rodava** na maioria dos sites — e reportava
   um INFO tranquilizador de "não encontrei formulário", como se estivesse
   tudo certo. Pior: a mensagem orientava "aumente a profundidade da análise",
   conselho inaplicável, que foi exatamente o que a IA transformou no item do
   plano de remediação.
2. **Causa mais profunda:** `crawler.ts` fecha progressivamente as abas
   (otimização de memória do episódio Nuvemshop — evita estourar os 512MB do
   Render), mantendo viva **só `pages[0]`**. Então nem adiantaria iterar as
   páginas no analyzer: `ctx.page.evaluate()` nas demais lança "Target page
   has been closed", o `.catch(() => [])` engolia, e o comportamento continuava
   idêntico. Comprovado ao vivo: das 6 páginas crawleadas, só a primeira
   respondia `evaluate`.

### Correção aplicada

Segui o precedente que já existia no próprio código (`PageContext.hasNav`, com
o comentário "capturado no crawl pra o UxAnalyzer não precisar da página ainda
aberta depois" — alguém já tinha batido nessa mesma classe de bug):

- `types.ts`: novo `DetectedFormInfo` e campo `PageContext.forms`.
- `crawler.ts`: captura os formulários **durante o crawl**, com a aba viva,
  ao lado do `hasNav`. Custo zero de requisições (é `evaluate` em página já
  carregada) e de memória (só metadados).
- `active-security-test.analyzer.ts`: `discoverForms` virou função pura que lê
  `ctx.forms` de todas as páginas, deduplica (mesmo formulário de rodapé em 10
  páginas conta uma vez) e ordena com o login primeiro, pra ele sempre caber no
  teto de `MAX_FORMS_TESTED` — que agora é um teto **global**, mantendo o
  volume de requisições contra o alvo igual ao de antes.
- Corrigido também: form sem atributo `action` resolvia pra raiz do site; pelo
  HTML deve resolver pra própria URL da página. Sem isso, as sondas do login
  do MuriOps iriam parar na home em vez de `/login`.

### Guarda contra falso positivo introduzido pela própria correção

Com o login agora sendo encontrado, apareceu um risco novo: o form do MuriOps
é SPA (sem `method`, envio por `fetch`), então cai como `method=get`. Sondar
`GET /login?email=...` só devolveria a página (200 sempre, nunca 429),
gerando um achado **HIGH falso** de "sem rate-limit" — pior que o bug
original, porque num produto de segurança um HIGH falso destrói a confiança.
Blindei: só roda rate-limit/enumeração em form `method="post"`; em SPA emite
um INFO explicando que o endpoint real não é determinável pelo HTML e que a
análise deve apontar direto pro endpoint de autenticação da API.
(`checkPayloadReflection` não precisou de guarda — só dispara em assinaturas
específicas de erro SQL/stack trace/reflexo exato, então falha fechado.)

### Verificação

Crawl real contra `muriops.com.br` (só carregamento de páginas, nenhuma sonda
ativa disparada):

```
ANTES  (só pages[0]): 0 form(s), login=NÃO
DEPOIS (todas):       2 form(s), login=SIM
  login em: https://muriops.com.br/login
  action sondado: https://muriops.com.br/login   (antes iria pra home)
  method: get  campos: email, password
```

Auditoria da mesma classe de bug nos outros analyzers: **nenhum outro afetado**.
`accessibility`/`seo`/`ui` são PageAnalyzer (rodam com a aba aberta, via
`onPageReady`); `security` só usa `responseHeaders`; `site-seo` e
`deep-security` usam `pages[0]` de propósito — são justamente os dois citados
no comentário do crawler como motivo de manter a primeira aba viva.

Typecheck de `apps/api` limpo. Scripts temporários de verificação removidos.

### Pendente pro usuário

- O item 4 do plano em produção continua **pendente e correto como está** —
  não escrevi nada em produção via MCP (leitura só). Depois de subir esta
  correção, vale rodar o Teste Ativo de novo: o resultado esperado agora é o
  INFO de "endpoint não determinável (SPA)" em vez do falso "nenhum login
  encontrado".
- Os outros 3 itens do plano (SPF, DMARC, CAA) são DNS puro, fora do código —
  o passo a passo que a IA gerou pra eles está correto e aplicável.

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

## Fase 3 publicada em produção e primeira execução do orquestrador (2026-07-26, Cowork)

Resolvida a pendência acima: o commit local da Fase 3 (que estava preso por um
`.git/index.lock` — causa raiz: o mount da pasta usado por um dos ambientes
de agente bloqueia `unlink`/substituição de arquivo em baixo nível, então
`git add`/`commit` nunca fechavam a operação) foi finalmente feito **direto
no terminal real do Windows** (não pelo agente): commit `73097ac`
("feat: Fase 3 do orquestrador - loop completo + UI de orquestracao", 36
arquivos, 3817 inserções) e `git push` bem-sucedido pra `origin/main`.

- Redeploy automático confirmado nos dois serviços: Render (`elevate-qa-api`,
  live em ~2m33s, `/health` respondendo `{"status":"ok"}`, migrations novas
  aplicadas sem erro) e Vercel (`elevate-qa`, "Ready", commit `73097ac`).
- Aba "Orquestração" confirmada visível em produção no projeto "Minhas
  Tarefas (demo)".
- Quality gate criado em produção: **Score geral · mínimo 90** (o gate de
  Segurança ≥95 do banco de dev não foi recriado aqui — a UI atual só expõe
  gate de score geral pela tela; um gate por categoria específica exigiria
  usar a API diretamente, não abordado nesta sessão).
- **Primeira execução do orquestrador rodada em produção**: usou a análise
  v1 existente (score 99), avaliou o gate, resultado **"Passou nos quality
  gates"** na iteração 1/3 — sem precisar de reanálise. Ciclo básico
  (analisar → avaliar gate → decidir) provado funcionando de ponta a ponta
  contra o projeto real publicado.

### O que ainda falta pra fechar o ciclo completo de dogfooding

Como o gate já passou de primeira (site já estava bom), o ramo de
`PLANNING`/`APPLYING`/`AWAITING_APPLY`/reanálise via PR do orquestrador
**não foi exercitado em produção** — só tinha sido testado via curl contra o
banco de dev. Pra ver esse ramo rodar de verdade contra o projeto publicado,
seria preciso ou (a) apertar o gate pra um valor que a v1 não bate (ex: 100),
forçando gerar plano de remediação, ou (b) introduzir um problema real no
app de demonstração e reanalisar. Também ainda faltam: conectar o adapter
GitHub de verdade (PAT + repo `atlas-qa-demo-todo`) pra que a etapa
`APPLYING` abra uma PR de verdade, em vez de só esperar aprovação manual sem
adapter.

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
