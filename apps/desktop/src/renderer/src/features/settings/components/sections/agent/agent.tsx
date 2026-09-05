import { IconSparkle3Fill18 } from "@pond/icons/fill/18";
import { Accordion, Empty, Select, Settings } from "@pond/ui";
import { ASSISTANT_MODELS, type AssistantProvider } from "@shared/assistant";
import { chosenModelId, displayName } from "@shared/provider-models";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { usePrefs } from "@/features/settings/state/prefs";
import { AddProviderMenu } from "./add-provider";
import styles from "./agent.module.css";
import { ProviderCard } from "./provider/provider";
import type { AgentPrefs, KeyRow } from "./types";

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

function providerLabel(
  id: string,
  agent: { modelIds?: Record<string, string> },
): string {
  const catalog = ASSISTANT_MODELS.find((model) => model.id === id);
  if (!catalog) return id;
  const modelId = chosenModelId(catalog.id, agent);
  if (!modelId) return catalog.provider;
  return `${catalog.provider}, ${displayName(modelId)}`;
}

export function AgentSection() {
  const [agent, patchAgent, loaded] = usePrefs("agent");
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [openIds, setOpenIds] = useState<string[] | undefined>(undefined);
  const [draftingIds, setDraftingIds] = useState<AssistantProvider[]>([]);

  const refresh = useCallback(async () => {
    setKeys(KeyRowsSchema.parse(await window.pond.query("agent.keys", {})));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = agent.languageModel || "";
  const connectedIds = useMemo(
    () => keys.filter((row) => row.hasKey).map((row) => row.provider),
    [keys],
  );
  const visible = useMemo(
    () =>
      ASSISTANT_MODELS.filter(
        (catalog) =>
          connectedIds.includes(catalog.id) || draftingIds.includes(catalog.id),
      ),
    [connectedIds, draftingIds],
  );
  const remaining = useMemo(
    () =>
      ASSISTANT_MODELS.filter(
        (catalog) => !visible.some((item) => item.id === catalog.id),
      ),
    [visible],
  );
  const readyProviders = useMemo(
    () =>
      ASSISTANT_MODELS.filter((catalog) => {
        const row = keys.find((item) => item.provider === catalog.id);
        return Boolean(row?.hasKey && row.enabled);
      }),
    [keys],
  );
  const languageItems = useMemo(() => {
    const items: { value: string; label: string }[] = readyProviders.map(
      (catalog) => ({
        value: catalog.id,
        label: providerLabel(catalog.id, agent),
      }),
    );
    if (selected && !items.some((item) => item.value === selected)) {
      items.unshift({
        value: selected,
        label: providerLabel(selected, agent),
      });
    }
    return items;
  }, [agent, readyProviders, selected]);
  const visionValue = agent.visionModel || "";
  const visionItems = useMemo(() => {
    const items: { value: string; label: string }[] = readyProviders
      .filter((catalog) => catalog.capabilities.vision)
      .map((catalog) => ({
        value: catalog.id,
        label: providerLabel(catalog.id, agent),
      }));
    if (visionValue && !items.some((item) => item.value === visionValue)) {
      const catalog = ASSISTANT_MODELS.find(
        (model) => model.id === visionValue,
      );
      items.unshift({
        value: visionValue,
        label: catalog ? providerLabel(catalog.id, agent) : visionValue,
      });
    }
    return items;
  }, [agent, readyProviders, visionValue]);
  const expanded = openIds ?? (selected ? [selected] : draftingIds);
  const empty = loaded && visible.length === 0;

  const addProvider = (id: AssistantProvider) => {
    setDraftingIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setOpenIds((current) => {
      const base = current ?? (selected ? [selected] : []);
      return base.includes(id) ? base : [...base, id];
    });
  };

  const dismissProvider = (id: AssistantProvider) => {
    setDraftingIds((current) => current.filter((item) => item !== id));
    setOpenIds((current) => current?.filter((item) => item !== id));
  };

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.HeaderText>
          <Settings.Title>Models</Settings.Title>
          <Settings.Description>
            Add providers, then pick Language and Vision defaults for Agent.
          </Settings.Description>
        </Settings.HeaderText>
      </Settings.Header>

      {empty ? (
        <Empty.Root>
          <Empty.Media>
            <IconSparkle3Fill18 />
          </Empty.Media>
          <Empty.Title>No providers yet</Empty.Title>
          <Empty.Description>
            Add a provider to give Agent a key or a local host on this Mac.
          </Empty.Description>
          <Empty.Action>
            <AddProviderMenu
              remaining={remaining}
              variant="primary"
              onAdd={addProvider}
            />
          </Empty.Action>
        </Empty.Root>
      ) : loaded ? (
        <>
          <Settings.Section>
            <Settings.SectionTitle>Default Models</Settings.SectionTitle>
            <Settings.List>
              <DefaultModelRow
                title="Language Model"
                description="Used by Agent for chat and tools."
                value={selected}
                items={languageItems}
                agent={agent}
                onChange={(id) => patchAgent({ languageModel: id })}
              />
              <DefaultModelRow
                title="Vision Model"
                description="Looks at attached images when the provider supports it."
                value={visionValue}
                items={visionItems}
                agent={agent}
                onChange={(id) => patchAgent({ visionModel: id })}
              />
            </Settings.List>
          </Settings.Section>

          <Settings.Section>
            <Settings.SectionTitle>Model Providers</Settings.SectionTitle>
            <div className={styles.providers}>
              {visible.length > 0 ? (
                <Accordion.Root
                  multiple
                  value={expanded}
                  onValueChange={setOpenIds}
                  className={styles.list}
                >
                  {visible.map((catalog) => (
                    <ProviderCard
                      key={catalog.id}
                      catalog={catalog}
                      row={keys.find((item) => item.provider === catalog.id)}
                      selected={selected === catalog.id}
                      open={expanded.includes(catalog.id)}
                      agent={agent}
                      onPatchAgent={patchAgent}
                      onRefresh={refresh}
                      onDismiss={() => dismissProvider(catalog.id)}
                    />
                  ))}
                </Accordion.Root>
              ) : null}
              <AddProviderMenu remaining={remaining} onAdd={addProvider} />
            </div>
          </Settings.Section>
        </>
      ) : null}
    </Settings.Page>
  );
}

function DefaultModelRow({
  title,
  description,
  value,
  items,
  agent,
  onChange,
}: {
  title: string;
  description: string;
  value: string;
  items: Array<{ value: string; label: string }>;
  agent: AgentPrefs;
  onChange: (id: AssistantProvider) => void;
}) {
  return (
    <Settings.Item>
      <Settings.ItemDetails>
        <Settings.ItemTitle>{title}</Settings.ItemTitle>
        <Settings.ItemDescription>{description}</Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Select.Root
          value={value || undefined}
          disabled={!items.length}
          onValueChange={(next) => {
            const catalog = ASSISTANT_MODELS.find((model) => model.id === next);
            if (catalog) onChange(catalog.id);
          }}
        >
          <Select.Trigger size="sm" className={styles.select}>
            <Select.Value>
              {(current: string) =>
                items.find((item) => item.value === current)?.label ??
                (current ? providerLabel(current, agent) : "Choose a provider")
              }
            </Select.Value>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={6}>
              <Select.Popup>
                <Select.Items items={items} />
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </Settings.ItemControl>
    </Settings.Item>
  );
}
