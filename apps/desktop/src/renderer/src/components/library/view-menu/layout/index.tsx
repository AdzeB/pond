import { Select } from "@pond/ui";
import { useView } from "@/hooks/use-view";
import type { LayoutValue } from "@/lib/ui/view-prefs";
import styles from "../styles.module.css";

const OPTIONS: { value: LayoutValue; label: string }[] = [
  { value: "waterfall", label: "Waterfall" },
  { value: "grid", label: "Grid" },
  { value: "justified", label: "Justified" },
  { value: "list", label: "List" },
];

export function LayoutSection() {
  const { state, actions } = useView();

  return (
    <Select.Root
      items={OPTIONS}
      value={state.layout}
      onValueChange={(value) => {
        if (value !== null) actions.setLayout(value);
      }}
    >
      <div className={styles.row}>
        <Select.Label className={styles.label}>Layout</Select.Label>
        <Select.Trigger size="sm" className={styles.select}>
          <Select.Value />
        </Select.Trigger>
      </div>
      <Select.Portal>
        <Select.Positioner align="end" sideOffset={6}>
          <Select.Popup>
            <Select.Items items={OPTIONS} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
