import {
  AI_PROVIDER_IDS,
  AI_PROVIDERS,
  type AiProviderId,
  providerModels,
} from "@pond/schema";
import { Button, Input, Settings } from "@pond/ui";
import { useCallback, useEffect, useState } from "react";
import { AiModelPicker } from "@/components/ai-model-picker";
import { type EnumOption, EnumSelect } from "@/components/enum-select";
import { ProviderLogo } from "@/components/provider-logo";
import { type Binding, defineSection } from "@/lib/settings/engine-types";

const PROVIDER_OPTIONS: readonly EnumOption<AiProviderId>[] =
  AI_PROVIDER_IDS.map((id) => ({
    value: id,
    label: (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <ProviderLogo provider={id} />
        {AI_PROVIDERS[id].label}
      </span>
    ),
  }));

interface AiValues {
  provider?: AiProviderId;
  endpoint?: string;
  modelId?: string;
}

function providerOf(values: Record<string, unknown>): AiProviderId {
  return (values as AiValues).provider ?? "ollama";
}

function isHttp(provider: AiProviderId): boolean {
  return AI_PROVIDERS[provider].transport !== "bundled";
}

function isLocal(provider: AiProviderId): boolean {
  return provider === "ollama" || provider === "lmstudio";
}

function showEndpoint(provider: AiProviderId): boolean {
  return isLocal(provider) || provider === "custom";
}

function showApiKey(provider: AiProviderId): boolean {
  return AI_PROVIDERS[provider].requiresKey || provider === "custom";
}

function ProviderRow({ binding }: { binding: Binding }) {
  const provider = providerOf(binding.values);
  const meta = AI_PROVIDERS[provider];
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Provider</Settings.ItemTitle>
        <Settings.ItemDescription>{meta.hint}</Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <EnumSelect<AiProviderId>
          value={provider}
          onValueChange={(v) => binding.patch({ provider: v })}
          options={PROVIDER_OPTIONS}
        />
      </Settings.ItemControl>
    </>
  );
}

function EndpointRow({ binding }: { binding: Binding }) {
  const provider = providerOf(binding.values);
  const meta = AI_PROVIDERS[provider];
  const values = binding.values as AiValues;
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Endpoint</Settings.ItemTitle>
        <Settings.ItemDescription>
          {isLocal(provider)
            ? "Base URL of the local server. Blank uses the default."
            : "API base URL. Blank uses the provider default."}
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

function ModelRow({ binding }: { binding: Binding }) {
  const provider = providerOf(binding.values);
  const meta = AI_PROVIDERS[provider];
  const values = binding.values as AiValues;
  const hasCatalog = providerModels(provider).length > 0;
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Model</Settings.ItemTitle>
        <Settings.ItemDescription>
          Model id the provider uses.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        {hasCatalog ? (
          <AiModelPicker
            provider={provider}
            value={values.modelId ?? ""}
            onChange={(id) => binding.patch({ modelId: id })}
            placeholder={meta.defaultModel}
          />
        ) : (
          <Input.Field
            data-size="sm"
            placeholder={meta.defaultModel}
            value={values.modelId ?? ""}
            onChange={(e) => binding.patch({ modelId: e.target.value })}
            style={{ width: 240 }}
          />
        )}
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
          <Button size="sm" onClick={() => void saveApiKey()}>
            Save
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
          onClick={() => void testProvider()}
          disabled={testing}
        >
          {testing ? "Testing…" : "Test"}
        </Button>
      </Settings.ItemControl>
    </>
  );
}

export const aiModelsSection = defineSection("ai", {
  title: "Models",
  description: "Choose the provider and model that power AI features.",
  groups: [
    {
      title: "Provider",
      items: [
        {
          control: "custom",
          key: "provider",
          title: "Provider",
          keywords: ["openai", "anthropic", "ollama", "gemini", "vendor"],
          render: (binding) => <ProviderRow binding={binding} />,
        },
        {
          control: "custom",
          key: "endpoint",
          title: "Endpoint",
          keywords: ["base url", "server", "host"],
          visible: (values) => {
            const p = providerOf(values);
            return isHttp(p) && showEndpoint(p);
          },
          render: (binding) => <EndpointRow binding={binding} />,
        },
        {
          control: "custom",
          key: "modelId",
          title: "Model",
          keywords: ["model id", "gpt", "claude", "llm"],
          visible: (values) => isHttp(providerOf(values)),
          render: (binding) => <ModelRow binding={binding} />,
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
  ],
});
