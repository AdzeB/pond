import { IconXmarkOutline18 as Clear } from "@pond/icons/outline/18";
import type { Predicate } from "@pond/schema/filters/types";
import { describePredicate } from "@/lib/search-fields";
import styles from "./styles.module.css";

interface ChipProps {
  predicate: Predicate;
  onEdit?: () => void;
  onRemove?: () => void;
}

// A single committed-filter pill. Rendered inline inside the Lexical editor by
// FilterChipNode, and reused anywhere a predicate needs a compact label.
export function Chip({ predicate, onEdit, onRemove }: ChipProps) {
  const chip = describePredicate(predicate);
  const ChipIcon = chip.icon;
  return (
    <span
      className={styles.chip}
      data-negated={chip.negated ? "" : undefined}
      title={chip.title}
    >
      <button
        type="button"
        className={styles.chipBody}
        onClick={onEdit}
        onMouseDown={(event) => event.preventDefault()}
      >
        {chip.swatch ? (
          <span
            className={styles.chipSwatch}
            style={{ background: chip.swatch }}
          />
        ) : (
          <span className={styles.chipIcon}>
            <ChipIcon width={13} height={13} />
          </span>
        )}
        <span className={styles.chipLabel}>{chip.label}</span>
      </button>
      <button
        type="button"
        className={styles.chipRemove}
        aria-label={`Remove ${chip.title}`}
        onClick={onRemove}
        onMouseDown={(event) => event.preventDefault()}
      >
        <Clear width={11} height={11} />
      </button>
    </span>
  );
}
