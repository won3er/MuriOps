# Deploy — Elevate QA

Arquitetura de produção: **Vercel** (frontend Next.js) + **Render** (API
Fastify + Playwright, processo persistente, free tier sem cartão) +
**Supabase** (Postgres, já configurado). Vercel não roda a API porque ela
mantém um processo sempre ativo e usa Playwright (Chromium) — incompatível
com serverless.

Repositório: https://github.com/won3er/Elevate-QA

⚠️ **Free tier do Render dorme após 15min sem uso** — a primeira requisição
depois disso demora ~30-60s pra "acordar" o container. Normal, não é bug.
Se isso incomodar depois, dá pra trocar de plano ali mesmo, sem mudar código.

---

## 1. API no Render

1. [render.com](https://render.com) → cria conta (sem cartão) → **New** → **Blueprint**.
2. Conecta o GitHub e escolhe `won3er/Elevate-QA`. O Render lê o `render.yaml` da raiz sozinho (Docker, aponta pra `apps/api/Dockerfile`, plano Free).
3. Antes de confirmar, ele pede pra preencher as variáveis marcadas `sync: false` (não tem valor no arquivo, por segurança):

   ```
   DATABASE_URL     = <copia do teu .env local — pooler Supabase, porta 6543>
   DIRECT_URL       = <copia do teu .env local — direto Supabase, porta 5432>
   CORS_ORIGIN      = https://SEU-DOMINIO-VERCEL.vercel.app   (ajusta depois no passo 3)
   GEMINI_API_KEY   = <copia do teu .env local>
   ```

   `JWT_SECRET` é gerado automaticamente pelo Render (`generateValue: true`) — não precisa colar nada.

4. **Apply** / **Create Web Service**. Primeiro build demora uns minutos (baixa Chromium). Render mostra logs ao vivo.
5. Ao terminar, Render dá uma URL tipo `https://elevate-qa-api.onrender.com`.
6. Testa: abre `<url>/health` — deve responder `{"status":"ok"}`. (Se acabou de dormir, espera o cold start.)

⚠️ **Storage de evidências é efêmero no Render free** (disco não persiste entre deploys/restarts, e dorme apaga também). Pra produção real, trocar `STORAGE_DIR` local por um bucket (S3, Supabase Storage) via a interface `EvidenceStorage` que já existe no código — não bloqueia teste, mas screenshots antigos somem a cada redeploy/sleep longo.

---

## 2. Web no Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → importa `won3er/Elevate-QA`.
2. **Root Directory**: `apps/web` (importante — é monorepo).
3. Build/install commands: já vêm do `apps/web/vercel.json`, não precisa mexer.
4. Em **Environment Variables**:

   ```
   NEXT_PUBLIC_API_URL=https://<url-do-render-do-passo-1>
   ```

5. Deploy. Vercel te dá uma URL tipo `https://elevate-qa.vercel.app`.

## 3. Fechar o CORS

Volta no Render → o serviço → **Environment** → edita `CORS_ORIGIN` pra URL real do Vercel (`https://elevate-qa.vercel.app`, sem barra no final). Salvar já redeploya sozinho.

---

## 4. Testar

1. Abre a URL do Vercel.
2. Login com a conta demo: `demo@qa-ai.local` / `demo1234`.
3. Cria um projeto, roda uma análise, testa o pilar **Projetar** (blueprint).
4. Se a primeira requisição demorar/der erro, é o Render acordando — tenta de novo em 1min.

## Variáveis de ambiente — referência rápida

| Variável | Onde | Valor |
|---|---|---|
| `DATABASE_URL` | Render | pooler Supabase, porta 6543, `?pgbouncer=true` |
| `DIRECT_URL` | Render | conexão direta Supabase, porta 5432 |
| `JWT_SECRET` | Render | gerado automaticamente pelo `render.yaml` |
| `CORS_ORIGIN` | Render | URL do Vercel (sem barra final) |
| `AI_PROVIDER` + chave | Render | `gemini`/`claude`/`openai` + respectiva API key |
| `NEXT_PUBLIC_API_URL` | Vercel | URL pública do Render |

## Próximo passo: assinatura/cobrança

O schema já tem `Subscription` (plano, limites) pronta pra expandir — falta
integrar um provedor de pagamento (Stripe é o caminho natural: webhooks pra
`subscription.updated`, portal de billing, checkout). Isso é trabalho novo,
não fizemos ainda — avisa quando quiser encaixar.
