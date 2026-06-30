import { IconChevronDownOutline18 as ChevronDown } from "@pond/icons/outline/18";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { bouncySpring } from "@/lib/ui/motion";
import styles from "./styles.module.css";

export function ExpandableText({
  text,
  compact,
}: {
  text: string;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const long = text.length > 240;

  return (
    <div className={styles.expandable}>
      <span
        className={styles.text}
        data-compact={compact ? "true" : undefined}
        data-clamped={!expanded && long ? "true" : undefined}
      >
        {text}
      </span>
      {long ? (
        <button
          type="button"
          className={styles.button}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={expanded ? "show-less" : "read-more"}
              animate={{ opacity: 1, y: 0 }}
              transition={bouncySpring}
            >
              {expanded ? "Show Less" : "Read More"}
            </motion.span>
          </AnimatePresence>

          <ChevronDown
            width={12}
            height={12}
            className={styles.icon}
            data-rotate={expanded ? "true" : undefined}
          />
        </button>
      ) : null}
    </div>
  );
}
