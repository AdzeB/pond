import { useMemo } from "react";
import {
  PackedGrid,
  type PackedItem,
  type PackResult,
} from "@/components/library-packed-grid";
import { useGridMin } from "@/hooks/use-grid-min";
import type { Save } from "@/lib/types";
import { chromeHeightFor } from "@/lib/ui/library-chrome";
import { aspectFor, useAspectVersion } from "@/stores/aspect";
import { useDisplayPrefs } from "@/stores/display-prefs";
import { useGridWidth } from "@/stores/shell-state";

function packMasonry(
  saves: ReadonlyArray<Save>,
  containerWidth: number,
  colMin: number,
  gap: number,
  chromeHeight: number,
  placeholderCount: number,
): PackResult {
  if (containerWidth <= 0) {
    return { items: [], totalHeight: 0 };
  }
  const cols = Math.max(1, Math.floor((containerWidth + gap) / (colMin + gap)));
  const colW = (containerWidth - gap * (cols - 1)) / cols;
  const heights = new Array<number>(cols).fill(0);

  const items: PackedItem[] = [];
  if (placeholderCount > 0) {
    // Square placeholder seeded into the first column before the masonry loop runs.
    const mediaH = colW;
    items.push({
      kind: "placeholder",
      count: placeholderCount,
      top: 0,
      left: 0,
      width: colW,
      height: mediaH,
    });
    heights[0] = mediaH + chromeHeight + gap;
  }
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
  placeholderCount: number;
}

export function WaterfallView({ saves, placeholderCount }: WaterfallViewProps) {
  const width = useGridWidth();
  const colMin = useGridMin();
  const prefs = useDisplayPrefs();
  const chromeHeight = chromeHeightFor(prefs);
  const itemGap = 16;
  const aspectVersion = useAspectVersion();

  const { items, totalHeight } = useMemo(() => {
    void aspectVersion;
    return packMasonry(
      saves,
      width,
      colMin,
      itemGap,
      chromeHeight,
      placeholderCount,
    );
  }, [saves, width, colMin, chromeHeight, aspectVersion, placeholderCount]);

  return (
    <PackedGrid layout="waterfall" items={items} totalHeight={totalHeight} />
  );
}
