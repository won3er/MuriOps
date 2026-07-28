import OpenAI from "openai";
import type { BlueprintResult, RemediationResult, UpgradeResult } from "@qa-ai/shared";
import { env } from "../../config/env.js";
import {
  BLUEPRINT_SYSTEM_PROMPT,
  buildBlueprintUserPrompt,
  normalizeBlueprint,
  parseBlueprintJson,
  type BlueprintDesignInput,
} from "./blueprint-prompt.js";
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

  async designBlueprint(input: BlueprintDesignInput): Promise<BlueprintResult> {
    const completion = await this.client.chat.completions.create({
      model: env.OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BLUEPRINT_SYSTEM_PROMPT },
        { role: "user", content: buildBlueprintUserPrompt(input) },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    return normalizeBlueprint(parseBlueprintJson(text));
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
}
