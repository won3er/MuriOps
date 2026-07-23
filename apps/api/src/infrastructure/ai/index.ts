import { env } from "../../config/env.js";
import { ClaudeProvider } from "./claude-provider.js";
import { GeminiProvider } from "./gemini-provider.js";
import { NoopProvider } from "./noop-provider.js";
import { OpenAiProvider } from "./openai-provider.js";
import type { AiProvider } from "./provider.js";

export * from "./provider.js";

export const AI_PROVIDER_NAMES = ["claude", "openai", "gemini"] as const;
export type AiProviderName = (typeof AI_PROVIDER_NAMES)[number];

export interface AiOverride {
  provider: AiProviderName;
  apiKey: string;
}

/**
 * Factory que resolve o provider de IA. Se `override` for informado (chave
 * própria da organização), usa-o; caso contrário cai na configuração global
 * do servidor (.env). Degrada para noop se nenhuma chave estiver disponível.
 */
export function createAiProvider(override?: AiOverride | null): AiProvider {
  if (override?.apiKey) {
    switch (override.provider) {
      case "claude":
        return new ClaudeProvider(override.apiKey);
      case "openai":
        return new OpenAiProvider(override.apiKey);
      case "gemini":
        return new GeminiProvider(override.apiKey);
    }
  }

  switch (env.AI_PROVIDER) {
    case "claude":
      return env.ANTHROPIC_API_KEY ? new ClaudeProvider() : new NoopProvider();
    case "openai":
      return env.OPENAI_API_KEY ? new OpenAiProvider() : new NoopProvider();
    case "gemini":
      return env.GEMINI_API_KEY ? new GeminiProvider() : new NoopProvider();
    default:
      return new NoopProvider();
  }
}

/** Chave padrão do servidor (.env) para um provider específico, se houver. */
function serverKeyFor(name: AiProviderName): string {
  switch (name) {
    case "claude":
      return env.ANTHROPIC_API_KEY;
    case "openai":
      return env.OPENAI_API_KEY;
    case "gemini":
      return env.GEMINI_API_KEY;
  }
}

/**
 * Resolve um provider para um nome ESCOLHIDO no request (pilar Projetar).
 * Ordem de chave: override da org (se for o mesmo provider) → chave do servidor.
 * Sem chave disponível, cai no noop (blueprint determinístico).
 */
export function createAiProviderFor(
  name: AiProviderName,
  override?: AiOverride | null,
): AiProvider {
  const key =
    override?.provider === name && override.apiKey
      ? override.apiKey
      : serverKeyFor(name);
  if (!key) return new NoopProvider();
  switch (name) {
    case "claude":
      return new ClaudeProvider(key);
    case "openai":
      return new OpenAiProvider(key);
    case "gemini":
      return new GeminiProvider(key);
  }
}
