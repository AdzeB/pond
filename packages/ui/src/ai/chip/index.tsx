import { IconXmarkOutline12 as Clear } from "@pond/icons/outline/12";
import { clsx as cn } from "clsx";
import { forwardRef, type ReactNode } from "react";
import styles from "./styles.module.css";

export type ChipTone = "skill" | "mention" | "tag";

type ChipProps = {
  tone: ChipTone;
  lead: ReactNode;
  label: string;
  title?: string;
  selected?: boolean;
  onRemove?: () => void;
  className?: string;
};

/** Shared pill for skill, mention, and tag chips in composers and transcripts. */
const Root = forwardRef<HTMLSpanElement, ChipProps>(function ChipRoot(
  { tone, lead, label, title, selected, onRemove, className },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(styles.chip, className)}
      data-tone={tone}
      data-selected={selected || undefined}
      data-static={!onRemove || undefined}
      title={title ?? label}
    >
      <span className={styles.body}>
        <span className={styles.lead}>{lead}</span>
        <span className={styles.label}>{label}</span>
      </span>
      {onRemove ? (
        <button
          type="button"
          className={styles.remove}
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          onMouseDown={(event) => event.preventDefault()}
        >
          <Clear />
        </button>
      ) : null}
    </span>
  );
});

export const Chip = { Root };
