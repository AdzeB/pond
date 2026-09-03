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
    return createAnthropicChat(
      (input.model || "claude-opus-5") as "claude-sonnet-4-5",
      key,
    );
  }
  if (input.provider === "gemini") {
    const { createGeminiChat } = await import("@tanstack/ai-gemini");
    return createGeminiChat(
      (input.model || "gemini-3.1-pro-preview") as "gemini-2.5-flash",
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
    return createOpenaiChatCompletions(
      (input.model || "gpt-5.6-sol") as "gpt-4.1-mini",
      key || "local",
      {
        baseURL: input.baseUrl,
      },
    );
  }
  if (input.provider === "openai") {
    const { createOpenaiChat } = await import("@tanstack/ai-openai");
    return createOpenaiChat(
      (input.model || "gpt-5.6-sol") as "gpt-4.1-mini",
      key,
    );
  }
  return null;
}
