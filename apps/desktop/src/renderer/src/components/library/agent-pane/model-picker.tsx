import {
  IconChevronDownOutline18,
  IconMagnifierOutline18,
} from "@pond/icons/outline/18";
import { Button, Combobox } from "@pond/ui";
import { ASSISTANT_MODELS, type AssistantProvider } from "@shared/assistant";
import { displayName } from "@shared/provider-models";
import { useState } from "react";
import { z } from "zod";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import { openSettings } from "@/lib/ui/open-settings";
import styles from "./styles.module.css";

const ListedSchema = z.object({
  providers: z.array(
    z.object({
      provider: z.enum([
        "anthropic",
        "openai",
        "gemini",
        "ollama",
        "lmstudio",
        "compatible",
      ]),
      ok: z.boolean(),
      models: z.array(z.object({ id: z.string(), name: z.string() })),
    }),
  ),
});

type PickerModel = {
  key: string;
  provider: AssistantProvider;
  modelId: string;
  name: string;
  detail: string;
  search: string;
  local: boolean;
};

function catalogItems(): PickerModel[] {
  return ASSISTANT_MODELS.map((model) => ({
    key: model.id,
    provider: model.id,
    modelId: model.model,
    name: model.provider,
    detail: model.local ? "This Mac" : model.provider,
    search: `${model.provider} ${model.model}`,
    local: model.local,
  }));
}

function liveItems(
  providers: z.infer<typeof ListedSchema>["providers"],
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
        search: `${model.name} ${model.id} ${catalog.provider}`,
        local: catalog.local,
      });
    }
  }
  return items;
}

function withCurrent(
  items: PickerModel[],
  provider?: AssistantProvider | "",
  modelId?: string,
): PickerModel[] {
  if (!provider || !modelId) return items;
  if (
    items.some((item) => item.provider === provider && item.modelId === modelId)
  )
    return items;
  const catalog = ASSISTANT_MODELS.find((model) => model.id === provider);
  return [
    {
      key: `${provider}:${modelId}`,
      provider,
      modelId,
      name: displayName(modelId),
      detail: catalog?.provider ?? provider,
      search: `${modelId} ${catalog?.provider ?? ""}`,
      local: catalog?.local ?? false,
    },
    ...items,
  ];
}

export function ModelPicker({
  provider,
  modelId,
  onChange,
  disabled,
}: {
  disabled?: boolean;
  provider?: AssistantProvider | "";
  modelId?: string;
  onChange: (next: { provider: AssistantProvider; modelId: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [listed, setListed] = useState<PickerModel[]>(catalogItems);
  const items = withCurrent(listed, provider, modelId);
  const scrollFade = useScrollFade<HTMLDivElement>();
  const selected = items.find(
    (item) => item.provider === provider && item.modelId === modelId,
  );
  const label =
    selected?.name ?? (modelId ? displayName(modelId) : "Choose a model");

  return (
    <Combobox.Root<PickerModel>
      disabled={disabled}
      items={items}
      value={selected}
      onValueChange={(model) => {
        if (model)
          onChange({ provider: model.provider, modelId: model.modelId });
      }}
      itemToStringLabel={(model) => model.search}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={(open) => {
        setQuery("");
        if (!open) return;
        void window.pond.query("agent.listAvailableModels", {}).then((res) => {
          const payload = ListedSchema.safeParse(res);
          if (!payload.success) return;
          const next = liveItems(payload.data.providers);
          setListed(next.length ? next : catalogItems());
        });
      }}
      autoHighlight
    >
      <Combobox.Trigger
        render={
          <Button
            size="xs"
            variant="ghost"
            className={styles["model-trigger"]}
          />
        }
        aria-label={`Choose model, ${label}`}
      >
        <span className={styles["model-trigger-name"]}>{label}</span>
        <IconChevronDownOutline18 />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner side="top" align="start" sideOffset={8}>
          <Combobox.Popup className={styles["assistant-model-picker"]}>
            <div className={styles["model-search"]}>
              <IconMagnifierOutline18 aria-hidden />
              <Combobox.Input
                className={styles["model-search-input"]}
                aria-label="Search models"
                placeholder="Search models…"
                autoFocus
              />
            </div>
            <Combobox.List
              className={styles["model-list"]}
              aria-label="Models"
              {...scrollFade}
            >
              {(model: PickerModel) => (
                <Combobox.Item
                  className={styles["model-row"]}
                  key={model.key}
                  value={model}
                >
                  <Combobox.ItemLabel className={styles["model-name"]}>
                    {model.name}
                  </Combobox.ItemLabel>
                  <span
                    className={styles["model-detail"]}
                    data-local={model.local || undefined}
                  >
                    {model.detail}
                  </span>
                  <span className={styles["model-check"]}>
                    <Combobox.ItemIndicator />
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
            <Combobox.Empty className={styles["model-empty"]}>
              No models found. Try another name.
            </Combobox.Empty>
            <div className={styles["model-picker-note"]}>
              <button type="button" onClick={() => openSettings("models")}>
                Manage Models and Keys
              </button>
            </div>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
