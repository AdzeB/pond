import type { Prefs } from "@pond/schema";

export function isLocalProviderConnected(
  provider: string,
  agent: Pick<Prefs["agent"], "enabledKeys" | "connectedLocalProviders">,
): boolean {
  return (
    (provider === "ollama" || provider === "lmstudio") &&
    (agent.connectedLocalProviders?.[provider] ??
      agent.enabledKeys[provider] === true)
  );
}
