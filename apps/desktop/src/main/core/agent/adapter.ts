import type { AnyTextAdapter } from "@tanstack/ai";
import type { AgentProviderId } from "./keys";

export async function loadAdapter(input: {
  provider: AgentProviderId;
  model: string;
  apiKey: string | null;
  baseUrl?: string;
}): Promise<AnyTextAdapter | null> {
  const key = input.apiKey ?? "";
  if (input.provider === "anthropic") {
    const { createAnthropicChat } = await import("@tanstack/ai-anthropic");
    // SAFETY: provider catalogs and compatible endpoints accept model IDs beyond the SDK static catalog; the factory forwards this ID unchanged.
    return createAnthropicChat(
      (input.model || "claude-opus-5") as Parameters<
        typeof createAnthropicChat
      >[0],
      key,
    );
  }
  if (input.provider === "gemini") {
    const { createGeminiChat } = await import("@tanstack/ai-gemini");
    // SAFETY: provider catalogs and compatible endpoints accept model IDs beyond the SDK static catalog; the factory forwards this ID unchanged.
    return createGeminiChat(
      (input.model || "gemini-3.1-pro-preview") as Parameters<
        typeof createGeminiChat
      >[0],
      key,
    );
  }
  if (input.provider === "ollama") {
    const { createOllamaChat } = await import("@tanstack/ai-ollama");
    const host = (input.baseUrl ?? "http://127.0.0.1:11434").replace(
      /\/v1\/?$/,
      "",
    );
    return createOllamaChat(input.model || "llama3.2", host);
  }
  if (input.provider === "lmstudio" || input.provider === "compatible") {
    const { createOpenaiChatCompletions } = await import("@tanstack/ai-openai");
    // SAFETY: provider catalogs and compatible endpoints accept model IDs beyond the SDK static catalog; the factory forwards this ID unchanged.
    return createOpenaiChatCompletions(
      (input.model || "gpt-5.6-sol") as Parameters<
        typeof createOpenaiChatCompletions
      >[0],
      key || "local",
      {
        baseURL: input.baseUrl,
      },
    );
  }
  if (input.provider === "openai") {
    const { createOpenaiChat } = await import("@tanstack/ai-openai");
    // SAFETY: provider catalogs and compatible endpoints accept model IDs beyond the SDK static catalog; the factory forwards this ID unchanged.
    return createOpenaiChat(
      (input.model || "gpt-5.6-sol") as Parameters<typeof createOpenaiChat>[0],
      key,
    );
  }
  return null;
}
