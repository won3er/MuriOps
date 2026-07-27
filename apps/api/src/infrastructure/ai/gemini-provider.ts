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
  buildUpgradeUserPrompt,
  normalizeUpgrade,
  parseUpgradeJson,
  UPGRADE_SYSTEM_PROMPT,
  type UpgradeDesignInput,
} from "./upgrade-prompt.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Ordem de preferência quando a chave não expõe nenhuma pista melhor —
// modelos "flash" mais novos primeiro (mais baratos/rápidos), com quedas
// para nomes mais antigos/genéricos que contas mais velhas ainda enxergam.
const DEFAULT_MODEL = "gemini-2.5-flash";
const MODEL_PREFERENCE = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-pro-latest",
  "gemini-1.5-pro-latest",
  "gemini-1.5-pro",
];

/** Cache em memória por chave de API — evita bater no ListModels a cada chamada. */
const modelCache = new Map<string, string>();

/**
 * Pergunta à própria API do Google quais modelos essa chave enxerga e
 * escolhe o melhor. Isso resolve o problema de contas/chaves diferentes
 * terem acesso a conjuntos de modelos diferentes (e o Google descontinuar
 * modelos para "novos usuários" sem aviso) — em vez de fixar um nome de
 * modelo no código, descobrimos sozinhos o que essa chave pode usar.
 */
async function resolveModel(apiKey: string): Promise<string> {
  const cached = modelCache.get(apiKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${API_BASE}/models?key=${apiKey}`);
    if (res.ok) {
      const json = (await res.json()) as {
        models?: { name?: string; supportedGenerationMethods?: string[] }[];
      };
      const available = (json.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => (m.name ?? "").replace(/^models\//, ""))
        .filter(Boolean);

      if (available.length > 0) {
        // Prioriza os nomes conhecidos e "melhores"; se nenhum bater,
        // usa o primeiro modelo flash disponível; senão o primeiro da lista.
        const preferred: string =
          MODEL_PREFERENCE.find((m) => available.includes(m)) ??
          available.find((m) => /flash/i.test(m) && !/lite|vision|8b/i.test(m)) ??
          available[0] ??
          DEFAULT_MODEL;
        modelCache.set(apiKey, preferred);
        return preferred;
      }
    }
  } catch {
    // ListModels falhou (rede, etc.) — cai pro fallback abaixo.
  }

  // Sem conseguir listar: usa o configurado em env, ou o primeiro da lista de preferência.
  const fallback = env.GEMINI_MODEL || DEFAULT_MODEL;
  modelCache.set(apiKey, fallback);
  return fallback;
}

function isModelNotFound(status: number, body: string): boolean {
  return status === 404 && /NOT_FOUND|no longer available/i.test(body);
}

/** Provider Gemini via REST (sem SDK, para não adicionar dependência). */
export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  constructor(private readonly apiKey: string = env.GEMINI_API_KEY) {}

  private async generate(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    let model = await resolveModel(this.apiKey);
    let attempt = 0;

    // Até 2 tentativas: se o modelo escolhido não existir mais pra essa
    // chave (404 NOT_FOUND), esquece o cache e escolhe de novo.
    while (true) {
      attempt += 1;
      const url = `${API_BASE}/models/${model}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      }

      const body = await res.text();
      if (attempt === 1 && isModelNotFound(res.status, body)) {
        modelCache.delete(this.apiKey);
        const retryList = MODEL_PREFERENCE.filter((m) => m !== model);
        model = retryList[0] ?? model;
        modelCache.set(this.apiKey, model);
        continue;
      }

      throw new Error(`Gemini API error: ${res.status} ${body}`);
    }
  }

  async enrichAnalysis(input: AiAnalysisInput): Promise<AiAnalysisResult> {
    const text = await this.generate(SYSTEM_PROMPT, buildUserPrompt(input));
    return normalizeAiResult(parseAiJson(text));
  }

  async designBlueprint(input: BlueprintDesignInput): Promise<BlueprintResult> {
    const text = await this.generate(
      BLUEPRINT_SYSTEM_PROMPT,
      buildBlueprintUserPrompt(input),
    );
    return normalizeBlueprint(parseBlueprintJson(text));
  }

  async buildRemediationPlan(
    input: RemediationDesignInput,
  ): Promise<RemediationResult> {
    const text = await this.generate(
      REMEDIATION_SYSTEM_PROMPT,
      buildRemediationUserPrompt(input),
    );
    return normalizeRemediation(parseRemediationJson(text));
  }

  async buildUpgradePlan(input: UpgradeDesignInput): Promise<UpgradeResult> {
    const text = await this.generate(
      UPGRADE_SYSTEM_PROMPT,
      buildUpgradeUserPrompt(input),
    );
    return normalizeUpgrade(parseUpgradeJson(text));
  }
}
