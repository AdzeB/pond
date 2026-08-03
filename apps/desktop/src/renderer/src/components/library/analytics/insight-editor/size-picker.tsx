import { useState } from "react";
import {
  GRID_COLS,
  GRID_MAX_ROWS,
} from "@/components/library/analytics/lib/insights";
import styles from "./size-picker.module.css";

/** Table-picker style size control; hover previews a span, click commits it. */
export function SizePicker({
  w,
  h,
  onChange,
}: {
  w: number;
  h: number;
  onChange: (w: number, h: number) => void;
}) {
  const [hover, setHover] = useState<{ w: number; h: number } | null>(null);
  const shown = hover ?? { w, h };

  return (
    <div className={styles.field}>
      <span className={styles["field-label"]}>
        Size{" "}
        <small>
          {shown.w} × {shown.h}
        </small>
      </span>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover-only preview reset; the cell buttons carry the interactions. */}
      <div
        className={styles["size-grid"]}
        data-previewing={hover != null || undefined}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: GRID_MAX_ROWS }, (_, r) => r + 1).map((row) =>
          Array.from({ length: GRID_COLS }, (_, c) => c + 1).map((col) => (
            <button
              key={`${col}x${row}`}
              type="button"
              className={styles["size-cell"]}
              data-active={(col <= w && row <= h) || undefined}
              data-preview={
                (hover != null && col <= hover.w && row <= hover.h) || undefined
              }
              aria-label={`${col} column${col === 1 ? "" : "s"} × ${row} row${row === 1 ? "" : "s"}`}
              aria-pressed={w === col && h === row}
              onMouseEnter={() => setHover({ w: col, h: row })}
              onFocus={() => setHover({ w: col, h: row })}
              onBlur={() => setHover(null)}
              onClick={() => onChange(col, row)}
            />
          )),
        )}
      </div>
    </div>
  );
}
