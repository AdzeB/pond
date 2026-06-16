import { Menu, Tooltip } from "@pond/ui";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { snappySpring } from "@/lib/motion";
import styles from "./submenu.module.css";

interface ViewSubmenuProps {
  icon: ReactNode;
  label: string;
  // Right-aligned badge in the trigger row (e.g. "3 applied").
  badge?: ReactNode;
  popupWidth?: string;
  // When set, render as a self-contained dropdown (icon trigger + titled popup)
  // for the toolbar instead of a nested row in the View options menu.
  standalone?: boolean;
  children: ReactNode;
}

// One part of the view controls. Inside the View options menu it renders as a
// row that expands into a side panel; in `standalone` mode (the toolbar) it is
// its own dropdown with an icon trigger and a titled popup.
export function ViewSubmenu({
  icon,
  label,
  badge,
  popupWidth = "240px",
  standalone,
  children,
}: ViewSubmenuProps) {
  if (standalone) {
    return (
      <Menu.Root>
        <Tooltip label={label} side="bottom">
          <Menu.Trigger
            render={
              <button
                type="button"
                className={styles.barTrigger}
                aria-label={label}
              />
            }
          >
            {icon}
          </Menu.Trigger>
        </Tooltip>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={4}>
            <Menu.Popup
              className={`${styles.glassPopup} ${styles.tailPopup}`}
              style={{ width: popupWidth }}
            >
              <div className={styles.barHeader}>
                {label}
                {badge}
              </div>
              {children}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    );
  }

  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger>
        <Menu.ItemIcon>{icon}</Menu.ItemIcon>
        <Menu.ItemLabel>{label}</Menu.ItemLabel>
        {badge}
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner align="start" sideOffset={6}>
          <Menu.Popup
            className={styles.glassPopup}
            style={{ width: popupWidth }}
          >
            {children}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

export function AppliedBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  // Only the number transitions; "applied" stays put (continuity).
  return (
    <span className={styles.applied}>
      <span className={styles.appliedCount}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={count}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={snappySpring}
          >
            {count}
          </motion.span>
        </AnimatePresence>
      </span>{" "}
      applied
    </span>
  );
}
