import { Button, Input, Settings, Switch } from "@pond/ui";
import { useCallback, useState } from "react";
import { type EnumOption, EnumSelect } from "@/components/enum-select";
import { ModelPicker } from "@/components/model-picker";
import { EMBEDDING_CATALOG } from "@/lib/enrichment/model-catalogs";
import { usePrefs } from "@/stores/prefs";

type Provider = "bundled" | "ollama" | "lmstudio" | "custom";

const PROVIDER_OPTIONS: readonly EnumOption<Provider>[] = [
  { value: "ollama", label: "Ollama" },
  { value: "lmstudio", label: "LM Studio" },
  { value: "custom", label: "Custom (OpenAI-compatible)" },
  { value: "bundled", label: "Bundled (on-device)" },
];

const PROVIDER_HINTS: Record<Provider, string> = {
  ollama: "Local Ollama server, usually http://127.0.0.1:11434.",
  lmstudio: "LM Studio's local server, usually http://127.0.0.1:1234.",
  custom: "Any OpenAI-compatible endpoint. An API key is optional.",
  bundled: "Runs a small model fully on-device. Downloaded on first use.",
};

export function AiSection() {
  const [prefs, patch] = usePrefs("ai");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const provider = (prefs.provider ?? "ollama") as Provider;
  const isHttp = provider !== "bundled";

  const saveApiKey = useCallback(async () => {
    await window.pond.query("ai.setApiKey", { key: apiKey });
    setApiKey("");
    setStatus("API key saved.");
  }, [apiKey]);

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
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>AI</Settings.Title>
        <Settings.Description>
          On-device search and natural-language find.
        </Settings.Description>
      </Settings.Header>

      <Settings.Section>
        <Settings.SectionTitle>Find anything</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Natural-language search</Settings.ItemTitle>
              <Settings.ItemDescription>
                Turn plain English into filters with a local model. Falls back
                to built-in matching.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={prefs.nlCompiler === true}
                onCheckedChange={(v) => patch({ nlCompiler: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Semantic search</Settings.ItemTitle>
              <Settings.ItemDescription>
                Search and rank by meaning, not just keywords. Embeddings stay
                on your device.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={prefs.semanticSearch === true}
                onCheckedChange={(v) => patch({ semanticSearch: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Model provider</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Provider</Settings.ItemTitle>
              <Settings.ItemDescription>
                {PROVIDER_HINTS[provider]}
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <EnumSelect<Provider>
                value={provider}
                onValueChange={(v) => patch({ provider: v })}
                options={PROVIDER_OPTIONS}
              />
            </Settings.ItemControl>
          </Settings.Item>

          {isHttp ? (
            <>
              <Settings.Item>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>Endpoint</Settings.ItemTitle>
                  <Settings.ItemDescription>
                    Base URL of the local server. Blank uses the default.
                  </Settings.ItemDescription>
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  <Input.Field
                    data-size="sm"
                    placeholder="http://127.0.0.1:11434"
                    value={prefs.endpoint ?? ""}
                    onChange={(e) => patch({ endpoint: e.target.value })}
                    style={{ width: 240 }}
                  />
                </Settings.ItemControl>
              </Settings.Item>

              <Settings.Item>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>Model</Settings.ItemTitle>
                  <Settings.ItemDescription>
                    Model id the provider uses.
                  </Settings.ItemDescription>
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  <Input.Field
                    data-size="sm"
                    placeholder="llama3.2:1b"
                    value={prefs.modelId ?? ""}
                    onChange={(e) => patch({ modelId: e.target.value })}
                    style={{ width: 240 }}
                  />
                </Settings.ItemControl>
              </Settings.Item>
            </>
          ) : null}

          {provider === "custom" ? (
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>API key</Settings.ItemTitle>
                <Settings.ItemDescription>
                  Optional. Stored in your OS keychain.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <div style={{ display: "flex", gap: 6 }}>
                  <Input.Field
                    data-size="sm"
                    type="password"
                    placeholder="sk-…"
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

      <Settings.Section>
        <Settings.SectionTitle>Embeddings</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Embedding model</Settings.ItemTitle>
              <Settings.ItemDescription>
                Model used for semantic search. Changing it re-embeds your
                library.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <ModelPicker
                catalog={EMBEDDING_CATALOG}
                value={prefs.embedModelId ?? ""}
                onChange={(id) => patch({ embedModelId: id })}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>
    </Settings.Page>
  );
}
