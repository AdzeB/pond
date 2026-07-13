import { type AiProviderId, modelSupportsAgent } from "@pond/schema";
import { usePrefs } from "@/stores/prefs";

/** The Ask agent requires a tool-calling model; local providers without tool support resolve to false. */
export function useAgentAvailable(): boolean {
  const [ai] = usePrefs("ai");
  const provider = (ai?.provider ?? "ollama") as AiProviderId;
  return modelSupportsAgent(provider, ai?.modelId);
}
