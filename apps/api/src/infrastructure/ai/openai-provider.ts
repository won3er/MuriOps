import OpenAI from "openai";
import type {
  GuardianResult,
  RemediationResult,
  UpgradeResult,
} from "@qa-ai/shared";
import { env } from "../../config/env.js";
import {
  buildGuardianUserPrompt,
  GUARDIAN_SYSTEM_PROMPT,
  normalizeGuardian,
  parseGuardianJson,
  type GuardianCheckInput,
} from "./guardian-prompt.js";
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

/** Provider alternativo via OpenAI (mesma interface do engine). */
export class OpenAiProvider implements AiProvider {
  readonly name = "openai";
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async enrichAnalysis(input: AiAnalysisInput): Promise<AiAnalysisResult> {
    const completion = await this.client.chat.completions.create({
      model: env.OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    return normalizeAiResult(parseAiJson(text));
  }

  async buildRemediationPlan(
    input: RemediationDesignInput,
  ): Promise<RemediationResult> {
    const completion = await this.client.chat.completions.create({
      model: env.OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: REMEDIATION_SYSTEM_PROMPT },
        { role: "user", content: buildRemediationUserPrompt(input) },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    return normalizeRemediation(parseRemediationJson(text));
  }

  async buildUpgradePlan(input: UpgradeDesignInput): Promise<UpgradeResult> {
    const completion = await this.client.chat.completions.create({
      model: env.OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildUpgradeSystemPrompt(input.ecosystem) },
        { role: "user", content: buildUpgradeUserPrompt(input) },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    return normalizeUpgrade(parseUpgradeJson(text), input.ecosystem, input.manifestFile);
  }

  async runGuardianCheck(input: GuardianCheckInput): Promise<GuardianResult> {
    const completion = await this.client.chat.completions.create({
      model: env.OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: GUARDIAN_SYSTEM_PROMPT },
        { role: "user", content: buildGuardianUserPrompt(input) },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    return normalizeGuardian(
      parseGuardianJson(text),
      new Set(input.rules.map((r) => r.id)),
    );
  }
}
