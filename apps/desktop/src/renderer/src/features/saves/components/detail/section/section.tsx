import { IconChevronDownOutline12 } from "@pond/icons/outline/12";
import { Accordion } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { gentleSpring } from "@/shared/lib/motion";
import styles from "./section.module.css";

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const reduceMotion = useReducedMotion();

  return (
    <Accordion.Root
      className={styles.section}
      multiple
      value={open ? [title] : []}
      onValueChange={(next) => setOpen(next.includes(title))}
    >
      <Accordion.Item value={title} className={styles.item}>
        <Accordion.Header className={styles.header}>
          <Accordion.Trigger
            className={styles.trigger}
            id={`${id}-trigger`}
            aria-controls={open ? `${id}-panel` : undefined}
          >
            <span className={styles.title}>{title}</span>
            <span className={styles.chevron} aria-hidden>
              <IconChevronDownOutline12 />
            </span>
          </Accordion.Trigger>
        </Accordion.Header>
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div
              id={`${id}-panel`}
              role="region"
              aria-labelledby={`${id}-trigger`}
              className={styles.panel}
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 8 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={reduceMotion ? { duration: 0 } : gentleSpring}
            >
              {children}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Accordion.Item>
    </Accordion.Root>
  );
}
