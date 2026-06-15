import { Menu } from "@pond/ui";
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
  children: ReactNode;
}

// One row in the View options menu that expands into a side panel. The trigger
// label already names the panel, so the panel itself carries no title.
export function ViewSubmenu({
  icon,
  label,
  badge,
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
