import {
  IconChevronDownOutline18,
  IconMagnifierOutline18,
} from "@pond/icons/outline/18";
import { Button, Combobox } from "@pond/ui";
import { ASSISTANT_MODELS, type AssistantProvider } from "@shared/assistant";
import type { ProviderModel } from "@shared/provider-models";
import { useState } from "react";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { ProviderLogo } from "./icons";
import styles from "./model-select.module.css";

export interface ModelOption extends ProviderModel {
  provider: AssistantProvider | "";
  providerName: string;
}

type ModelGroup = {
  value: string;
  provider: AssistantProvider | "";
  items: ModelOption[];
};

export function groupModels(items: ModelOption[]): ModelGroup[] {
  const leftover = items.filter((item) => !item.provider);
  const groups: ModelGroup[] = leftover.length
    ? [{ value: "", provider: "", items: leftover }]
    : [];
  for (const catalog of ASSISTANT_MODELS) {
    const models = items
      .filter((item) => item.provider === catalog.id)
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    if (!models.length) continue;
    groups.push({
      value: catalog.provider,
      provider: catalog.id,
      items: models,
    });
  }
  return groups;
}

export function ModelSelect({
  label,
  items,
  selected,
  disabled,
  onChange,
}: {
  label: string;
  items: ModelOption[];
  selected: ModelOption | null;
  disabled: boolean;
  onChange: (model: ModelOption) => void;
}) {
  const [search, setSearch] = useState("");
  const scrollFade = useScrollFade<HTMLDivElement>();
  const value =
    items.find(
      (item) => item.provider === selected?.provider && item.id === selected.id,
    ) ?? null;
  const groups = groupModels(items);
  return (
    <Combobox.Root<ModelOption>
      items={groups}
      value={value}
      isItemEqualToValue={(item, next) =>
        item.provider === next.provider && item.id === next.id
      }
      inputValue={search}
      onInputValueChange={setSearch}
      onOpenChange={() => setSearch("")}
      onValueChange={(model) => {
        if (model) onChange(model);
      }}
      itemToStringLabel={(model) =>
        `${model.name} ${model.id} ${model.providerName}`
      }
      disabled={disabled}
      autoHighlight
    >
      <Combobox.Trigger
        aria-label={label}
        render={
          <Button size="sm" variant="secondary" className={styles.trigger} />
        }
      >
        {selected?.provider ? (
          <ProviderLogo provider={selected.provider} />
        ) : null}
        <span className={styles.label}>
          {selected?.name ?? "Choose a model"}
        </span>
        <IconChevronDownOutline18 />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner align="end" sideOffset={8}>
          <Combobox.Popup className={styles.popup}>
            <div className={styles.search}>
              <IconMagnifierOutline18 aria-hidden />
              <Combobox.Input
                aria-label={`Search ${label.toLowerCase()}s`}
                placeholder="Search models…"
                autoFocus
              />
            </div>
            <Combobox.List className={styles.list} {...scrollFade}>
              {(group: ModelGroup) => (
                <Combobox.Group
                  key={group.value || "default"}
                  items={group.items}
                >
                  {group.value ? (
                    <Combobox.GroupLabel className={styles.heading}>
                      {group.provider ? (
                        <ProviderLogo provider={group.provider} />
                      ) : null}
                      {group.value}
                    </Combobox.GroupLabel>
                  ) : null}
                  <Combobox.Collection>
                    {(model: ModelOption) => (
                      <Combobox.Item
                        key={`${model.provider}:${model.id}`}
                        value={model}
                      >
                        <Combobox.ItemLabel>{model.name}</Combobox.ItemLabel>
                        <Combobox.ItemIndicator />
                      </Combobox.Item>
                    )}
                  </Combobox.Collection>
                </Combobox.Group>
              )}
            </Combobox.List>
            <Combobox.Empty>No models found. Try another name.</Combobox.Empty>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
