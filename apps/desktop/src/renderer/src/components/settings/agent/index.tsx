import { Accordion, Select, Settings } from "@pond/ui";
import { ASSISTANT_MODELS } from "@shared/assistant";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { usePrefs } from "@/stores/prefs";
import { ProviderCard } from "./provider";
import styles from "./styles.module.css";
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
  const [agent, patchAgent, loaded] = usePrefs("agent");
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [openIds, setOpenIds] = useState<string[] | undefined>(undefined);

  const refresh = useCallback(async () => {
    setKeys(KeyRowsSchema.parse(await window.pond.query("agent.keys", {})));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = agent.languageModel || "";
  const expanded = openIds ?? (selected ? [selected] : []);

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.HeaderText>
          <Settings.Title>Models</Settings.Title>
          <Settings.Description>
            Paste a key, or point at Ollama or LM Studio on this Mac.
          </Settings.Description>
        </Settings.HeaderText>
      </Settings.Header>

      <Settings.Section>
        <Settings.SectionTitle>Providers</Settings.SectionTitle>
        {loaded ? (
          <Accordion.Root
            multiple
            value={expanded}
            onValueChange={setOpenIds}
            className={styles.list}
          >
            {ASSISTANT_MODELS.map((catalog) => (
              <ProviderCard
                key={catalog.id}
                catalog={catalog}
                row={keys.find((item) => item.provider === catalog.id)}
                selected={selected === catalog.id}
                open={expanded.includes(catalog.id)}
                agent={agent}
                onPatchAgent={patchAgent}
                onRefresh={refresh}
              />
            ))}
          </Accordion.Root>
        ) : null}
      </Settings.Section>
      <Settings.Section>
        <Settings.Item>
          <Settings.ItemDetails>
            <Settings.ItemTitle>Vision Model</Settings.ItemTitle>
            <Settings.ItemDescription>
              Looks at attached images when the provider supports it.
            </Settings.ItemDescription>
          </Settings.ItemDetails>
          <Settings.ItemControl>
            <Select.Root
              value={agent.visionModel || selected || "anthropic"}
              onValueChange={(next) => {
                if (
                  next &&
                  ASSISTANT_MODELS.some((model) => model.id === next)
                ) {
                  patchAgent({ visionModel: next });
                }
              }}
            >
              <Select.Trigger>
                <Select.Value>
                  {(value: string) =>
                    ASSISTANT_MODELS.find((model) => model.id === value)
                      ?.name ?? value
                  }
                </Select.Value>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner sideOffset={6}>
                  <Select.Popup>
                    <Select.Items
                      items={ASSISTANT_MODELS.filter(
                        (model) => model.capabilities.vision,
                      ).map((model) => ({
                        value: model.id,
                        label: model.name,
                      }))}
                    />
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </Settings.ItemControl>
        </Settings.Item>
      </Settings.Section>
    </Settings.Page>
  );
}
