import { type AiProviderId, modelSupportsAgent } from "@pond/schema";
import { usePrefs } from "@/stores/prefs";

// Whether the "Ask AI" agent surface can run: the configured model must support
// tool-calling. Local providers without tool support resolve to false. The dock
// uses this to disable the Ask entry and point the user at Settings.
export function useAgentAvailable(): boolean {
  const [ai] = usePrefs("ai");
  const provider = (ai?.provider ?? "ollama") as AiProviderId;
  return modelSupportsAgent(provider, ai?.modelId);
}
