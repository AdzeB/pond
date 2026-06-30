// Single source of truth for the LLM providers that power the "find anything"
// NL query compiler. Shared by the renderer (labels, hints, placeholders) and
// the main process (base URLs, transport, key requirement) so the two never
// drift. Embeddings are unrelated and always run on-device.

// How a provider is reached:
// - "bundled": node-llama-cpp GGUF in the main process (no network).
// - "ollama":  Ollama's native /api/chat with structured `format`.
// - "openai":  OpenAI-compatible /v1/chat/completions. Hosted vendors (Anthropic,
//              Google, etc.) are reached through their official OpenAI-compat
//              shims, so a single code path covers all of them.
export type AiProviderTransport = "bundled" | "ollama" | "openai";

export interface AiProviderMeta {
  label: string;
  hint: string;
  transport: AiProviderTransport;
  // Base URL up to (and including) the version segment. Empty for "bundled"
  // (no endpoint) and "custom" (the user supplies it). The HTTP layer appends
  // the transport-specific path (e.g. "/chat/completions").
  baseUrl: string;
  // Default chat/completion model id when the user hasn't set one.
  defaultModel: string;
  // Hosted providers need an API key; local servers do not.
  requiresKey: boolean;
  // Placeholder shown in the API-key field.
  keyPlaceholder: string;
}

// Ordering drives the picker: local options first, then hosted vendors.
export const AI_PROVIDER_IDS = [
  "bundled",
  "ollama",
  "lmstudio",
  "custom",
  "openai",
  "anthropic",
  "google",
  "groq",
  "mistral",
  "xai",
  "deepseek",
  "openrouter",
  "together",
  "perplexity",
] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export const AI_PROVIDERS: Record<AiProviderId, AiProviderMeta> = {
  bundled: {
    label: "Bundled (on-device)",
    hint: "Runs a small model fully on-device. Downloaded on first use.",
    transport: "bundled",
    baseUrl: "",
    defaultModel: "",
    requiresKey: false,
    keyPlaceholder: "",
  },
  ollama: {
    label: "Ollama",
    hint: "Local Ollama server, usually http://127.0.0.1:11434.",
    transport: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    defaultModel: "llama3.2:1b",
    requiresKey: false,
    keyPlaceholder: "",
  },
  lmstudio: {
    label: "LM Studio",
    hint: "LM Studio's local server, usually http://127.0.0.1:1234.",
    transport: "openai",
    baseUrl: "http://127.0.0.1:1234/v1",
    defaultModel: "local-model",
    requiresKey: false,
    keyPlaceholder: "",
  },
  custom: {
    label: "Custom (OpenAI-compatible)",
    hint: "Any OpenAI-compatible endpoint. Enter the base URL up to /v1. An API key is optional.",
    transport: "openai",
    baseUrl: "",
    defaultModel: "local-model",
    requiresKey: false,
    keyPlaceholder: "sk-…",
  },
  openai: {
    label: "OpenAI",
    hint: "OpenAI's API. Requires an API key.",
    transport: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    requiresKey: true,
    keyPlaceholder: "sk-…",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    hint: "Claude via Anthropic's OpenAI-compatible endpoint. Requires an API key.",
    transport: "openai",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-5",
    requiresKey: true,
    keyPlaceholder: "sk-ant-…",
  },
  google: {
    label: "Google (Gemini)",
    hint: "Gemini via Google's OpenAI-compatible endpoint. Requires an API key.",
    transport: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    requiresKey: true,
    keyPlaceholder: "AIza…",
  },
  groq: {
    label: "Groq",
    hint: "Groq's fast inference API. Requires an API key.",
    transport: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    requiresKey: true,
    keyPlaceholder: "gsk_…",
  },
  mistral: {
    label: "Mistral",
    hint: "Mistral's API. Requires an API key.",
    transport: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-large-latest",
    requiresKey: true,
    keyPlaceholder: "API key",
  },
  xai: {
    label: "xAI (Grok)",
    hint: "Grok via xAI's API. Requires an API key.",
    transport: "openai",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
    requiresKey: true,
    keyPlaceholder: "xai-…",
  },
  deepseek: {
    label: "DeepSeek",
    hint: "DeepSeek's API. Requires an API key.",
    transport: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    requiresKey: true,
    keyPlaceholder: "sk-…",
  },
  openrouter: {
    label: "OpenRouter",
    hint: "Many models through one API. Requires an API key.",
    transport: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    requiresKey: true,
    keyPlaceholder: "sk-or-…",
  },
  together: {
    label: "Together",
    hint: "Together AI's API. Requires an API key.",
    transport: "openai",
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    requiresKey: true,
    keyPlaceholder: "API key",
  },
  perplexity: {
    label: "Perplexity",
    hint: "Perplexity's Sonar API. Requires an API key.",
    transport: "openai",
    baseUrl: "https://api.perplexity.ai",
    defaultModel: "sonar",
    requiresKey: true,
    keyPlaceholder: "pplx-…",
  },
};
