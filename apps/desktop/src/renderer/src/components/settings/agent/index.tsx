import { Button, Input, Select, Settings, Switch } from "@pond/ui";
import { ASSISTANT_MODELS, type AssistantProvider } from "@shared/assistant";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { usePrefs } from "@/stores/prefs";
import styles from "./styles.module.css";

type ProviderId = Exclude<AssistantProvider, "minnow">;

interface KeyRow {
  provider: ProviderId;
  hasKey: boolean;
  masked: string | null;
  enabled: boolean;
}

const KeyRowsSchema = z.array(
  z.object({
    provider: z.enum([
      "anthropic",
      "openai",
      "gemini",
      "ollama",
      "lmstudio",
      "compatible",
    ]),
    hasKey: z.boolean(),
    masked: z.string().nullable(),
    enabled: z.boolean(),
  }),
);
const McpSnippetSchema = z.object({ json: z.string().optional() });

const PROVIDERS = ASSISTANT_MODELS.filter(
  (model): model is (typeof ASSISTANT_MODELS)[number] & { id: ProviderId } =>
    model.id !== "minnow",
).map((model) => ({
  id: model.id,
  label: model.provider,
  needsKey: model.needsKey,
}));

const MODELS = ASSISTANT_MODELS.map((model) => ({
  value: model.id,
  label: model.name,
}));

