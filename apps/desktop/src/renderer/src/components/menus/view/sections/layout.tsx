import {
  IconGridLayoutCols3Outline18 as Columns3,
  IconGrid2x2Outline18 as Grid2x2,
  IconBulletListOutline18 as List,
  IconGridLayoutRows3Outline18 as Rows3,
} from "@pond/icons/outline/18";
import type { IconComponent } from "@pond/icons/types";
import { Menu } from "@pond/ui";
import type { LayoutValue } from "@/lib/utils/view-prefs";
import { useView } from "../context";
import styles from "./layout.module.css";

const OPTIONS: Array<{
  value: LayoutValue;
  label: string;
  icon: IconComponent;
}> = [
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
