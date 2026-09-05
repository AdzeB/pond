import { IconChevronRightOutline12 as ChevronRight } from "@pond/icons/outline/12";
import { Button, Settings } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import { gentleSpring } from "@/shared/lib/motion";
import styles from "./collapsible-group.module.css";

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
      <Button
        variant="ghost"
        width="full"
        className={styles.toggle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.title}>{title}</span>
        <ChevronRight
          className={styles.chevron}
          data-open={open || undefined}
        />
      </Button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className={styles.body}
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
