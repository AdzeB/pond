import { Menu } from "@pond/ui";
import type { ReactNode } from "react";
import styles from "./submenu.module.css";

interface ViewSubmenuProps {
  icon: ReactNode;
  label: string;
  // Right-aligned badge in the trigger row (e.g. "3 applied").
  badge?: ReactNode;
  onReset?: () => void;
  popupWidth?: string;
  children: ReactNode;
}

// One row in the View options menu that expands into a side panel with a
// header (title + optional Reset), mirroring Filter by / Sort by / Density.
export function ViewSubmenu({
  icon,
  label,
  badge,
  onReset,
  popupWidth = "240px",
  children,
}: ViewSubmenuProps) {
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger>
        <Menu.ItemIcon>{icon}</Menu.ItemIcon>
        <Menu.ItemLabel>{label}</Menu.ItemLabel>
        {badge}
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner align="start" sideOffset={6}>
          <Menu.Popup style={{ width: popupWidth }}>
            <div className={styles.header}>
              <span className={styles.title}>{label}</span>
              {onReset ? (
                <button
                  type="button"
                  className={styles.reset}
                  onClick={onReset}
                >
                  Reset
                </button>
              ) : null}
            </div>
            {children}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

export function AppliedBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className={styles.applied}>{count} applied</span>;
}
