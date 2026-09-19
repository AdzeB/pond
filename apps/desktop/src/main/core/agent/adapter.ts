import type { LanguageModel } from "ai";
import { assistantCatalog } from "../../../shared/assistant";
import type { AgentProviderId } from "./keys";

export async function loadModel(input: {
  provider: AgentProviderId;
  model: string;
  apiKey: string | null;
  baseUrl?: string;
}): Promise<LanguageModel | null> {
  const key = input.apiKey ?? "";
  const modelId = input.model || assistantCatalog(input.provider)?.model || "";
  if (input.provider === "anthropic") {
    const { createAnthropic } = await import("@ai-sdk/anthropic");
    return createAnthropic({ apiKey: key })(modelId);
  }
  if (input.provider === "gemini") {
    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    return createGoogleGenerativeAI({ apiKey: key })(modelId);
  }
  if (input.provider === "openai") {
    const { createOpenAI } = await import("@ai-sdk/openai");
    return createOpenAI({ apiKey: key }).chat(modelId);
  }
  if (input.provider === "azure") {
    const { createAzure } = await import("@ai-sdk/azure");
    const baseURL = input.baseUrl?.trim();
    if (!baseURL) throw new Error("Enter a resource name in Settings.");
    return createAzure({ apiKey: key, baseURL })(modelId);
  }
  if (input.provider === "xai") {
    const { createXai } = await import("@ai-sdk/xai");
    return createXai({ apiKey: key })(modelId);
  }
  if (input.provider === "mistral") {
    const { createMistral } = await import("@ai-sdk/mistral");
    return createMistral({ apiKey: key })(modelId);
  }
  if (input.provider === "groq") {
    const { createGroq } = await import("@ai-sdk/groq");
    return createGroq({ apiKey: key })(modelId);
  }
  if (input.provider === "cohere") {
    const { createCohere } = await import("@ai-sdk/cohere");
    return createCohere({ apiKey: key })(modelId);
  }
  if (input.provider === "togetherai") {
    const { createTogetherAI } = await import("@ai-sdk/togetherai");
    return createTogetherAI({ apiKey: key })(modelId);
  }
  if (input.provider === "fireworks") {
    const { createFireworks } = await import("@ai-sdk/fireworks");
    return createFireworks({ apiKey: key })(modelId);
  }
  if (input.provider === "deepinfra") {
    const { createDeepInfra } = await import("@ai-sdk/deepinfra");
    return createDeepInfra({ apiKey: key })(modelId);
  }
  if (input.provider === "cerebras") {
    const { createCerebras } = await import("@ai-sdk/cerebras");
    return createCerebras({ apiKey: key })(modelId);
  }
  if (input.provider === "perplexity") {
    const { createPerplexity } = await import("@ai-sdk/perplexity");
    return createPerplexity({ apiKey: key })(modelId);
  }
  if (input.provider === "baseten") {
    const { createBaseten } = await import("@ai-sdk/baseten");
    return createBaseten({ apiKey: key })(modelId);
  }
  if (input.provider === "deepseek") {
    const { createDeepSeek } = await import("@ai-sdk/deepseek");
    return createDeepSeek({ apiKey: key })(modelId);
  }
  if (input.provider === "ollama") {
    const { createOpenAICompatible } = await import(
      "@ai-sdk/openai-compatible"
    );
    const origin = (input.baseUrl ?? "http://127.0.0.1:11434").replace(
      /\/v1\/?$/i,
      "",
    );
    return createOpenAICompatible({
      name: "ollama",
      apiKey: key || "local",
      baseURL: `${origin.replace(/\/$/, "")}/v1`,
    })(modelId);
  }
  if (input.provider === "lmstudio") {
    const { createOpenAICompatible } = await import(
      "@ai-sdk/openai-compatible"
    );
    const baseURL = input.baseUrl?.trim() || "http://127.0.0.1:1234/v1";
    return createOpenAICompatible({
      name: "lmstudio",
      apiKey: key || "local",
      baseURL: baseURL.replace(/\/$/, ""),
    })(modelId);
  }
  return null;
}
