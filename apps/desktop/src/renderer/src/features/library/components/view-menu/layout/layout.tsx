import {
  IconBulletListOutline12,
  IconGrid2x2Outline12,
  IconGridLayoutColsOutline12,
  IconGridLayoutRowsOutline12,
} from "@pond/icons/outline/12";
import type { IconComponent } from "@pond/icons/types";
import { Select } from "@pond/ui";
import { useView } from "@/features/library/hooks/use-view";
import type { LayoutValue } from "@/features/library/lib/view-prefs";
import styles from "../view-menu.module.css";

const OPTIONS: { value: LayoutValue; label: string; icon: IconComponent }[] = [
  { value: "waterfall", label: "Waterfall", icon: IconGridLayoutColsOutline12 },
  { value: "grid", label: "Grid", icon: IconGrid2x2Outline12 },
  { value: "justified", label: "Justified", icon: IconGridLayoutRowsOutline12 },
  { value: "list", label: "List", icon: IconBulletListOutline12 },
];

function Option({ icon: Icon, label }: { icon: IconComponent; label: string }) {
  return (
    <span className={styles.option}>
      <Icon />
      {label}
    </span>
  );
}

export function LayoutSection() {
  const { state, actions } = useView();
  const selected = OPTIONS.find((option) => option.value === state.layout);
  const items = OPTIONS.map((option) => ({
    value: option.value,
    label: <Option icon={option.icon} label={option.label} />,
  }));

  return (
    <Select.Root
      items={items}
      value={state.layout}
      onValueChange={(value) => {
        if (value !== null) actions.setLayout(value);
      }}
    >
      <div className={styles.row}>
        <Select.Label className={styles.label}>Layout</Select.Label>
        <Select.Trigger size="sm" className={styles.select}>
          <Select.Value>
            {selected ? (
              <Option icon={selected.icon} label={selected.label} />
            ) : null}
          </Select.Value>
        </Select.Trigger>
      </div>
      <Select.Portal>
        <Select.Positioner align="end" sideOffset={6}>
          <Select.Popup>
            <Select.Items items={items} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
