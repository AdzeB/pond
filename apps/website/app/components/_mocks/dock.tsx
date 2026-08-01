import {
  IconDescendingSortingFill18,
  IconEyeFill18,
  IconGridFill18,
  IconPlusFill18,
  IconSizeFill18,
  IconSparkle3Fill18,
} from "@pond/icons/fill/18";
import { IconMagnifierOutline18 } from "@pond/icons/outline/18";
import { Tray } from "@pond/ui";
import type { ComponentType, SVGProps } from "react";
import styles from "./dock.module.css";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Actions mirror library-dock-nav-content: New, view menus, Search, Ask. */
const REST_ACTIONS: { icon: IconComponent; label: string }[] = [
  { icon: IconPlusFill18, label: "New" },
  { icon: IconGridFill18, label: "Layout" },
  { icon: IconSizeFill18, label: "Zoom" },
  { icon: IconDescendingSortingFill18, label: "Sort" },
  { icon: IconEyeFill18, label: "Display" },
  { icon: IconMagnifierOutline18, label: "Search" },
  { icon: IconSparkle3Fill18, label: "Ask AI" },
];

/** The resting nav row alone, for docks that supply their own pill surface. */
export function DockNavRow() {
  return (
    <div className={styles.row}>
      {REST_ACTIONS.map((item) => {
        const Icon = item.icon;
        return (
          <Tray.Item key={item.label} render={<span />} title={item.label}>
            <Icon />
          </Tray.Item>
        );
      })}
    </div>
  );
}

/** Static replica of the resting library dock; Pill > 4px viewport > nav row, like library-dock. */
export function Dock() {
  return (
    <Tray.Pill aria-hidden>
      <div className={styles.viewport}>
        <DockNavRow />
      </div>
    </Tray.Pill>
  );
}
