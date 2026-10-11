import type { LanguageModel } from "ai";

export type LocalLanguageModelProvider = "ollama" | "lmstudio";

export async function createLocalLanguageModel(input: {
  provider: LocalLanguageModelProvider;
  model: string;
  apiKey?: string | null;
  baseUrl?: string;
}): Promise<LanguageModel> {
  const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
  const baseURL =
    input.provider === "ollama"
      ? `${(input.baseUrl ?? "http://127.0.0.1:11434")
          .replace(/\/v1\/?$/i, "")
          .replace(/\/$/, "")}/v1`
      : (input.baseUrl?.trim() || "http://127.0.0.1:1234/v1").replace(
          /\/$/,
          "",
        );
  return createOpenAICompatible({
    name: input.provider,
    apiKey: input.apiKey || "local",
    baseURL,
  })(input.model);
}
