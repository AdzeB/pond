import { IconXmarkOutline18 as Clear } from "@pond/icons/outline/18";
import { forwardRef, type ReactNode } from "react";
import styles from "./styles.module.css";

type ChipTone = "skill" | "mention" | "tag";

interface AskChipProps {
  tone: ChipTone;
  lead: ReactNode;
  label: string;
  title?: string;
  selected?: boolean;
  onRemove?: () => void;
}

/** Shared pill shell for skill, mention, and tag nodes in the Lexical ask editor; the ref and `selected` flag let the node wire up keyboard selection/deletion. */
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
