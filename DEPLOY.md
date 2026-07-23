# Deploy — Elevate QA

Arquitetura de produção: **Vercel** (frontend Next.js) + **Railway** (API
Fastify + Playwright, processo persistente) + **Supabase** (Postgres, já
configurado). Vercel não roda a API porque ela mantém um processo sempre
ativo e usa Playwright (Chromium) — incompatível com serverless.

Repositório: https://github.com/won3er/Elevate-QA

---

## 1. API no Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → escolhe `won3er/Elevate-QA`.
2. Railway detecta o `railway.json` na raiz (builder Dockerfile, aponta pra `apps/api/Dockerfile`). Não precisa mexer em build settings.
3. Em **Variables**, adiciona (valores reais estão no teu `.env` local — nunca cole segredo real neste arquivo/README, ele vai pro Git):

   ```
   NODE_ENV=production
   DATABASE_URL=<copia do teu .env local>
   DIRECT_URL=<copia do teu .env local>
   JWT_SECRET=<gera um novo com: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://SEU-DOMINIO-VERCEL.vercel.app
   STORAGE_DIR=./storage
   AI_PROVIDER=gemini
   GEMINI_API_KEY=<copia do teu .env local>
   GEMINI_MODEL=gemini-2.0-flash
   ```

   (`CORS_ORIGIN` você ajusta depois que souber a URL real do Vercel — passo 3 abaixo.)

4. Railway expõe uma porta própria via variável `PORT` — a API já lê `API_PORT`/`API_HOST` do `.env`; se o Railway informar `PORT`, adiciona também `API_PORT=$PORT` nas Variables (Railway substitui `$PORT` automaticamente) ou ajusta a variável `API_PORT` para o valor que o Railway atribuir. Mais simples: adiciona a variável `API_PORT` referenciando `${{PORT}}` no editor do Railway (ele resolve a referência sozinho).
5. Deploy. Ao terminar, Railway mostra uma URL pública tipo `https://elevate-qa-api-production.up.railway.app`.
6. Testa: abre `<url>/health` no navegador — deve responder `{"status":"ok"}`.

⚠️ **Storage de evidências é efêmero no Railway** (disco não persiste entre deploys/restarts). Pra produção real, trocar `STORAGE_DIR` local por um bucket (S3, Supabase Storage) via a interface `EvidenceStorage` que já existe no código — não bloqueia teste, mas quebra screenshots antigos a cada redeploy.

---

## 2. Web no Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → importa `won3er/Elevate-QA`.
2. **Root Directory**: `apps/web` (importante — é monorepo).
3. Build/install commands: já vêm do `apps/web/vercel.json`, não precisa mexer.
4. Em **Environment Variables**:

   ```
   NEXT_PUBLIC_API_URL=https://<url-do-railway-do-passo-1>
   ```

5. Deploy. Vercel te dá uma URL tipo `https://elevate-qa.vercel.app`.

## 3. Fechar o CORS

Volta no Railway, edita `CORS_ORIGIN` pra URL real do Vercel (`https://elevate-qa.vercel.app`, sem barra no final). Railway redeploya sozinho ao salvar a variável.

---

## 4. Testar

1. Abre a URL do Vercel.
2. Login com a conta demo: `demo@qa-ai.local` / `demo1234`.
3. Cria um projeto, roda uma análise, testa o pilar **Projetar** (blueprint).

## Variáveis de ambiente — referência rápida

| Variável | Onde | Valor |
|---|---|---|
| `DATABASE_URL` | Railway | pooler Supabase, porta 6543, `?pgbouncer=true` |
| `DIRECT_URL` | Railway | conexão direta Supabase, porta 5432 |
| `JWT_SECRET` | Railway | string aleatória ≥32 chars (gerada acima) |
| `CORS_ORIGIN` | Railway | URL do Vercel (sem barra final) |
| `AI_PROVIDER` + chave | Railway | `gemini`/`claude`/`openai` + respectiva API key |
| `NEXT_PUBLIC_API_URL` | Vercel | URL pública do Railway |

## Próximo passo: assinatura/cobrança

O schema já tem `Subscription` (plano, limites) pronta pra expandir — falta
integrar um provedor de pagamento (Stripe é o caminho natural: webhooks pra
`subscription.updated`, portal de billing, checkout). Isso é trabalho novo,
não fizemos ainda — avisa quando quiser encaixar.
