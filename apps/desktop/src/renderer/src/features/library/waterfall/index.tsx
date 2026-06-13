import { useMemo } from "react";
import type { Save } from "@/core/data/types";
import { chromeHeightFor } from "@/features/library/lib/library-chrome";
import { useGridMin } from "@/features/library/lib/use-grid-min";
import { aspectFor, useAspectVersion } from "@/features/library/stores/aspect";
import { useDisplayPrefs } from "@/features/library/stores/display-prefs";
import { useGridWidth } from "@/features/library/stores/shell-state";
import { PackedGrid, type PackedItem, type PackResult } from "../packed-grid";

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
