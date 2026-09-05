import type { JsonValue } from "@pond/schema/json";
import { z } from "zod";
import {
  chosenModelId,
  displayName,
  type ProviderModel,
} from "../../../shared/provider-models";
import type { AgentProviderId } from "./keys";

export type { ProviderModel } from "../../../shared/provider-models";
export { displayName };

const SKIP =
  /embedding|whisper|tts|dall-e|davinci|babbage|moderation|realtime|transcribe|audio-|gpt-image|sora|computer-use|omni-moderation|text-embedding|codex-/i;

export function modelsFromProviderResponse(
  provider: AgentProviderId,
  json: JsonValue | undefined,
): ProviderModel[] {
  const ids = idsFromResponse(provider, json);
  const seen = new Set<string>();
  const models: ProviderModel[] = [];
  const local =
    provider === "ollama" ||
    provider === "lmstudio" ||
    provider === "compatible";
  for (const raw of ids) {
    const id = raw.id.trim();
    if (!id || seen.has(id) || !isChatModel(provider, id)) continue;
    seen.add(id);
    models.push({
      id,
      name: raw.name.trim() || (local ? id : displayName(id)),
    });
  }
  return models.sort((a, b) => a.name.localeCompare(b.name));
}

function idsFromResponse(
  provider: AgentProviderId,
  json: JsonValue | undefined,
): Array<{ id: string; name: string }> {
  const stringField = z.string().catch("");
  if (provider === "gemini") {
    const parsed = z
      .object({
        models: z
          .array(
            z
              .object({
                name: stringField,
                displayName: stringField,
                supportedGenerationMethods: z.array(z.string()).catch([]),
              })
              .nullable()
              .catch(null),
          )
          .catch([]),
      })
      .safeParse(json);
    if (!parsed.success) return [];
    return parsed.data.models.flatMap((row) => {
      if (!row) return [];
      const methods = row.supportedGenerationMethods;
      if (
        methods.length &&
        !methods.includes("generateContent") &&
        !methods.includes("generateContentStream")
      )
        return [];
      const id = row.name.replace(/^models\//, "");
      return id ? [{ id, name: row.displayName }] : [];
    });
  }
  const parsed = z
    .object({
      data: z
        .array(
          z
            .object({ id: stringField, display_name: stringField })
            .nullable()
            .catch(null),
        )
        .catch([]),
    })
    .safeParse(json);
  return parsed.success
    ? parsed.data.data.flatMap((row) =>
        row?.id ? [{ id: row.id, name: row.display_name }] : [],
      )
    : [];
}

function isChatModel(provider: AgentProviderId, id: string): boolean {
  if (SKIP.test(id)) return false;
  if (
    provider === "ollama" ||
    provider === "lmstudio" ||
    provider === "compatible"
  )
    return true;
  const n = id.toLowerCase();
  if (provider === "openai") return /^(gpt-|o[1-9]|chatgpt-)/.test(n);
  if (provider === "anthropic") return n.includes("claude");
  if (provider === "gemini") return n.includes("gemini");
  return true;
}

export function resolveModelId(
  provider: AgentProviderId,
  prefs: {
    modelIds?: Record<string, string>;
    ollamaModelId?: string;
    lmstudioModelId?: string;
    compatibleModelId?: string;
  },
  catalogFallback: string,
): string {
  return chosenModelId(provider, prefs) || catalogFallback;
}

export function connectionFor(
  provider: AgentProviderId,
  prefs: {
    modelIds?: Record<string, string>;
    ollamaModelId?: string;
    lmstudioModelId?: string;
    compatibleModelId?: string;
    ollamaBaseUrl?: string;
    lmstudioBaseUrl?: string;
    compatibleBaseUrl?: string;
  },
  catalogFallback: string,
) {
  const modelId = resolveModelId(provider, prefs, catalogFallback);
  if (provider === "ollama")
    return { modelId, baseUrl: prefs.ollamaBaseUrl || undefined };
  if (provider === "lmstudio")
    return { modelId, baseUrl: prefs.lmstudioBaseUrl || undefined };
  if (provider === "compatible")
    return { modelId, baseUrl: prefs.compatibleBaseUrl || undefined };
  return { modelId };
}
