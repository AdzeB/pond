import type { Prefs } from "@pond/schema";
import type { AssistantProvider } from "@shared/assistant";

export type AgentPrefs = Prefs["agent"];

export interface KeyRow {
  provider: AssistantProvider;
  hasKey: boolean;
  masked: string | null;
  enabled: boolean;
}
