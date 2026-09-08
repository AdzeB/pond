import { Button, Settings } from "@pond/ui";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { McpCursorRow } from "@/features/settings/components/sections/mcp/mcp";
import { savePrefsSection, usePrefs } from "@/features/settings/state/prefs";
import { ProviderSettings } from "./provider-settings";
import type { KeyRow } from "./types";

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

export function AgentSection() {
  const [agent, , loaded] = usePrefs("agent");
  const [error, setError] = useState("");
  const [keysLoaded, setKeysLoaded] = useState(false);
  const [keys, setKeys] = useState<KeyRow[]>([]);

  const refresh = useCallback(async () => {
    setKeys(KeyRowsSchema.parse(await window.pond.query("agent.keys", {})));
    setKeysLoaded(true);
    setError("");
  }, []);

  useEffect(() => {
    void refresh().catch(() =>
      setError("Could not load providers. Try again."),
    );
  }, [refresh]);

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.HeaderText>
          <Settings.Title>Integrations</Settings.Title>
          <Settings.Description>
            Connect AI providers and let other apps work with your library.
          </Settings.Description>
        </Settings.HeaderText>
      </Settings.Header>

      {loaded && keysLoaded ? (
        <ProviderSettings
          agent={agent}
          keys={keys}
          onPatchAgent={(patch) => savePrefsSection("agent", patch)}
          onRefresh={refresh}
        />
      ) : error ? (
        <Settings.Empty
          title="Providers unavailable"
          description={error}
          action={
            <Button
              size="sm"
              onClick={() =>
                void refresh().catch(() =>
                  setError("Could not load providers. Try again."),
                )
              }
            >
              Retry
            </Button>
          }
        />
      ) : (
        <p role="status">Loading providers</p>
      )}
      <Settings.Section>
        <Settings.SectionTitle>External Apps</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item id="setting-models-mcp">
            <McpCursorRow />
          </Settings.Item>
        </Settings.List>
      </Settings.Section>
    </Settings.Page>
  );
}
