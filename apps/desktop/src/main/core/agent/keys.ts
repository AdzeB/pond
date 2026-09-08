import type { JsonValue } from "@pond/schema/json";
import { z } from "zod";
import { KEYCHAIN_AGENT_PREFIX } from "../../../shared/constants";
import { modelsForChooser } from "../../../shared/provider-models";
import { deleteSecret, getSecret, getSecrets, setSecret } from "../../keychain";
import { getPrefs, setPrefs } from "../prefs";
import { isLocalProviderConnected } from "./local-provider-state";
import { bundledModels, mergeModelCatalogs } from "./model-catalog";
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
  return AGENT_PROVIDERS.find((provider) => provider === value) ?? null;
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
    const local = isLocalProviderConnected(provider, prefs.agent);
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
      languageModel: prefs.agent.languageModel || provider,
      connectedLocalProviders: {
        ...prefs.agent.connectedLocalProviders,
        [provider]: provider === "ollama" || provider === "lmstudio",
      },
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
      connectedLocalProviders: {
        ...prefs.agent.connectedLocalProviders,
        [provider]: false,
      },
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
      connectedLocalProviders: {
        ...prefs.agent.connectedLocalProviders,
        [provider]: isLocalProviderConnected(provider, prefs.agent),
      },
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
  const bundled = await bundledModels(provider);
  if (!key && provider !== "ollama" && provider !== "lmstudio") {
    return { ok: true, models: bundled };
  }
  const fetched = await fetchProviderModels({
    provider,
    key,
    ollamaBaseUrl: prefs.agent.ollamaBaseUrl,
    lmstudioBaseUrl: prefs.agent.lmstudioBaseUrl,
    compatibleBaseUrl: prefs.agent.compatibleBaseUrl,
  });
  if (!fetched.ok)
    return { ok: bundled.length > 0, models: bundled, error: fetched.error };
  return {
    ok: true,
    models: mergeModelCatalogs(
      bundled,
      modelsFromProviderResponse(provider, fetched.json),
    ),
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
  const prefs = await getPrefs();
  const rows = await listKeys();
  const connected = rows.filter((row) => row.hasKey && row.enabled);
  const providers = await Promise.all(
    connected.map(async (row) => {
      const listed = await listProviderModels(row.provider);
      const models = modelsForChooser(listed.models, [
        ...listed.models.map((model) => model.id),
        ...(prefs.agent.customModelIds?.[row.provider] ?? []),
      ]);
      return {
        provider: row.provider,
        ...listed,
        models,
        ok: listed.ok || models.length > 0,
      };
    }),
  );
  return { providers };
}

type ProviderConnection = {
  provider: AgentProviderId;
  key: string;
  ollamaBaseUrl: string;
  lmstudioBaseUrl: string;
  compatibleBaseUrl: string;
};

type ModelDiscoveryResult =
  | { ok: true; json: JsonValue }
  | { ok: false; error: string; unsupported?: boolean };

export async function checkProviderKey(
  input: ProviderConnection,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: boolean; error?: string }> {
  const fetched = await fetchProviderModels(input, fetcher);
  if (fetched.ok || fetched.unsupported) return { ok: true };
  return { ok: false, error: fetched.error };
}

async function fetchProviderModels(
  input: ProviderConnection,
  fetcher: typeof fetch = fetch,
): Promise<ModelDiscoveryResult> {
  const { provider, key } = input;
  const name = label(provider);
  let url: string;
  const headers: Record<string, string> = {};
  if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/models";
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
  } else if (provider === "gemini") {
    url = "https://generativelanguage.googleapis.com/v1beta/models";
    headers["x-goog-api-key"] = key;
  } else {
    const base =
      provider === "ollama"
        ? input.ollamaBaseUrl
        : provider === "lmstudio"
          ? input.lmstudioBaseUrl
          : provider === "compatible"
            ? input.compatibleBaseUrl
            : "https://api.openai.com/v1";
    if (!base) return { ok: false, error: "Enter an API base URL first." };
    url = `${base.replace(/\/$/, "")}/models`;
    if (key) headers.Authorization = `Bearer ${key}`;
  }
  try {
    const res = await fetcher(url, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          error: `${name} rejected this key or its permissions. Check it in Settings.`,
        };
      }
      const unsupported =
        (provider === "compatible" || provider === "lmstudio") &&
        [404, 405, 501].includes(res.status);
      return {
        ok: false,
        unsupported,
        error: unsupported
          ? `${name} does not list models. Add a custom model ID.`
          : `Could not load models from ${name} (HTTP ${res.status}). Try again later.`,
      };
    }
    try {
      const json = z.json().parse(await res.json());
      const schema =
        provider === "gemini"
          ? z.object({ models: z.array(z.json()) })
          : z.object({ data: z.array(z.json()) });
      if (!schema.safeParse(json).success) {
        return { ok: false, error: `${name} returned an invalid model list.` };
      }
      return { ok: true, json };
    } catch {
      return { ok: false, error: `${name} returned an invalid model list.` };
    }
  } catch {
    return {
      ok: false,
      error: `Could not reach ${name}. Check the network and try again.`,
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