export function AgentSection() {
  const [agent, patchAgent] = usePrefs("agent");
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [snippet, setSnippet] = useState("");
  const [copied, setCopied] = useState(false);
  const [modelDraft, setModelDraft] = useState("");
  const [endpointDraft, setEndpointDraft] = useState("");

  const customProvider =
    agent.languageModel === "ollama" ||
    agent.languageModel === "lmstudio" ||
    agent.languageModel === "compatible"
      ? agent.languageModel
      : null;
  const selectedModelId =
    customProvider === "ollama"
      ? agent.ollamaModelId
      : customProvider === "lmstudio"
        ? agent.lmstudioModelId
        : customProvider === "compatible"
          ? agent.compatibleModelId
          : "";
  const selectedEndpoint =
    customProvider === "ollama"
      ? agent.ollamaBaseUrl
      : customProvider === "lmstudio"
        ? agent.lmstudioBaseUrl
        : customProvider === "compatible"
          ? agent.compatibleBaseUrl
          : "";

  useEffect(() => {
    setModelDraft(selectedModelId);
    setEndpointDraft(selectedEndpoint);
  }, [selectedEndpoint, selectedModelId]);

  const persistCustom = (kind: "model" | "endpoint") => {
    if (!customProvider) return;
    const value = kind === "model" ? modelDraft : endpointDraft;
    if (customProvider === "ollama")
      patchAgent(
        kind === "model" ? { ollamaModelId: value } : { ollamaBaseUrl: value },
      );
    else if (customProvider === "lmstudio")
      patchAgent(
        kind === "model"
          ? { lmstudioModelId: value }
          : { lmstudioBaseUrl: value },
      );
    else
      patchAgent(
        kind === "model"
          ? { compatibleModelId: value }
          : { compatibleBaseUrl: value },
      );
  };

  const refresh = useCallback(async () => {
    setKeys(KeyRowsSchema.parse(await window.pond.query("agent.keys", {})));
  }, []);

  useEffect(() => {
    void refresh();
    void window.pond.query("agent.mcpSnippet", {}).then((res) => {
      const payload = McpSnippetSchema.parse(res);
      setSnippet(payload.json ?? "");
    });
  }, [refresh]);

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>Assistant</Settings.Title>
        <Settings.Description>
          Paste a provider key or stay on Minnow on this Mac.
        </Settings.Description>
      </Settings.Header>

      <Settings.Section>
        <Settings.SectionTitle>Model</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Language Model</Settings.ItemTitle>
              <Settings.ItemDescription>
                Assistant uses this model for chat. Enrichments stay on-device.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={agent.languageModel ?? "minnow"}
                onValueChange={(value) => {
                  if (value) patchAgent({ languageModel: String(value) });
                }}
              >
                <Select.Trigger size="sm">
                  <Select.Value>
                    {(value: string) =>
                      MODELS.find((model) => model.value === value)?.label ??
                      "Minnow"
                    }
                  </Select.Value>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      <Select.Items items={MODELS} />
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Allow Cloud Sends</Settings.ItemTitle>
              <Settings.ItemDescription>
                Required before Assistant sends a prompt to OpenAI, Anthropic,
                Gemini, or a compatible endpoint.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={Boolean(agent.cloudAllowed)}
                onCheckedChange={(checked) =>
                  patchAgent({ cloudAllowed: Boolean(checked) })
                }
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Keys</Settings.SectionTitle>
        <Settings.List>
          {PROVIDERS.map((provider) => {
            const row = keys.find((item) => item.provider === provider.id);
            return (
              <Settings.Item key={provider.id}>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>{provider.label}</Settings.ItemTitle>
                  <Settings.ItemDescription>
                    {row?.hasKey
                      ? row.masked === "local"
                        ? "Connected on this Mac."
                        : `Saved as ${row.masked}.`
                      : provider.needsKey
                        ? "Paste a key, then save to verify it."
                        : "Verifies the local endpoint. A key is optional."}
                  </Settings.ItemDescription>
                  {errors[provider.id] ? (
                    <p className={styles.error}>{errors[provider.id]}</p>
                  ) : null}
                  {!row?.hasKey ? (
                    <Input.Root size="sm" className={styles.key}>
                      <Input.Field
                        type="password"
                        value={drafts[provider.id] ?? ""}
                        placeholder="Key"
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [provider.id]: e.target.value,
                          }))
                        }
                      />
                    </Input.Root>
                  ) : null}
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  {row?.hasKey ? (
                    <>
                      <Switch.Root
                        checked={row.enabled}
                        onCheckedChange={(checked) => {
                          void window.pond
                            .query("agent.setKeyEnabled", {
                              provider: provider.id,
                              enabled: Boolean(checked),
                            })
                            .then(() => refresh());
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void window.pond
                            .query("agent.removeKey", { provider: provider.id })
                            .then(() => refresh());
                        }}
                      >
                        Remove
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void window.pond
                          .query("agent.saveKey", {
                            provider: provider.id,
                            key: drafts[provider.id] ?? "",
                          })
                          .then((res) => {
                            const result = res as {
                              ok: boolean;
                              error?: string;
                            };
                            if (!result.ok) {
                              setErrors((prev) => ({
                                ...prev,
                                [provider.id]:
                                  result.error ??
                                  "Could not verify this key. Check it and try again.",
                              }));
                              return;
                            }
                            setErrors((prev) => ({
                              ...prev,
                              [provider.id]: "",
                            }));
                            setDrafts((prev) => ({
                              ...prev,
                              [provider.id]: "",
                            }));
                            void refresh();
                          });
                      }}
                    >
                      Save
                    </Button>
                  )}
                </Settings.ItemControl>
              </Settings.Item>
            );
          })}
          {customProvider ? (
            <>
              <Settings.Item>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>Model ID</Settings.ItemTitle>
                  <Settings.ItemDescription>
                    Exact model name exposed by this endpoint.
                  </Settings.ItemDescription>
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  <Input.Root size="sm">
                    <Input.Field
                      value={modelDraft}
                      onChange={(e) => setModelDraft(e.target.value)}
                      onBlur={() => persistCustom("model")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                    />
                  </Input.Root>
                </Settings.ItemControl>
              </Settings.Item>
              <Settings.Item>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>Endpoint</Settings.ItemTitle>
                  <Settings.ItemDescription>
                    OpenAI-compatible base URL, including /v1.
                  </Settings.ItemDescription>
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  <Input.Root size="sm">
                    <Input.Field
                      value={endpointDraft}
                      onChange={(e) => setEndpointDraft(e.target.value)}
                      onBlur={() => persistCustom("endpoint")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                    />
                  </Input.Root>
                </Settings.ItemControl>
              </Settings.Item>
            </>
          ) : null}
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>MCP</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Cursor</Settings.ItemTitle>
              <Settings.ItemDescription>
                Paste this into mcp.json so Cursor can search this library over
                stdio. Pond does not host an MCP endpoint.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(snippet).then(() => {
                    setCopied(true);
                  });
                }}
              >
                {copied ? "Copied" : "Copy Snippet"}
              </Button>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>
    </Settings.Page>
  );
}
