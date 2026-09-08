import { DEFAULT_PREFS } from "@pond/schema";
import { Settings } from "@pond/ui";
import { ASSISTANT_MODELS } from "@shared/assistant";
import { displayName, modelsForChooser } from "@shared/provider-models";
import type { QueryName } from "@shared/query-contracts";
import type { WireJson } from "@shared/wire";
import { useState } from "react";
import { z } from "zod";
import { ModelPicker } from "@/features/agent/components/pane/model-picker";
import composerStyles from "@/features/agent/components/pane/pane.module.css";
import { ProviderSettings } from "@/features/settings/components/sections/agent/provider-settings";
import type {
  AgentPrefs,
  KeyRow,
} from "@/features/settings/components/sections/agent/types";

const providerInput = z.object({
  provider: z.enum(ASSISTANT_MODELS.map((catalog) => catalog.id)),
});
const params = new URLSearchParams(window.location.search);
let agent: AgentPrefs = {
  ...DEFAULT_PREFS.agent,
  languageModel: params.get("state") === "empty" ? "" : "anthropic",
  modelIds: { anthropic: "claude-sonnet-4-6", openai: "gpt-5.6-sol" },
};
let keys: KeyRow[] = ASSISTANT_MODELS.map((catalog) => ({
  provider: catalog.id,
  hasKey:
    params.get("state") !== "empty" &&
    ["anthropic", "openai"].includes(catalog.id),
  masked: "Saved key",
  enabled: true,
}));

const models = (provider: string) => {
  const catalog = ASSISTANT_MODELS.find((entry) => entry.id === provider);
  const listed =
    provider === "anthropic"
      ? [
          { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
          { id: "claude-opus-5", name: "Claude Opus 5" },
          ...[
            "claude-haiku-4-5",
            "claude-opus-4-6",
            "claude-opus-4-5",
            "claude-sonnet-4-5",
            "claude-sonnet-4",
          ].map((id) => ({ id, name: displayName(id) })),
        ]
      : provider === "openai"
        ? [
            "gpt-5.6-sol",
            "gpt-5.6-luna",
            "gpt-5.5",
            "gpt-5.4",
            "gpt-5.4-mini",
            "gpt-4.1",
            "gpt-4.1-mini",
            "o3",
            "o4-mini",
          ].map((id) => ({ id, name: displayName(id) }))
        : catalog
          ? [{ id: catalog.model, name: catalog.name }]
          : [];
  return modelsForChooser(listed, [
    ...listed.map((model) => model.id),
    ...(agent.customModelIds?.[provider] ?? []),
  ]);
};

if (window.pond)
  throw new Error("Open this preview in a browser outside Pond.");
Object.defineProperty(window, "pond", {
  configurable: true,
  value: {
    async query(name: QueryName, input: WireJson) {
      if (name === "agent.listAvailableModels")
        return {
          providers: keys
            .filter((key) => key.hasKey && key.enabled)
            .map((key) => ({
              provider: key.provider,
              ok: true,
              models: models(key.provider),
            })),
        };
      const { provider } = providerInput.parse(input);
      if (name === "agent.listModels")
        return { ok: true, models: models(provider) };
      if (name === "agent.saveKey") {
        const { key } = z.object({ key: z.string() }).parse(input);
        if (key === "invalid")
          return {
            ok: false,
            error: "Could not verify this key. Check it and try again.",
          };
        keys = keys.map((row) =>
          row.provider === provider
            ? { ...row, hasKey: true, enabled: true }
            : row,
        );
        return { ok: true };
      }
      if (name === "agent.removeKey") {
        keys = keys.map((row) =>
          row.provider === provider ? { ...row, hasKey: false } : row,
        );
        return { ok: true };
      }
      if (name === "agent.setKeyEnabled") {
        const { enabled } = z.object({ enabled: z.boolean() }).parse(input);
        keys = keys.map((row) =>
          row.provider === provider ? { ...row, enabled } : row,
        );
        return { ok: true };
      }
      throw new Error(`No preview fixture for ${name}`);
    },
  },
});

export function ProviderSettingsPreview() {
  const [prefs, setPrefs] = useState(agent);
  const [rows, setRows] = useState(keys);
  if (params.get("view") === "composer")
    return (
      <Settings.Page>
        <Settings.Header>
          <Settings.HeaderText>
            <Settings.Title>Assistant</Settings.Title>
            <Settings.Description>Model picker preview</Settings.Description>
          </Settings.HeaderText>
        </Settings.Header>
        <div
          className={composerStyles.assistant}
          data-layout="page"
          style={{ marginTop: 400 }}
        >
          <div className={composerStyles["composer-shell"]}>
            <div className={composerStyles.composer}>
              <textarea
                className={composerStyles["composer-input"]}
                aria-label="Assistant message"
                placeholder="Ask about your library…"
              />
              <div className={composerStyles["composer-toolbar"]}>
                <ModelPicker
                  provider={
                    ASSISTANT_MODELS.find(
                      (model) => model.id === prefs.languageModel,
                    )?.id
                  }
                  modelId={prefs.modelIds?.[prefs.languageModel]}
                  onChange={({ provider, modelId }) =>
                    setPrefs((current) => ({
                      ...current,
                      languageModel: provider,
                      modelIds: { ...current.modelIds, [provider]: modelId },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </Settings.Page>
    );
  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.HeaderText>
          <Settings.Title>Integrations</Settings.Title>
          <Settings.Description>
            Connect AI providers and choose the models Pond uses.
          </Settings.Description>
        </Settings.HeaderText>
      </Settings.Header>
      <ProviderSettings
        agent={prefs}
        keys={rows}
        onPatchAgent={async (patch) => {
          agent = { ...agent, ...patch };
          setPrefs(agent);
        }}
        onRefresh={async () => setRows([...keys])}
      />
    </Settings.Page>
  );
}
