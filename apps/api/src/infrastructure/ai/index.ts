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
 * Factory que resolve o provider de IA. Cada organização usa a própria
 * chave (Configurações → chave de IA) — não existe mais chave padrão do
 * servidor como fallback. Sem `override` com chave, degrada para o noop
 * (resultado determinístico, sem IA de verdade).
 */
export function createAiProvider(override?: AiOverride | null): AiProvider {
  if (!override?.apiKey) return new NoopProvider();
  switch (override.provider) {
    case "claude":
      return new ClaudeProvider(override.apiKey);
    case "openai":
      return new OpenAiProvider(override.apiKey);
    case "gemini":
      return new GeminiProvider(override.apiKey);
    default:
      return new NoopProvider();
  }
}

/**
 * Resolve um provider para um nome ESCOLHIDO no request (pilar Projetar).
 * Só usa a chave da organização, e só se for do mesmo provider pedido —
 * sem chave própria configurada, cai no noop (resultado determinístico).
 */
export function createAiProviderFor(
  name: AiProviderName,
  override?: AiOverride | null,
): AiProvider {
  if (override?.provider !== name || !override.apiKey) return new NoopProvider();
  switch (name) {
    case "claude":
      return new ClaudeProvider(override.apiKey);
    case "openai":
      return new OpenAiProvider(override.apiKey);
    case "gemini":
      return new GeminiProvider(override.apiKey);
  }
}
