import { useSelector } from "@tanstack/react-store";
import type { Store } from "@tanstack/store";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Checkbox } from "../checkbox";
import type { SelectionState } from "./context";
import styles from "./styles.module.css";

export function stop(e: ReactMouseEvent) {
  e.stopPropagation();
}

export function SelectCell({
  store,
  rowId,
  onToggle,
}: {
  store: Store<SelectionState>;
  rowId: string;
  onToggle: (extend: boolean) => void;
}) {
  const selected = useSelector(store, (s) => s.selectedIds.has(rowId));
  return (
    <div className={styles["select-cell"]} role="gridcell" onClick={stop}>
      <Checkbox.Root
        className={styles.check}
        size="sm"
        checked={selected}
        aria-label={selected ? "Deselect row" : "Select row"}
        onClick={stop}
        onCheckedChange={() => onToggle(false)}
      >
        <Checkbox.Indicator />
      </Checkbox.Root>
    </div>
  );
}

export function CaretCell({
  canExpand,
  expanded,
  onToggle,
}: {
  canExpand: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={styles["caret-cell"]} role="gridcell" onClick={stop}>
      {canExpand ? (
        <button
          type="button"
          className={styles.caret}
          data-open={expanded || undefined}
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={(e) => {
            stop(e);
            onToggle();
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
            <path
              d="M2.5 1.5 L5.5 4 L2.5 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
