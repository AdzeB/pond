import { Button, Combobox } from "@pond/ui";
import { ASSISTANT_MODELS, type AssistantProvider } from "@shared/assistant";
import { displayName } from "@shared/provider-models";
import type { QueryResult } from "@shared/query-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ProviderLogo } from "@/features/settings/components/sections/agent/icons";
import { openSettings } from "@/features/settings/lib/open-settings";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import infoStyles from "./model-details.module.css";
import styles from "./pane.module.css";

type PickerModel = {
  key: string;
  provider: AssistantProvider;
  modelId: string;
  name: string;
  detail: string;
  connection: string;
  search: string;
};

type ModelGroup = {
  value: string;
  provider: AssistantProvider;
  items: PickerModel[];
};

function liveItems(
  providers: QueryResult<"agent.listAvailableModels">["providers"],
): PickerModel[] {
  const items: PickerModel[] = [];
  for (const row of providers) {
    const catalog = ASSISTANT_MODELS.find((model) => model.id === row.provider);
    if (!catalog || !row.ok || !row.models.length) continue;
    for (const model of row.models) {
      items.push({
        key: `${row.provider}:${model.id}`,
        provider: row.provider,
        modelId: model.id,
        name: model.name,
        detail: catalog.provider,
        connection:
          row.provider === "compatible"
            ? "Custom endpoint"
            : catalog.local
              ? "Local"
              : "Cloud",
        search: `${model.name} ${model.id} ${catalog.provider}`,
      });
    }
  }
  return items.sort(
    (a, b) => a.name.localeCompare(b.name) || a.detail.localeCompare(b.detail),
  );
}

export function ModelPicker({
  provider,
  modelId,
  onChange,
  disabled,
  inline = false,
}: {
  disabled?: boolean;
  inline?: boolean;
  provider?: AssistantProvider | "";
  modelId?: string;
  onChange: (next: { provider: AssistantProvider; modelId: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const scrollFade = useScrollFade<HTMLDivElement>();
  const catalog = useQuery({
    queryKey: ["assistant-models"],
    queryFn: () => window.pond.query("agent.listAvailableModels", {}),
    enabled: inline || open,
    staleTime: 30_000,
    retry: false,
  });
  const items = liveItems(catalog.data?.providers ?? []);
  const selected = items.find(
    (item) => item.provider === provider && item.modelId === modelId,
  );
  const groups: ModelGroup[] = ASSISTANT_MODELS.flatMap((catalog) => {
    const models = items.filter((model) => model.provider === catalog.id);
    return models.length
      ? [
          {
            value: catalog.provider,
            provider: catalog.id,
            items: models,
          },
        ]
      : [];
  });
  const label =
    selected?.name ?? (modelId ? displayName(modelId) : "Choose a model");

  const content = (
    <div className={infoStyles.content}>
      <div className={infoStyles.models}>
        <Combobox.Input
          aria-label="Search models"
          placeholder="Search models…"
          autoFocus
        />
        <Combobox.List
          className={infoStyles.list}
          aria-label="Models"
          {...scrollFade}
        >
          {(group: ModelGroup) => (
            <Combobox.Group key={group.value} items={group.items}>
              <Combobox.GroupLabel className={styles.heading}>
                <ProviderLogo provider={group.provider} />
                {group.value}
              </Combobox.GroupLabel>
              <Combobox.Collection>
                {(model: PickerModel) => (
                  <Combobox.Item
                    key={model.key}
                    value={model}
                    className={infoStyles.row}
                  >
                    <Combobox.ItemLabel className={infoStyles.label}>
                      <span>{model.name}</span>
                      <Combobox.ItemMeta>
                        {model.detail} · {model.connection}
                        {model.name !== model.modelId
                          ? ` · Model ID: ${model.modelId}`
                          : ""}
                      </Combobox.ItemMeta>
                    </Combobox.ItemLabel>
                    <Combobox.ItemIndicator />
                  </Combobox.Item>
                )}
              </Combobox.Collection>
            </Combobox.Group>
          )}
        </Combobox.List>
        {catalog.isPending ? (
          <Combobox.Empty role="status">Loading models</Combobox.Empty>
        ) : catalog.isError ||
          catalog.data?.providers.some((row) => row.error) ? (
          <div className={styles["model-picker-note"]} role="alert">
            <span>Some models could not be loaded.</span>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => void catalog.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}
        {!catalog.isPending && !catalog.isError ? (
          <Combobox.Empty>
            {items.length
              ? "No models found. Try another name."
              : "Connect a provider to see its models."}
          </Combobox.Empty>
        ) : null}
        {!items.length && !catalog.isPending ? (
          <div className={styles["model-picker-note"]}>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => openSettings("models")}
            >
              Add Provider
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <Combobox.Root<PickerModel>
      inline={inline}
      open={inline || open}
      disabled={disabled}
      items={groups}
      value={selected ?? null}
      isItemEqualToValue={(item, value) => item.key === value.key}
      onValueChange={(model) => {
        if (model)
          onChange({ provider: model.provider, modelId: model.modelId });
      }}
      itemToStringLabel={(model) => model.search}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={(next) => {
        if (inline) return;
        setQuery("");
        setOpen(next);
      }}
      autoHighlight
    >
      {inline ? (
        content
      ) : (
        <>
          <Combobox.Trigger
            size="xs"
            variant="ghost"
            className={styles["model-trigger"]}
            aria-label={`Choose model, ${label}`}
          >
            {provider ? <ProviderLogo provider={provider} size={16} /> : null}
            <span className={styles["model-trigger-name"]}>{label}</span>
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner side="top" align="start" sideOffset={8}>
              <Combobox.Popup className={infoStyles.popup}>
                {content}
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </>
      )}
    </Combobox.Root>
  );
}
