# Elevate QA — contexto do projeto

SaaS de análise de QA para sites: crawler + Playwright analisa UI/UX, performance,
SEO, acessibilidade, segurança, console/network — com IA (Claude/Gemini/OpenAI)
interpretando os achados e gerando plano de correção aplicável.

## Stack

- Monorepo pnpm: `apps/api` (Fastify + Prisma + Playwright), `apps/web` (Next.js 14
  App Router), `packages/shared` (tipos/DTOs compartilhados).
- Deploy: frontend na Vercel (`elevate-qa.vercel.app`), backend no Render free tier
  (`elevate-qa-api.onrender.com`, service id `srv-d9h4t04m0tmc73brc24g`).
- Sem git push direto disponível em alguns ambientes de agente — nesses casos, commits
  foram feitos via upload manual pelo GitHub web UI (won3er/Elevate-QA).

## Estado atual (25/07/2026)

Funcionalidades principais já entregues:

1. **Projetos** — cadastro de sites e histórico de análises.
2. **Análises** — "QA padrão" (UI/UX/performance/SEO/acessibilidade) e "Segurança"
   (auditoria TLS/DNS/headers/segredos), rodam via `apps/api/src/modules/analysis`.
3. **Projetar** (`/blueprints`) — describe um projeto, IA gera arquitetura, stack,
   estratégia de teste, riscos, quality gates, roadmap.
4. **Aplicação** (`/aplicacao`) — pega uma ou mais análises/blueprint de um projeto,
   gera um plano de remediação (checklist). Duas formas de aplicar as mudanças:
   - Documento único (PDF) pra enviar manualmente ao time de dev.
   - "Ponte universal": API pública autenticada por token (`GET /apply/:token`,
     `PATCH /apply/:token/items/:itemId`) — qualquer IA de dev (Claude Code, Windsurf,
     Cursor etc.) pode ler o plano e marcar itens como feitos via `curl`, e a tela
     atualiza em tempo real (polling).

Identidade visual: laranja, isotipo (monograma "E" em barras — letra + gráfico de
elevação). Componentes em `apps/web/src/components/logo.tsx`.

## Provider de IA (`apps/api/src/infrastructure/ai/`)

- `resolveProviderName()`: usa provider configurado na org, senão cai pro
  `env.AI_PROVIDER` do servidor, senão `"claude"`.
- **Gemini** (`gemini-provider.ts`): não fixa mais um nome de modelo. Chama
  `ListModels` da própria API do Google pra descobrir o que a chave enxerga, escolhe
  o melhor (`gemini-flash-latest` > `gemini-2.5-flash` > outros), cacheia em memória
  por chave, e se um modelo passar a dar 404 "no longer available" tenta o próximo
  da lista automaticamente. Isso resolveu o bug de `gemini-2.5-flash-lite`
  descontinuado.

## Pendências conhecidas / próximos passos

1. **Confirmar chave Gemini no Render** — o usuário tem uma chave nova
   (`AQ.Ab8RN6...`), mas nenhum agente pode digitar API keys em formulários por
   política de segurança. Ele precisa colar a chave manualmente em
   Render → `elevate-qa-api` → Environment → `GEMINI_API_KEY` → salvar (dispara
   redeploy automático). Depois de salvar, testar gerando um blueprint em
   `/blueprints/new` pra confirmar `IA: GEMINI` funcionando sem erro.
2. **Testar o fluxo "Aplicação" ponta a ponta de novo** — já foi validado uma vez,
   mas vale reconfirmar após a troca de chave (exportar projeto → gerar plano →
   copiar pacote pra IA de dev → marcar item como feito via `PATCH /apply/:token`).
3. **Seguir polindo UI/copy** — o usuário pediu, em pedidos anteriores, que as telas
   fiquem "mais didáticas". Já foram ajustadas: `projects/[id]`, `blueprints/[id]`,
   `aplicacao/[id]`, e a home (`app/page.tsx`). Outras telas (ex: `/analyses/[id]`,
   `/settings`) ainda não passaram por essa revisão — perguntar ao usuário se quer
   continuar por lá.
4. **Sandbox sem `git push`** — em ambientes de agente sem credencial de push, use
   o upload manual pela interface web do GitHub (arquivo por arquivo/pasta) em
   `github.com/won3er/Elevate-QA/upload/main/<caminho>`. Local (VSCode do usuário)
   normalmente tem `git push` funcionando normalmente — prefira commit/push direto
   quando estiver rodando aí.

## Convenções

- Copy em pt-BR em toda a UI.
- Análises: "Análise QA padrão" e "Análise de Segurança" são os nomes corretos
  (não "auditoria de segurança" isolado, exceto internamente no código).
- Toda tela de erro de IA deve mostrar mensagem amigável + "Detalhe técnico"
  recolhível com o erro cru, não o JSON exposto direto.
