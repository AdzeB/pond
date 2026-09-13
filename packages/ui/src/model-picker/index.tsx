import { IconFaceRobot2Outline18 } from "@pond/icons/outline/18";
import type { ReactNode } from "react";
import { Combobox } from "../combobox";
import styles from "./styles.module.css";

export interface AssistantModel {
  id: string;
  name: string;
  provider: string;
  connection: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export function ModelPicker({
  models,
  value,
  onValueChange,
}: {
  models: AssistantModel[];
  value: string | null;
  onValueChange: (id: string) => void;
}) {
  return (
    <Combobox.Root<AssistantModel>
      inline
      open
      items={models}
      value={models.find((model) => model.id === value) ?? null}
      itemToStringLabel={(model) =>
        `${model.name} ${model.provider} ${model.connection}`
      }
      isItemEqualToValue={(a, b) => a.id === b.id}
      onValueChange={(model) => {
        if (model) onValueChange(model.id);
      }}
    >
      <Combobox.Input aria-label="Search models" placeholder="Search models…" />
      <Combobox.Empty>No models found</Combobox.Empty>
      <Combobox.List className={styles["picker-list"]}>
        {(model: AssistantModel) => (
          <Combobox.Item
            key={model.id}
            value={model}
            disabled={model.disabled}
            className={styles["model-row"]}
          >
            <span className={styles["model-icon"]}>
              {model.icon ?? <IconFaceRobot2Outline18 />}
            </span>
            <span className={styles["model-content"]}>
              <span className={styles["model-name"]}>{model.name}</span>
              <span className={styles["row-description"]}>
                {model.provider} · {model.connection}
                {model.description ? ` · ${model.description}` : ""}
              </span>
            </span>
            <Combobox.ItemIndicator />
          </Combobox.Item>
        )}
      </Combobox.List>
    </Combobox.Root>
  );
}
