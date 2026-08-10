import Anthropic from "@anthropic-ai/sdk";
import type { RemediationResult, UpgradeResult } from "@qa-ai/shared";
import { env } from "../../config/env.js";
import { buildUserPrompt, normalizeAiResult, parseAiJson, SYSTEM_PROMPT } from "./prompt.js";
import type { AiAnalysisInput, AiAnalysisResult, AiProvider } from "./provider.js";
import {
  buildRemediationUserPrompt,
  normalizeRemediation,
  parseRemediationJson,
  REMEDIATION_SYSTEM_PROMPT,
  type RemediationDesignInput,
} from "./remediation-prompt.js";
import {
  buildUpgradeSystemPrompt,
  buildUpgradeUserPrompt,
  normalizeUpgrade,
  parseUpgradeJson,
  type UpgradeDesignInput,
} from "./upgrade-prompt.js";

/**
 * Provider Claude usando o modelo Fable 5 (mais capaz).
 * Fallback server-side para Opus 4.8 habilitado por padrão: se um classificador
 * recusar a requisição, a própria API reexecuta no modelo de fallback.
 */
export class ClaudeProvider implements AiProvider {
  readonly name = "claude";
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async enrichAnalysis(input: AiAnalysisInput): Promise<AiAnalysisResult> {
    const response = (await this.client.beta.messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 16000,
      stream: false,
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: env.CLAUDE_FALLBACK_MODEL }],
      output_config: { effort: "high" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    } as Parameters<
      typeof this.client.beta.messages.create
    >[0])) as Anthropic.Beta.Messages.BetaMessage;

    if ((response.stop_reason as string) === "refusal") {
      throw new Error("A IA recusou a requisição (classificador de segurança).");
    }

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return normalizeAiResult(parseAiJson(text));
  }


  async buildRemediationPlan(
    input: RemediationDesignInput,
  ): Promise<RemediationResult> {
    const response = (await this.client.beta.messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 16000,
      stream: false,
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: env.CLAUDE_FALLBACK_MODEL }],
      output_config: { effort: "high" },
      system: REMEDIATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildRemediationUserPrompt(input) }],
    } as Parameters<
      typeof this.client.beta.messages.create
    >[0])) as Anthropic.Beta.Messages.BetaMessage;

    if ((response.stop_reason as string) === "refusal") {
      throw new Error("A IA recusou a requisição (classificador de segurança).");
    }

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return normalizeRemediation(parseRemediationJson(text));
  }

  async buildUpgradePlan(input: UpgradeDesignInput): Promise<UpgradeResult> {
    const response = (await this.client.beta.messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 16000,
      stream: false,
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: env.CLAUDE_FALLBACK_MODEL }],
      output_config: { effort: "high" },
      system: buildUpgradeSystemPrompt(input.ecosystem),
      messages: [{ role: "user", content: buildUpgradeUserPrompt(input) }],
    } as Parameters<
      typeof this.client.beta.messages.create
    >[0])) as Anthropic.Beta.Messages.BetaMessage;

    if ((response.stop_reason as string) === "refusal") {
      throw new Error("A IA recusou a requisição (classificador de segurança).");
    }

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return normalizeUpgrade(parseUpgradeJson(text), input.ecosystem, input.manifestFile);
  }

}
