import { useEffect, useMemo, useState } from "react";
import type { Save } from "@/core/data/types";
import { chromeHeightFor } from "@/features/library/lib/library-chrome";
import { aspectFor, useAspectVersion } from "@/features/library/stores/aspect";
import { useDisplayPrefs } from "@/features/library/stores/display-prefs";
import { useGridWidth } from "@/features/library/stores/shell-state";
import { PackedGrid, type PackedItem, type PackResult } from "../packed-grid";

const DEFAULT_COL_MIN = 130;

function packMasonry(
  saves: ReadonlyArray<Save>,
  containerWidth: number,
  colMin: number,
  gap: number,
  chromeHeight: number,
): PackResult {
  if (containerWidth <= 0) {
    return { items: [], totalHeight: 0 };
  }
  const cols = Math.max(1, Math.floor((containerWidth + gap) / (colMin + gap)));
  const colW = (containerWidth - gap * (cols - 1)) / cols;
  const heights = new Array<number>(cols).fill(0);

  const items: PackedItem[] = [];
  for (const save of saves) {
    const ratio = aspectFor(save);
    const mediaH = colW / ratio;
    let target = 0;
    for (let i = 1; i < cols; i++) {
      if ((heights[i] ?? 0) < (heights[target] ?? 0)) target = i;
    }
    const left = target * (colW + gap);
    const top = heights[target] ?? 0;
    items.push({ save, top, left, width: colW, height: mediaH });
    heights[target] = top + mediaH + chromeHeight + gap;
  }
  let max = 0;
  for (const h of heights) if (h > max) max = h;
  return { items, totalHeight: Math.max(0, max - gap) };
}

function readGridMin(): number {
  if (typeof document === "undefined") return DEFAULT_COL_MIN;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--grid-min")
    .trim();
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_COL_MIN;
}

/* The view store's `setZoom` writes the current zoom to
 * `document.documentElement.style.--grid-min`. The CSS layouts pick
 * the change up reactively; the JS packer can't, so we observe the
 * root style attribute and re-read on every mutation. Cheap: runs
 * once per zoom step, gated by an equality check. */
function useGridMin(): number {
  const [value, setValue] = useState<number>(readGridMin);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const target = document.documentElement;
    const obs = new MutationObserver(() => {
      const next = readGridMin();
      setValue((prev) => (prev === next ? prev : next));
    });
    obs.observe(target, { attributes: true, attributeFilter: ["style"] });
    return () => obs.disconnect();
  }, []);
  return value;
}

interface WaterfallViewProps {
  saves: ReadonlyArray<Save>;
}

export function WaterfallView({ saves }: WaterfallViewProps) {
  const width = useGridWidth();
  const colMin = useGridMin();
  const prefs = useDisplayPrefs();
  const chromeHeight = chromeHeightFor(prefs);
  const itemGap = 16;
  const aspectVersion = useAspectVersion();

  const { items, totalHeight } = useMemo(() => {
    void aspectVersion;
    return packMasonry(saves, width, colMin, itemGap, chromeHeight);
  }, [saves, width, colMin, chromeHeight, aspectVersion]);

  return (
    <PackedGrid layout="waterfall" items={items} totalHeight={totalHeight} />
  );
}
