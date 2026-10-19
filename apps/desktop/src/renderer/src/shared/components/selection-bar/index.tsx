import { Button } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { gentleSpring } from "@/shared/lib/motion";
import styles from "./styles.module.css";

interface SelectionBarProps {
  label: string;
  count: number;
  onClear: () => void;
  children: ReactNode;
}

export function SelectionBar({
  label,
  count,
  onClear,
  children,
}: SelectionBarProps) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {count > 0 ? (
        <motion.div
          key="selection"
          role="toolbar"
          aria-label={label}
          className={styles.bar}
          initial={{ height: 0, opacity: 0, y: -4 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -4, pointerEvents: "none" }}
          transition={reduceMotion ? { duration: 0 } : gentleSpring}
        >
          <div className={styles.content}>
            <span className={styles.count} aria-live="polite">
              {count} selected
            </span>
            <div className={styles.actions}>{children}</div>
            <Button size="sm" variant="ghost" onClick={onClear}>
              Clear Selection
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
