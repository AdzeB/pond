import { IconChevronRightOutline18 as ChevronRight } from "@pond/icons/outline/18";
import { Settings } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import { gentleSpring } from "@/lib/ui/motion";
import styles from "./styles.module.css";

export function CollapsibleGroup({
  title,
  defaultCollapsed,
  fullWidth,
  children,
}: {
  title: ReactNode;
  defaultCollapsed?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(!defaultCollapsed);
  const reduceMotion = useReducedMotion();

  return (
    <Settings.Section span={fullWidth ? "full" : undefined}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles["toggle-title"]}>{title}</span>
        <ChevronRight
          className={styles.chevron}
          data-open={open || undefined}
          width={14}
          height={14}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className={styles["collapsible-body"]}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : gentleSpring}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Settings.Section>
  );
}
