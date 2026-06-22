import { IconXmarkOutline18 as Clear } from "@pond/icons/outline/18";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

export type ChipTone = "skill" | "mention" | "tag";

interface AskChipProps {
  tone: ChipTone;
  // Leading icon or glyph (e.g. a sparkle, "@", or "#").
  lead: ReactNode;
  label: string;
  title?: string;
  onRemove?: () => void;
}

// A single inline pill rendered inside the Lexical ask editor. Skills, save
// mentions, and tags all share this shell, differing only by tone + lead glyph.
export function AskChip({ tone, lead, label, title, onRemove }: AskChipProps) {
  return (
    <span className={styles.chip} data-tone={tone} title={title ?? label}>
      <span className={styles.chipBody}>
        <span className={styles.chipLead}>{lead}</span>
        <span className={styles.chipLabel}>{label}</span>
      </span>
      <button
        type="button"
        className={styles.chipRemove}
        aria-label={`Remove ${label}`}
        onClick={onRemove}
        onMouseDown={(event) => event.preventDefault()}
      >
        <Clear width={11} height={11} />
      </button>
    </span>
  );
}
