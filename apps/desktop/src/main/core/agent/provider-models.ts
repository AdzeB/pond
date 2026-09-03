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
  json: unknown,
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
  json: unknown,
): Array<{ id: string; name: string }> {
  if (!json || typeof json !== "object") return [];
  const doc = json as Record<string, unknown>;
  if (provider === "gemini") {
    const models = Array.isArray(doc.models) ? doc.models : [];
    return models.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const row = entry as {
        name?: unknown;
        displayName?: unknown;
        supportedGenerationMethods?: unknown;
      };
      const methods = Array.isArray(row.supportedGenerationMethods)
        ? row.supportedGenerationMethods
        : [];
      if (
        methods.length > 0 &&
        !methods.includes("generateContent") &&
        !methods.includes("generateContentStream")
      )
        return [];
      const name = typeof row.name === "string" ? row.name : "";
      const id = name.replace(/^models\//, "");
      if (!id) return [];
      return [
        {
          id,
          name: typeof row.displayName === "string" ? row.displayName : "",
        },
      ];
    });
  }
  const data = Array.isArray(doc.data) ? doc.data : [];
  return data.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as { id?: unknown; display_name?: unknown };
    if (typeof row.id !== "string" || !row.id) return [];
    return [
      {
        id: row.id,
        name: typeof row.display_name === "string" ? row.display_name : "",
      },
    ];
  });
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
): { modelId: string; baseUrl?: string } {
  const modelId = resolveModelId(provider, prefs, catalogFallback);
  if (provider === "ollama")
    return { modelId, baseUrl: prefs.ollamaBaseUrl || undefined };
  if (provider === "lmstudio")
    return { modelId, baseUrl: prefs.lmstudioBaseUrl || undefined };
  if (provider === "compatible")
    return { modelId, baseUrl: prefs.compatibleBaseUrl || undefined };
  return { modelId };
}
