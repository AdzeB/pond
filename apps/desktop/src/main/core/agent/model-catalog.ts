import {
  displayName,
  type ProviderModel,
} from "../../../shared/provider-models";
import type { AgentProviderId } from "./keys";

export async function bundledModels(
  provider: AgentProviderId,
): Promise<ProviderModel[]> {
  let ids: readonly string[] = [];
  if (provider === "openai") {
    const { OPENAI_CHAT_MODELS } = await import("@tanstack/ai-openai");
    ids = OPENAI_CHAT_MODELS;
  } else if (provider === "anthropic") {
    const { ANTHROPIC_MODELS } = await import("@tanstack/ai-anthropic");
    ids = ANTHROPIC_MODELS;
  } else if (provider === "gemini") {
    const { GeminiTextModels } = await import("@tanstack/ai-gemini");
    ids = GeminiTextModels;
  }
  return ids.map((id) => ({ id, name: displayName(id) }));
}

export function mergeModelCatalogs(
  bundled: ProviderModel[],
  discovered: ProviderModel[],
): ProviderModel[] {
  return [
    ...new Map(
      [...bundled, ...discovered].map((model) => [model.id, model]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));
}
