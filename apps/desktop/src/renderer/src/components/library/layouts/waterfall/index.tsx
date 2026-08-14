import { useMemo } from "react";
import {
  LIBRARY_ITEM_GAP,
  type PackedItem,
  type PackResult,
  SavePackedGrid,
} from "@/components/library/layouts/packed-grid";
import { useGridMin } from "@/hooks/use-grid-min";
import { useMediaPickOptions } from "@/hooks/use-media-pick-options";
import type { MediaPickOptions } from "@/lib/media/units";
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
  opts: MediaPickOptions,
): PackResult {
  if (containerWidth <= 0) {
    return { items: [], totalHeight: 0 };
  }
  const cols = Math.max(1, Math.floor((containerWidth + gap) / (colMin + gap)));
  const colW = (containerWidth - gap * (cols - 1)) / cols;
  const heights = new Array<number>(cols).fill(0);

  const items: PackedItem[] = [];
  for (const save of saves) {
    const ratio = aspectFor(save, opts);
    const mediaH = colW / ratio;
    let target = 0;
    for (let i = 1; i < cols; i++) {
      if ((heights[i] ?? 0) < (heights[target] ?? 0)) target = i;
    }
    const left = target * (colW + gap);
    const top = heights[target] ?? 0;
    items.push({
      id: save.id,
      top,
      left,
      width: colW,
      height: mediaH + chromeHeight,
      mediaHeight: mediaH,
    });
    heights[target] = top + mediaH + chromeHeight + gap;
  }
  let max = 0;
  for (const h of heights) if (h > max) max = h;
  return { items, totalHeight: Math.max(0, max - gap) };
}

interface WaterfallViewProps {
  saves: ReadonlyArray<Save>;
  onEndReached?: () => void;
}

export function WaterfallView({ saves, onEndReached }: WaterfallViewProps) {
  const width = useGridWidth();
  const colMin = useGridMin();
  const prefs = useDisplayPrefs();
  const chromeHeight = chromeHeightFor(prefs);
  const aspectVersion = useAspectVersion();
  const pickOpts = useMediaPickOptions();

  const { items, totalHeight } = useMemo(() => {
    void aspectVersion;
    return packMasonry(
      saves,
      width,
      colMin,
      LIBRARY_ITEM_GAP,
      chromeHeight,
      pickOpts,
    );
  }, [saves, width, colMin, chromeHeight, aspectVersion, pickOpts]);

  return (
    <SavePackedGrid
      layout="waterfall"
      items={items}
      totalHeight={totalHeight}
      onEndReached={onEndReached}
    />
  );
}
