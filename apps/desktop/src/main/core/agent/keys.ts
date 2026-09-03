import { KEYCHAIN_AGENT_PREFIX } from "../../../shared/constants";
import { deleteSecret, getSecret, getSecrets, setSecret } from "../../keychain";
import { getPrefs, setPrefs } from "../prefs";
import {
  modelsFromProviderResponse,
  type ProviderModel,
} from "./provider-models";

const AGENT_PROVIDERS = [
  "openai",
  "anthropic",
  "gemini",
  "ollama",
  "lmstudio",
  "compatible",
] as const;

export type AgentProviderId = (typeof AGENT_PROVIDERS)[number];

export function parseProvider(value: string): AgentProviderId | null {
  return (AGENT_PROVIDERS as readonly string[]).includes(value)
    ? (value as AgentProviderId)
    : null;
}

function accountFor(provider: AgentProviderId): string {
  return `${KEYCHAIN_AGENT_PREFIX}:${provider}`;
}

function mask(key: string): string {
  if (key.length < 8) return "••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export async function listKeys(): Promise<
  Array<{
    provider: AgentProviderId;
    hasKey: boolean;
    masked: string | null;
    enabled: boolean;
  }>
> {
  const prefs = await getPrefs();
  const enabledKeys = prefs.agent.enabledKeys ?? {};
  const secrets = await getSecrets(AGENT_PROVIDERS.map(accountFor));
  const rows = [];
  for (const provider of AGENT_PROVIDERS) {
    const key = secrets[accountFor(provider)];
    const local =
      (provider === "ollama" || provider === "lmstudio") &&
      enabledKeys[provider] === true;
    rows.push({
      provider,
      hasKey: Boolean(key) || local,
      masked: key ? mask(key) : local ? "local" : null,
      enabled: enabledKeys[provider] !== false,
    });
  }
  return rows;
}

export async function saveKey(
  provider: AgentProviderId,
  key: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = key.trim();
  if (!trimmed && provider !== "ollama" && provider !== "lmstudio") {
    return { ok: false, error: "Paste a key first." };
  }
  const check = await verifyKey(provider, trimmed);
  if (!check.ok) return check;
  if (trimmed) await setSecret(accountFor(provider), trimmed);
  const prefs = await getPrefs();
  await setPrefs({
    agent: {
      enabledKeys: { ...prefs.agent.enabledKeys, [provider]: true },
      ...(prefs.agent.languageModel ? {} : { languageModel: provider }),
    },
  });
  return { ok: true };
}

export async function removeKey(
  provider: AgentProviderId,
): Promise<{ ok: boolean }> {
  await deleteSecret(accountFor(provider));
  const prefs = await getPrefs();
  await setPrefs({
    agent: {
      enabledKeys: { ...prefs.agent.enabledKeys, [provider]: false },
    },
  });
  return { ok: true };
}

export async function setKeyEnabled(
  provider: AgentProviderId,
  enabled: boolean,
): Promise<{ ok: boolean }> {
  const prefs = await getPrefs();
  await setPrefs({
    agent: {
      enabledKeys: { ...prefs.agent.enabledKeys, [provider]: enabled },
    },
  });
  return { ok: true };
}

export async function keyFor(
  provider: AgentProviderId,
): Promise<string | null> {
  return getSecret(accountFor(provider));
}

export async function verifyKey(
  provider: AgentProviderId,
  key: string,
): Promise<{ ok: boolean; error?: string }> {
  const prefs = await getPrefs();
  return checkProviderKey({
    provider,
    key,
    ollamaBaseUrl: prefs.agent.ollamaBaseUrl,
    lmstudioBaseUrl: prefs.agent.lmstudioBaseUrl,
    compatibleBaseUrl: prefs.agent.compatibleBaseUrl,
  });
}

export async function listProviderModels(
  provider: AgentProviderId,
): Promise<{ ok: boolean; models: ProviderModel[]; error?: string }> {
  const prefs = await getPrefs();
  const key = (await getSecret(accountFor(provider))) ?? "";
  const fetched = await fetchProviderModels({
    provider,
    key,
    ollamaBaseUrl: prefs.agent.ollamaBaseUrl,
    lmstudioBaseUrl: prefs.agent.lmstudioBaseUrl,
    compatibleBaseUrl: prefs.agent.compatibleBaseUrl,
  });
  if (!fetched.ok) return { ok: false, models: [], error: fetched.error };
  return {
    ok: true,
    models: modelsFromProviderResponse(provider, fetched.json),
  };
}

export async function listAvailableModels(): Promise<{
  providers: Array<{
    provider: AgentProviderId;
    ok: boolean;
    models: ProviderModel[];
    error?: string;
  }>;
}> {
  const rows = await listKeys();
  const connected = rows.filter((row) => row.hasKey && row.enabled);
  const providers = await Promise.all(
    connected.map(async (row) => {
      const listed = await listProviderModels(row.provider);
      return { provider: row.provider, ...listed };
    }),
  );
  return { providers };
}

export async function checkProviderKey(input: {
  provider: AgentProviderId;
  key: string;
  ollamaBaseUrl: string;
  lmstudioBaseUrl: string;
  compatibleBaseUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const fetched = await fetchProviderModels(input);
  return fetched.ok ? { ok: true } : { ok: false, error: fetched.error };
}

async function fetchProviderModels(input: {
  provider: AgentProviderId;
  key: string;
  ollamaBaseUrl: string;
  lmstudioBaseUrl: string;
  compatibleBaseUrl: string;
}): Promise<{ ok: boolean; json?: unknown; error?: string }> {
  const { provider, key } = input;
  try {
    let res: Response;
    if (provider === "ollama" || provider === "lmstudio") {
      const base =
        provider === "ollama" ? input.ollamaBaseUrl : input.lmstudioBaseUrl;
      res = await fetch(`${base.replace(/\/$/, "")}/models`, {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
      });
      if (!res.ok) {
        return {
          ok: false,
          error: `${label(provider)} did not accept this endpoint.`,
        };
      }
    } else if (provider === "anthropic") {
      res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
      });
      if (!res.ok) {
        return {
          ok: false,
          error: "Anthropic rejected this key. Check it in Settings.",
        };
      }
    } else if (provider === "gemini") {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      );
      if (!res.ok) {
        return {
          ok: false,
          error: "Gemini rejected this key. Check it in Settings.",
        };
      }
    } else {
      const base =
        provider === "compatible" && input.compatibleBaseUrl
          ? input.compatibleBaseUrl
          : "https://api.openai.com/v1";
      res = await fetch(`${base.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        return {
          ok: false,
          error: `${label(provider)} rejected this key. Check it in Settings.`,
        };
      }
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { ok: true, json };
  } catch {
    return {
      ok: false,
      error: `Could not reach ${label(provider)}. Check the network and try again.`,
    };
  }
}

function label(provider: AgentProviderId): string {
  switch (provider) {
    case "openai":
      return "OpenAI";
    case "anthropic":
      return "Anthropic";
    case "gemini":
      return "Gemini";
    case "ollama":
      return "Ollama";
    case "lmstudio":
      return "LM Studio";
    case "compatible":
      return "OpenAI Compatible";
  }
}
