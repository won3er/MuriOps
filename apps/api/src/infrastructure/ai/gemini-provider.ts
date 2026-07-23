import type { BlueprintResult } from "@qa-ai/shared";
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

/** Provider Gemini via REST (sem SDK, para não adicionar dependência). */
export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string = env.GEMINI_API_KEY,
    private readonly model: string = env.GEMINI_MODEL,
  ) {}

  async enrichAnalysis(input: AiAnalysisInput): Promise<AiAnalysisResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildUserPrompt(input) }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    return normalizeAiResult(parseAiJson(text));
  }

  async designBlueprint(input: BlueprintDesignInput): Promise<BlueprintResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: BLUEPRINT_SYSTEM_PROMPT }] },
        contents: [
          { role: "user", parts: [{ text: buildBlueprintUserPrompt(input) }] },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    return normalizeBlueprint(parseBlueprintJson(text));
  }
}
