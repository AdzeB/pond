import { IconXmarkOutline18 as Clear } from "@pond/icons/outline/18";
import { forwardRef, type ReactNode } from "react";
import styles from "./styles.module.css";

type ChipTone = "skill" | "mention" | "tag";

interface AskChipProps {
  tone: ChipTone;
  // Leading icon or glyph (e.g. a sparkle, "@", or "#").
  lead: ReactNode;
  label: string;
  title?: string;
  selected?: boolean;
  onRemove?: () => void;
}

// A single inline pill rendered inside the Lexical ask editor. Skills, save
// mentions, and tags all share this shell, differing only by tone + lead glyph.
// The ref + `selected` flag let the node wire up keyboard selection/deletion.
export const AskChip = forwardRef<HTMLSpanElement, AskChipProps>(
  function AskChip({ tone, lead, label, title, selected, onRemove }, ref) {
    return (
      <span
        ref={ref}
        className={styles.chip}
        data-tone={tone}
        data-selected={selected || undefined}
        title={title ?? label}
      >
        <span className={styles["chip-body"]}>
          <span className={styles["chip-lead"]}>{lead}</span>
          <span className={styles["chip-label"]}>{label}</span>
        </span>
        <button
          type="button"
          className={styles["chip-remove"]}
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          onMouseDown={(event) => event.preventDefault()}
        >
          <Clear width={11} height={11} />
        </button>
      </span>
    );
  },
);
