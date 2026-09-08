import type { AnyTextAdapter } from "@tanstack/ai";
import type { AgentProviderId } from "./keys";

export async function loadAdapter(input: {
  provider: AgentProviderId;
  model: string;
  apiKey: string | null;
  baseUrl?: string;
}): Promise<AnyTextAdapter | null> {
  const key = input.apiKey ?? "";
  const { createModel, extendAdapter } = await import("@tanstack/ai");
  if (input.provider === "anthropic") {
    const { createAnthropicChat } = await import("@tanstack/ai-anthropic");
    const model = input.model || "claude-opus-5";
    const factory = extendAdapter(createAnthropicChat, [
      createModel(model, ["text", "image"]),
    ]);
    return factory(model, key);
  }
  if (input.provider === "gemini") {
    const { createGeminiChat } = await import("@tanstack/ai-gemini");
    const model = input.model || "gemini-3.1-pro-preview";
    const factory = extendAdapter(createGeminiChat, [
      createModel(model, ["text", "image"]),
    ]);
    return factory(model, key);
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
    const { openaiCompatibleText } = await import(
      "@tanstack/ai-openai/compatible"
    );
    const baseURL =
      input.baseUrl?.trim() ||
      (input.provider === "lmstudio" ? "http://127.0.0.1:1234/v1" : "");
    if (!baseURL) throw new Error("Configure an API base URL in Settings.");
    return openaiCompatibleText(input.model || "gpt-5.6-sol", {
      api: "chat-completions",
      apiKey: key || "local",
      baseURL,
    });
  }
  if (input.provider === "openai") {
    const { createOpenaiChat } = await import("@tanstack/ai-openai");
    const model = input.model || "gpt-5.6-sol";
    const factory = extendAdapter(createOpenaiChat, [
      createModel(model, ["text", "image"]),
    ]);
    return factory(model, key);
  }
  return null;
}
