import { useRef, useState } from "react";
import { useMutationObserver } from "rooks";

const DEFAULT_COL_MIN = 130;

function readGridMin(): number {
  if (typeof document === "undefined") return DEFAULT_COL_MIN;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--grid-min")
    .trim();
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_COL_MIN;
}

/* The view store's `setZoom` writes the current zoom to
 * `document.documentElement.style.--grid-min`. The CSS layouts pick the
 * change up reactively; the JS packers can't, so we observe the root style
 * attribute and re-read on every mutation. Cheap: runs once per zoom step,
 * gated by an equality check. */
export function useGridMin(): number {
  const [value, setValue] = useState<number>(readGridMin);
  const rootRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" ? document.documentElement : null,
  );
  useMutationObserver(
    rootRef,
    () => {
      const next = readGridMin();
      setValue((prev) => (prev === next ? prev : next));
    },
    { attributes: true, attributeFilter: ["style"] },
  );
  return value;
}
