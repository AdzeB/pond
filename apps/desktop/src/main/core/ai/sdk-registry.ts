import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { AI_PROVIDERS, type AiProviderId } from "@pond/schema";
import type { LanguageModel } from "ai";
import { getAiApiKey } from "../../keychain";
import { getPrefs } from "../prefs";

// Resolves the configured provider into a concrete AI SDK language model. This
// is the single networked path: OpenAI/Anthropic/Google use their first-party
// packages; every other vendor (LM Studio, custom, Groq, Mistral, …) and Ollama
// go through @ai-sdk/openai-compatible against their OpenAI-style endpoint. The
// bundled on-device provider has no AI SDK equivalent and is handled separately.

interface ResolvedModel {
  id: AiProviderId;
  model: LanguageModel;
}

// @ai-sdk/openai-compatible appends "/chat/completions" to baseURL, so callers
// must point it at the "…/v1" root. Ollama's registry base omits it.
function ensureV1(base: string): string {
  const trimmed = base.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

export async function resolveModel(): Promise<ResolvedModel | null> {
  const ai = (await getPrefs()).ai;
  const id = ai.provider;
  if (id === "bundled") return null;
  const meta = AI_PROVIDERS[id];

  const apiKey = (await getAiApiKey(id).catch(() => null)) ?? undefined;
  const modelId =
    ai.modelId && ai.modelId.trim().length > 0
      ? ai.modelId.trim()
      : meta.defaultModel;
  // Only honour a user-supplied endpoint as a baseURL override; first-party
  // providers otherwise use their package defaults (Gemini's native API differs
  // from the OpenAI-compat shim the registry lists for the legacy HTTP path).
  const override =
    ai.endpoint && ai.endpoint.trim().length > 0 ? ai.endpoint.trim() : "";

  switch (id) {
    case "openai": {
      const provider = createOpenAI({
        apiKey,
        ...(override ? { baseURL: override } : {}),
      });
      return { id, model: provider(modelId) };
    }
    case "anthropic": {
      const provider = createAnthropic({
        apiKey,
        ...(override ? { baseURL: override } : {}),
      });
      return { id, model: provider(modelId) };
    }
    case "google": {
      const provider = createGoogleGenerativeAI({
        apiKey,
        ...(override ? { baseURL: override } : {}),
      });
      return { id, model: provider(modelId) };
    }
    case "ollama": {
      const baseURL = ensureV1(override || meta.baseUrl);
      const provider = createOpenAICompatible({
        name: "ollama",
        baseURL,
        apiKey,
      });
      return { id, model: provider(modelId) };
    }
    default: {
      const baseURL = override || meta.baseUrl;
      if (!baseURL) return null;
      const provider = createOpenAICompatible({ name: id, baseURL, apiKey });
      return { id, model: provider(modelId) };
    }
  }
}
