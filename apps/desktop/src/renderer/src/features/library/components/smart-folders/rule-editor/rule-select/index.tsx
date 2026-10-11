import { Select } from "@pond/ui";
import styles from "./styles.module.css";

interface SingleProps<T extends string> {
  value: T;
  items: readonly { value: T; label: string }[];
  label: string;
  width?: "content";
  onChange: (value: T) => void;
}

function Single<T extends string>({
  value,
  items,
  label,
  width,
  onChange,
}: SingleProps<T>) {
  return (
    <Select.Root
      value={value}
      items={items}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <Select.Trigger
        className={styles.trigger}
        width={width === "content" ? "auto" : "full"}
        size="sm"
        aria-label={label}
      >
        <Select.Value />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.Items items={[...items]} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

interface MultipleProps {
  value: string[];
  items: { value: string; label: string }[];
  label: string;
  placeholder: string;
  onChange: (value: string[]) => void;
}

function Multiple({
  value,
  items,
  label,
  placeholder,
  onChange,
}: MultipleProps) {
  return (
    <Select.Root multiple value={value} items={items} onValueChange={onChange}>
      <Select.Trigger size="sm" className={styles.trigger} aria-label={label}>
        <Select.Value placeholder={placeholder} />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.Items items={items} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

export const RuleSelect = { Multiple, Single };
