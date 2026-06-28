import { IconChevronDownOutline18 as ChevronDown } from "@pond/icons/outline/18";
import { useState } from "react";
import styles from "./styles.module.css";

// Multi-line text that clamps to a few lines with a soft fade and a toggle.
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
      <div
        className={styles.expandableText}
        data-compact={compact ? "true" : undefined}
        data-clamped={!expanded && long ? "true" : undefined}
      >
        {text}
      </div>
      {long ? (
        <button
          type="button"
          className={styles.readMore}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span>{expanded ? "Show Less" : "Read More"}</span>
          <ChevronDown
            width={12}
            height={12}
            className={styles.readMoreIcon}
            data-rotate={expanded ? "true" : undefined}
          />
        </button>
      ) : null}
    </div>
  );
}
