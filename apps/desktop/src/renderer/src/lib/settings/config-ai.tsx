import {
  AI_PROVIDERS,
  type AiProviderId,
  modelSupportsAgent,
  providerModels,
} from "@pond/schema";
import { Button, Input, Settings, Switch } from "@pond/ui";
import { useCallback, useEffect, useState } from "react";
import { EnrichmentModelPicker } from "@/components/enrichment-model-picker";
import { ProviderLogo } from "@/components/provider-logo";
import { EMBEDDING_CATALOG } from "@/lib/enrichment/model-catalogs";
import { type Binding, defineSection } from "@/lib/settings/engine-types";
import { settingsModal } from "@/stores/settings-modal";

interface AiValues {
  provider?: AiProviderId;
  endpoint?: string;
  modelId?: string;
  nlCompiler?: boolean;
  agent?: boolean;
  semanticSearch?: boolean;
  embedModelId?: string;
}

function aiValues(binding: Binding): AiValues {
  return binding.values as AiValues;
}

function providerOf(values: Record<string, unknown>): AiProviderId {
  return (values as AiValues).provider ?? "ollama";
}

function showEndpoint(provider: AiProviderId): boolean {
  return (
    provider === "ollama" || provider === "lmstudio" || provider === "custom"
  );
}

/** Catalog providers settle the model on the picker page; the rest free-type it here. */
function showModelInput(provider: AiProviderId): boolean {
  return (
    AI_PROVIDERS[provider].transport !== "bundled" &&
    providerModels(provider).length === 0
  );
}

function showApiKey(provider: AiProviderId): boolean {
  return AI_PROVIDERS[provider].requiresKey || provider === "custom";
}

function ProviderRow({ binding }: { binding: Binding }) {
  const values = aiValues(binding);
  const provider = values.provider ?? "ollama";
  const meta = AI_PROVIDERS[provider];

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Model</Settings.ItemTitle>
        <Settings.ItemDescription>
          Select the model you want to use for your library.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => settingsModal.open("ai-providers")}
        >
          <ProviderLogo provider={provider} size={16} />
          {meta.label}
        </Button>
      </Settings.ItemControl>
    </>
  );
}

function EndpointRow({ binding }: { binding: Binding }) {
  const values = aiValues(binding);
  const provider = providerOf(binding.values);
  const meta = AI_PROVIDERS[provider];
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Endpoint</Settings.ItemTitle>
        <Settings.ItemDescription>
          {provider === "custom"
            ? "API base URL. Blank uses the provider default."
            : "Base URL of the local server. Blank uses the default."}
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Input.Field
          data-size="sm"
          placeholder={meta.baseUrl || "https://api.example.com/v1"}
          value={values.endpoint ?? ""}
          onChange={(e) => binding.patch({ endpoint: e.target.value })}
          style={{ width: 240 }}
        />
      </Settings.ItemControl>
    </>
  );
}

function ModelIdRow({ binding }: { binding: Binding }) {
  const values = aiValues(binding);
  const provider = providerOf(binding.values);
  const meta = AI_PROVIDERS[provider];
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Model ID</Settings.ItemTitle>
        <Settings.ItemDescription>
          Model id the provider uses.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Input.Field
          data-size="sm"
          placeholder={meta.defaultModel}
          value={values.modelId ?? ""}
          onChange={(e) => binding.patch({ modelId: e.target.value })}
          style={{ width: 240 }}
        />
      </Settings.ItemControl>
    </>
  );
}

function ApiKeyRow({ binding }: { binding: Binding }) {
  const provider = providerOf(binding.values);
  const meta = AI_PROVIDERS[provider];
  const [apiKey, setApiKey] = useState("");
  const [keyPresent, setKeyPresent] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setApiKey("");
    setSaved(null);
    void window.pond
      .query("ai.hasApiKey", { provider })
      .then((res) => {
        if (active)
          setKeyPresent(Boolean((res as { present?: boolean }).present));
      })
      .catch(() => {
        if (active) setKeyPresent(false);
      });
    return () => {
      active = false;
    };
  }, [provider]);

  const saveApiKey = useCallback(async () => {
    await window.pond.query("ai.setApiKey", { provider, key: apiKey });
    const present = apiKey.trim().length > 0;
    setApiKey("");
    setKeyPresent(present);
    setSaved(present ? "API key saved." : "API key cleared.");
  }, [apiKey, provider]);

  const description = meta.requiresKey
    ? keyPresent
      ? "Saved. Stored in your OS keychain. Enter a new key to replace it."
      : "Required. Stored in your OS keychain."
    : keyPresent
      ? "Saved. Stored in your OS keychain."
      : "Optional. Stored in your OS keychain.";

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>API Key</Settings.ItemTitle>
        <Settings.ItemDescription>
          {saved ?? description}
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <div style={{ display: "flex", gap: 6 }}>
          <Input.Field
            data-size="sm"
            type="password"
            placeholder={keyPresent ? "••••••••" : meta.keyPlaceholder}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ width: 200 }}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={!keyPresent && apiKey.trim().length === 0}
            onClick={() => void saveApiKey()}
          >
            {keyPresent && apiKey.trim().length === 0 ? "Clear" : "Save"}
          </Button>
        </div>
      </Settings.ItemControl>
    </>
  );
}

