import { AI_MODEL_CATALOG, type AiModelInfo } from "./ai-catalog.generated";
import { AI_PROVIDERS, type AiProviderId } from "./ai-providers";

// Capability + context come from the vendored models.dev snapshot, keyed by the
// selected model. Providers with no catalog entry (on-device, local servers, a
// user-supplied endpoint) can't be derived, so their agent capability is an
// irreducible local declaration here.
const FALLBACK_AGENT: Partial<Record<AiProviderId, boolean>> = {
  bundled: false,
  ollama: false,
  lmstudio: false,
  custom: true,
};

function resolveModelId(provider: AiProviderId, modelId?: string): string {
  const trimmed = modelId?.trim();
  return trimmed && trimmed.length > 0
    ? trimmed
    : AI_PROVIDERS[provider].defaultModel;
}

export function getModelInfo(
  provider: AiProviderId,
  modelId?: string,
): AiModelInfo | undefined {
  return AI_MODEL_CATALOG[provider]?.[resolveModelId(provider, modelId)];
}

export interface AiModelEntry extends AiModelInfo {
  id: string;
}

// Known models for a provider from the catalog, in display order. Empty for
// providers with no models.dev entry (local servers, custom endpoints), which
// fall back to a free-typed model id.
export function providerModels(provider: AiProviderId): AiModelEntry[] {
  const models = AI_MODEL_CATALOG[provider];
  if (!models) return [];
  return Object.entries(models).map(([id, info]) => ({ id, ...info }));
}

// Whether the provider/model can drive the multi-step agentic loop (structured
// output + tool calling). Catalog-derived when the model is known; otherwise a
// hosted provider in the catalog is assumed capable and a local/bundled one is
// not.
export function modelSupportsAgent(
  provider: AiProviderId,
  modelId?: string,
): boolean {
  const info = getModelInfo(provider, modelId);
  if (info) return info.agent;
  if (provider in FALLBACK_AGENT) return FALLBACK_AGENT[provider] ?? false;
  return provider in AI_MODEL_CATALOG;
}

// Context window in tokens for the selected model, or undefined when unknown.
export function modelContextLimit(
  provider: AiProviderId,
  modelId?: string,
): number | undefined {
  const context = getModelInfo(provider, modelId)?.context;
  return context && context > 0 ? context : undefined;
}
