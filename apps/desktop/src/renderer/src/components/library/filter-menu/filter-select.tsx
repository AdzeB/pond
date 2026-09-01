import { Select } from "@pond/ui";
import styles from "./styles.module.css";

export function FilterSelect<Value extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: Value;
  items: { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <Select.Root
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <Select.Trigger size="sm" className={styles.select} aria-label={label}>
        <Select.Value />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner align="start">
          <Select.Popup>
            <Select.Items items={items} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
