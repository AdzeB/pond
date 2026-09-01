import {
  IconChevronDownOutline18,
  IconMagnifierOutline18,
} from "@pond/icons/outline/18";
import { Button, Combobox } from "@pond/ui";
import { ASSISTANT_MODELS, type AssistantProvider } from "@shared/assistant";
import { useState } from "react";
import { settingsModal } from "@/stores/settings-modal";
import styles from "./styles.module.css";

const models = ASSISTANT_MODELS.map((model) => ({
  ...model,
  search: `${model.name} ${model.provider}`,
  detail: model.provider,
}));

export function ModelPicker({
  value,
  onChange,
  disabled,
}: {
  disabled?: boolean;
  value: AssistantProvider;
  onChange: (provider: AssistantProvider) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = models.find((model) => model.id === value) ?? {
    ...ASSISTANT_MODELS[0],
    search: "Minnow",
    detail: "On this Mac",
  };

  return (
    <Combobox.Root<(typeof models)[number]>
      disabled={disabled}
      items={models}
      value={selected}
      onValueChange={(model) => {
        if (model) onChange(model.id);
      }}
      itemToStringLabel={(model) => model.search}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={() => setQuery("")}
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
        aria-label={`Choose model, ${selected.name}`}
      >
        <span className={styles["model-trigger-name"]}>{selected.name}</span>
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
            <Combobox.List className={styles["model-list"]} aria-label="Models">
              {(model: (typeof models)[number]) => (
                <Combobox.Item
                  className={styles["model-row"]}
                  key={model.id}
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
              <button type="button" onClick={() => settingsModal.open("agent")}>
                Manage Models and Keys
              </button>
            </div>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