function ConnectionRow() {
  const [status, setStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const testProvider = useCallback(async () => {
    setTesting(true);
    setStatus(null);
    try {
      const res = (await window.pond.query("ai.providerStatus", {})) as {
        available?: boolean;
      };
      setStatus(
        res.available ? "Provider reachable." : "Provider unreachable.",
      );
    } catch {
      setStatus("Provider check failed.");
    } finally {
      setTesting(false);
    }
  }, []);

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Connection</Settings.ItemTitle>
        <Settings.ItemDescription>
          {status ?? "Check if the provider is reachable."}
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void testProvider()}
          disabled={testing}
        >
          {testing ? "Testing" : "Test Connection"}
        </Button>
      </Settings.ItemControl>
    </>
  );
}

/** Agent mode keeps a state-dependent description and disable rule, so it renders as a custom row rather than a plain switch field. */
function AgentRow({ binding }: { binding: Binding }) {
  const values = aiValues(binding);
  const provider = values.provider ?? "ollama";
  const nlOn = values.nlCompiler === true;
  const supportsAgent = modelSupportsAgent(provider, values.modelId);

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Agent Mode</Settings.ItemTitle>
        <Settings.ItemDescription>
          {!nlOn
            ? "Turn on natural-language search to enable agent mode."
            : supportsAgent
              ? "Let the model reason in steps: inspect your library, group, sample, and answer questions like “a few from each source” or “how many videos vs articles”."
              : "Requires a capable model (OpenAI, Anthropic, Gemini, etc.). The current model stays on single-step search."}
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Switch.Root
          checked={nlOn && supportsAgent && values.agent === true}
          disabled={!nlOn || !supportsAgent}
          onCheckedChange={(v) => binding.patch({ agent: v })}
        />
      </Settings.ItemControl>
    </>
  );
}

function EmbeddingRow({ binding }: { binding: Binding }) {
  const values = aiValues(binding);
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Embedding Model</Settings.ItemTitle>
        <Settings.ItemDescription>
          On-device model that powers semantic search.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <EnrichmentModelPicker
          catalog={EMBEDDING_CATALOG}
          value={values.embedModelId ?? ""}
          onChange={(id) => binding.patch({ embedModelId: id })}
        />
      </Settings.ItemControl>
    </>
  );
}

export const aiSection = defineSection("ai", {
  title: "AI",
  description: "Configure how Pond understands and searches your library.",
  groups: [
    {
      title: "Model",
      items: [
        {
          control: "custom",
          key: "provider",
          title: "Model",
          keywords: [
            "provider",
            "model",
            "openai",
            "anthropic",
            "ollama",
            "gemini",
            "vendor",
            "api key",
            "endpoint",
            "token",
            "keychain",
          ],
          render: (binding) => <ProviderRow binding={binding} />,
        },
        {
          control: "custom",
          key: "endpoint",
          title: "Endpoint",
          keywords: ["base url", "server", "host"],
          visible: (values) => showEndpoint(providerOf(values)),
          render: (binding) => <EndpointRow binding={binding} />,
        },
        {
          control: "custom",
          key: "modelId",
          title: "Model ID",
          keywords: ["model id", "gpt", "claude", "llm"],
          visible: (values) => showModelInput(providerOf(values)),
          render: (binding) => <ModelIdRow binding={binding} />,
        },
        {
          control: "custom",
          key: "apiKey",
          title: "API Key",
          keywords: ["token", "secret", "keychain", "credentials"],
          visible: (values) => showApiKey(providerOf(values)),
          render: (binding) => <ApiKeyRow binding={binding} />,
        },
        {
          control: "custom",
          key: "connection",
          title: "Connection",
          keywords: ["test", "reachable", "status", "ping"],
          render: () => <ConnectionRow />,
        },
      ],
    },
    {
      title: "Natural Language",
      items: [
        {
          control: "switch",
          key: "nlCompiler",
          title: "Natural-Language Search",
          description:
            "Turn plain English into filters with your selected model. Falls back to built-in matching.",
          keywords: ["nlp", "query", "search", "natural language"],
        },
        {
          control: "custom",
          key: "agent",
          title: "Agent Mode",
          keywords: ["reasoning", "agentic", "steps", "assistant"],
          render: (binding) => <AgentRow binding={binding} />,
        },
      ],
    },
    {
      title: "Semantic Search",
      items: [
        {
          control: "switch",
          key: "semanticSearch",
          title: "Semantic Search",
          description:
            "Search and rank by meaning, not just keywords. Embeddings stay on your device.",
          keywords: ["embeddings", "meaning", "vector", "similarity"],
        },
        {
          control: "custom",
          key: "embedModelId",
          title: "Embedding Model",
          keywords: ["embeddings", "model", "on-device"],
          visible: (values) => (values as AiValues).semanticSearch === true,
          render: (binding) => <EmbeddingRow binding={binding} />,
        },
      ],
    },
  ],
});
