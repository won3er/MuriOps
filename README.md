# QA AI — Análise inteligente de qualidade web

Plataforma SaaS que analisa automaticamente qualquer site simulando uma **equipe
profissional de QA**: navega, explora, testa fluxos, coleta evidências e entrega
um relatório profissional — UI, UX, performance, SEO, acessibilidade, segurança,
console e network — com interpretação por **IA (Claude Fable)**.

O usuário digita uma URL, clica em **Iniciar análise** e todo o restante acontece
automaticamente.

---

## Arquitetura

Monorepo (pnpm workspaces), backend desacoplado do frontend, seguindo
**Clean Architecture / DDD / SOLID**.

```
qa-ai/
├─ apps/
│  ├─ api/           Backend: Fastify + Prisma + Playwright + IA
│  │  ├─ src/
│  │  │  ├─ config/            variáveis de ambiente (zod)
│  │  │  ├─ domain/            (tipos de domínio vivem em packages/shared)
│  │  │  ├─ application/       casos de uso (auth, projetos, análises, runner)
│  │  │  ├─ infrastructure/    prisma, redis/fila, storage, provedores de IA
│  │  │  ├─ modules/analysis/  ENGINE: crawler + analyzers + scoring
│  │  │  └─ presentation/      Fastify (app, rotas, plugins)
│  │  └─ src/main.ts           API HTTP (roda as análises in-process)
│  └─ web/           Frontend: Next.js + React + Tailwind + shadcn + Framer Motion
└─ packages/
   └─ shared/        Tipos e contratos compartilhados (domínio, DTOs, enums)
```

> Banco: **Supabase** (PostgreSQL gerenciado). Sem Docker e sem Redis — as
> análises são processadas no próprio processo da API.

### Os 11 módulos

| # | Módulo | Onde vive |
|---|--------|-----------|
| 1 | Crawler inteligente | `modules/analysis/crawler.ts` |
| 2 | Análise visual / UI | `analyzers/ui.analyzer.ts` |
| 3 | Experiência do usuário (UX) | `analyzers/ux.analyzer.ts` |
| 4 | Performance | `analyzers/performance.analyzer.ts` |
| 5 | SEO | `analyzers/seo.analyzer.ts` + `site-seo.analyzer.ts` |
| 6 | Acessibilidade | `analyzers/accessibility.analyzer.ts` |
| 7 | Console | `analyzers/console.analyzer.ts` |
| 8 | Network | `analyzers/network.analyzer.ts` |
| 9 | Segurança passiva | `analyzers/security.analyzer.ts` |
| 10 | Captura de evidências | `crawler.ts` + `engine.ts` (screenshot, console, network, DOM) |
| 11 | Análise por IA | `infrastructure/ai/*` (Claude / OpenAI / noop) |

O **engine** (`modules/analysis/engine.ts`) orquestra: crawl → analyzers →
scoring → revisão por IA, e devolve um resultado que o **runner**
(`application/analysis-runner.ts`) persiste no banco.

---

## Pré-requisitos

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Um banco PostgreSQL — recomendado **Supabase** (sem Docker, sem Redis)

## Como rodar

```bash
# 1. Instalar dependências
pnpm install

# 2. Criar um projeto no Supabase e pegar as connection strings
#    Project Settings → Database → Connection string:
#      - Pooler (Transaction, porta 6543) → DATABASE_URL  (?pgbouncer=true)
#      - Direct (porta 5432)              → DIRECT_URL

# 3. Configurar variáveis de ambiente
cp .env.example .env
#   (cole DATABASE_URL e DIRECT_URL; edite AI_PROVIDER + chave de IA se quiser
#    análise por IA — sem chave, o provider "noop" gera um resumo determinístico.)

# 4. Preparar o banco
pnpm --filter @qa-ai/api db:generate
pnpm --filter @qa-ai/api db:deploy      # aplica as migrations no Supabase
pnpm --filter @qa-ai/api db:seed        # conta demo: demo@qa-ai.local / demo1234

# 5. Instalar o navegador do Playwright (crawler)
pnpm --filter @qa-ai/api playwright:install

# 6. Rodar tudo em dev (API + web)
pnpm --filter @qa-ai/api dev            # API → http://localhost:3333
pnpm --filter @qa-ai/web dev            # web → http://localhost:3000
```

> As análises rodam **no próprio processo da API** (sem fila externa). Se a API
> reiniciar no meio de uma análise, ela é marcada como `FAILED` no boot e pode
> ser refeita — nenhuma funcionalidade a menos, só sem persistência de fila.

> Abra `http://localhost:3000`, faça login com a conta demo, cadastre um projeto
> e clique em **Iniciar análise**. A página de análise atualiza sozinha conforme
> o worker avança (Explorando → Analisando → Revisão IA → Concluída).

---

## Configuração da IA (Módulo 11)

Em `.env`:

```env
AI_PROVIDER="claude"            # claude | openai | noop
ANTHROPIC_API_KEY="sk-ant-..."
CLAUDE_MODEL="claude-fable-5"   # modelo mais capaz
CLAUDE_FALLBACK_MODEL="claude-opus-4-8"
```

O provider Claude usa o modelo **Fable 5** com **fallback server-side** para
Opus 4.8 habilitado por padrão (se um classificador de segurança recusar a
requisição, a própria API reexecuta no modelo de fallback). A arquitetura
(`AiProvider`) permite trocar de provedor sem tocar no engine.

---

## Fluxo de uma análise

1. `POST /projects/:id/analyses` cria a análise (`QUEUED`) e agenda o processamento in-process (`runner`, concorrência limitada).
2. O **runner** executa `runAnalysis` → `runEngine` no processo da API.
3. O engine faz o **crawl** (Playwright BFS), coletando console, network,
   métricas e screenshots por página.
4. Os **analyzers** por página e de site produzem problemas com `fingerprint`
   estável (para comparar versões).
5. **Scoring** calcula notas 0-100 por categoria e geral.
6. A **IA** enriquece cada problema (impacto, prioridade, reprodução, correção)
   e escreve um resumo executivo.
7. O runner **persiste** páginas, problemas, evidências e scores; a análise vira
   `COMPLETED`.

## Recursos implementados

- Autenticação (JWT) e multi-tenant por organização.
- Sistema de projetos (nome, descrição, URL, histórico, análises).
- Assinaturas estruturadas (planos + limites), **sem cobrança** — pronto p/ expandir.
- Dashboard com métricas agregadas.
- Score geral + por dimensão (UI, UX, Performance, SEO, Acessibilidade,
  Segurança, Console, Network).
- Problemas com título, descrição, prioridade, categoria, página, screenshot,
  console/network, passos para reproduzir e sugestão de correção.
- Filtros (categoria, severidade, status, página, busca).
- Comparação entre versões (o que foi corrigido, o que surgiu, o que persiste):
  `GET /analyses/:from/compare/:to`.
- Histórico de análises por projeto.

## Notas / próximos passos

- Em desenvolvimento, `@qa-ai/shared` é consumido como código-fonte (via tsx).
  Para build de produção, compile o pacote (`pnpm --filter @qa-ai/shared build`)
  e ajuste o `main` para `dist`.
- Acessibilidade usa checagens WCAG de base; integrar **axe-core** para auditoria
  completa é um próximo passo natural (ponto de extensão em
  `accessibility.analyzer.ts`).
- Storage de evidências é local (`STORAGE_DIR`); a interface `EvidenceStorage`
  permite trocar por S3/GCS sem mudar chamadores.
```
