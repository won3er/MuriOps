import { resolve } from "node:path";
import { config } from "dotenv";
import { z } from "zod";

// Carrega variáveis do .env da raiz do monorepo e do pacote (se existir).
config({ path: resolve(process.cwd(), "../../.env") });
config();

// Plataformas de hospedagem (Render, Railway, Heroku...) injetam a porta via
// PORT — usa como fallback quando API_PORT não foi definida explicitamente.
if (!process.env.API_PORT && process.env.PORT) {
  process.env.API_PORT = process.env.PORT;
}

/** Validação e tipagem das variáveis de ambiente. Falha cedo se algo faltar. */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    // Conexão da aplicação. No Supabase, use a URL do POOLER (porta 6543,
    // com ?pgbouncer=true). Localmente, um Postgres qualquer também serve.
    DATABASE_URL: z.string().url(),
    // Conexão DIRETA (porta 5432 no Supabase). O Prisma usa para migrations,
    // que não funcionam através do pooler. Opcional: sem ela, migrations usam
    // DATABASE_URL (ok se não for pooler).
    DIRECT_URL: z.string().url().optional(),

    API_PORT: z.coerce.number().default(3333),
    API_HOST: z.string().default("0.0.0.0"),
    JWT_SECRET: z.string().min(16),
    JWT_EXPIRES_IN: z.string().default("7d"),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    STORAGE_DIR: z.string().default("./storage"),

    AI_PROVIDER: z.enum(["claude", "openai", "gemini", "noop"]).default("noop"),
    ANTHROPIC_API_KEY: z.string().optional().default(""),
    CLAUDE_MODEL: z.string().default("claude-fable-5"),
    CLAUDE_FALLBACK_MODEL: z.string().default("claude-opus-4-8"),
    OPENAI_API_KEY: z.string().optional().default(""),
    OPENAI_MODEL: z.string().default("gpt-4o"),
    GEMINI_API_KEY: z.string().optional().default(""),
    GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  })
  // Em produção, barra segredo fraco/placeholder e CORS aberto — os mesmos
  // erros que o próprio módulo de Segurança Avançada da ferramenta aponta.
  .refine(
    (v) =>
      v.NODE_ENV !== "production" ||
      (v.JWT_SECRET.length >= 32 && !/troque|change.?me|secret123/i.test(v.JWT_SECRET)),
    {
      message:
        "JWT_SECRET fraco ou de exemplo em produção. Gere um valor aleatório com pelo menos 32 caracteres (ex.: openssl rand -base64 32).",
      path: ["JWT_SECRET"],
    },
  )
  .refine((v) => v.NODE_ENV !== "production" || v.CORS_ORIGIN !== "*", {
    message: "CORS_ORIGIN não pode ser \"*\" em produção — liste os domínios explicitamente.",
    path: ["CORS_ORIGIN"],
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Variáveis de ambiente inválidas:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Configuração de ambiente inválida. Veja .env.example.");
}

export const env = parsed.data;
export type Env = typeof env;
