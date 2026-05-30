import { Menu } from "@pond/ui";
import { Columns3, Grid2x2, List, type LucideIcon, Rows3 } from "lucide-react";
import type { LayoutValue } from "@/lib/view-prefs";
import { useView } from "../context";
import styles from "./layout.module.css";

const OPTIONS: Array<{ value: LayoutValue; label: string; icon: LucideIcon }> =
  [
    { value: "waterfall", label: "Waterfall", icon: Columns3 },
    { value: "grid", label: "Grid", icon: Grid2x2 },
    { value: "justified", label: "Justified", icon: Rows3 },
    { value: "list", label: "List", icon: List },
  ];

export function LayoutSection() {
  const { state, actions } = useView();

  return (
    <Menu.Group>
      <Menu.GroupLabel>Layout</Menu.GroupLabel>
      <div className={styles.segmented} role="radiogroup" aria-label="Layout">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const selected = state.layout === value;
          return (
            // biome-ignore lint/a11y/useSemanticElements: segmented control needs button styling, native radio can't be styled as tiles
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              data-selected={selected ? "" : undefined}
              className={styles.tile}
              onClick={() => actions.setLayout(value)}
            >
              <span className={styles["tile-icon"]} aria-hidden>
                <Icon width="20" height="20" />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </Menu.Group>
  );
}
