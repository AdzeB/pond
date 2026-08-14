import { type AiProviderId, modelSupportsAgent } from "@pond/schema";
import { usePrefs } from "@/stores/prefs";

/**
 * Whether AI search has a usable model. Bundled is self-contained (single-shot compile path),
 * so it always qualifies even though it can't drive the multi-step agent loop.
 */
export function useAskAvailable(): boolean {
  const [ai] = usePrefs("ai");
  const provider = (ai?.provider ?? "ollama") as AiProviderId;
  if (provider === "bundled") return true;
  return modelSupportsAgent(provider, ai?.modelId);
}
