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
import { usePrefs } from "@/stores/prefs";

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

export function AiModelsSection() {
  const [prefs, patch] = usePrefs("ai");
  const [apiKey, setApiKey] = useState("");
  const [keyPresent, setKeyPresent] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const provider = (prefs.provider ?? "ollama") as AiProviderId;
  const meta = AI_PROVIDERS[provider];
  const isHttp = meta.transport !== "bundled";
  const isLocal = provider === "ollama" || provider === "lmstudio";
  // Only local servers and the custom endpoint need a base URL; hosted vendors
  // use their package default, so don't surface an override for them.
  const showEndpoint = isLocal || provider === "custom";
  const showApiKey = meta.requiresKey || provider === "custom";
  const hasModelCatalog = providerModels(provider).length > 0;

  // Reflect whether a key is stored for the selected provider (never the key).
  useEffect(() => {
    let active = true;
    setApiKey("");
    if (!showApiKey) {
      setKeyPresent(false);
      return;
    }
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
  }, [provider, showApiKey]);

  const saveApiKey = useCallback(async () => {
    await window.pond.query("ai.setApiKey", { provider, key: apiKey });
    const present = apiKey.trim().length > 0;
    setApiKey("");
    setKeyPresent(present);
    setStatus(present ? "API key saved." : "API key cleared.");
  }, [apiKey, provider]);

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
    <Settings.Section>
      <Settings.SectionTitle>Provider</Settings.SectionTitle>
      <Settings.List>
        <Settings.Item>
          <Settings.ItemDetails>
            <Settings.ItemTitle>Provider</Settings.ItemTitle>
            <Settings.ItemDescription>{meta.hint}</Settings.ItemDescription>
          </Settings.ItemDetails>
          <Settings.ItemControl>
            <EnumSelect<AiProviderId>
              value={provider}
              onValueChange={(v) => patch({ provider: v })}
              options={PROVIDER_OPTIONS}
            />
          </Settings.ItemControl>
        </Settings.Item>

        {isHttp ? (
          <>
            {showEndpoint ? (
              <Settings.Item>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>Endpoint</Settings.ItemTitle>
                  <Settings.ItemDescription>
                    {isLocal
                      ? "Base URL of the local server. Blank uses the default."
                      : "API base URL. Blank uses the provider default."}
                  </Settings.ItemDescription>
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  <Input.Field
                    data-size="sm"
                    placeholder={meta.baseUrl || "https://api.example.com/v1"}
                    value={prefs.endpoint ?? ""}
                    onChange={(e) => patch({ endpoint: e.target.value })}
                    style={{ width: 240 }}
                  />
                </Settings.ItemControl>
              </Settings.Item>
            ) : null}

            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Model</Settings.ItemTitle>
                <Settings.ItemDescription>
                  Model id the provider uses.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                {hasModelCatalog ? (
                  <AiModelPicker
                    provider={provider}
                    value={prefs.modelId ?? ""}
                    onChange={(id) => patch({ modelId: id })}
                    placeholder={meta.defaultModel}
                  />
                ) : (
                  <Input.Field
                    data-size="sm"
                    placeholder={meta.defaultModel}
                    value={prefs.modelId ?? ""}
                    onChange={(e) => patch({ modelId: e.target.value })}
                    style={{ width: 240 }}
                  />
                )}
              </Settings.ItemControl>
            </Settings.Item>
          </>
        ) : null}

        {showApiKey ? (
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>API key</Settings.ItemTitle>
              <Settings.ItemDescription>
                {meta.requiresKey
                  ? keyPresent
                    ? "Saved. Stored in your OS keychain. Enter a new key to replace it."
                    : "Required. Stored in your OS keychain."
                  : keyPresent
                    ? "Saved. Stored in your OS keychain."
                    : "Optional. Stored in your OS keychain."}
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
          </Settings.Item>
        ) : null}

        <Settings.Item>
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
        </Settings.Item>
      </Settings.List>
    </Settings.Section>
  );
}
