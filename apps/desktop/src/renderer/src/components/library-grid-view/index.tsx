import { useMemo } from "react";
import {
  PackedGrid,
  type PackedItem,
  type PackResult,
} from "@/components/library-packed-grid";
import { useGridMin } from "@/hooks/use-grid-min";
import type { Save } from "@/lib/types";
import { chromeHeightFor } from "@/lib/ui/library-chrome";
import { useDisplayPrefs } from "@/stores/display-prefs";
import { useGridWidth } from "@/stores/shell-state";

const ITEM_GAP = 16;

// Uniform square-cell grid (ignores aspect ratio). Packed manually so it rides the same PackedGrid windowing path.
// A leading placeholder cell (when `placeholderCount > 0`) shifts every save by one slot.
function packUniform(
  saves: ReadonlyArray<Save>,
  containerWidth: number,
  colMin: number,
  gap: number,
  chromeHeight: number,
  placeholderCount: number,
): PackResult {
  const hasPlaceholder = placeholderCount > 0;
  if (containerWidth <= 0 || (saves.length === 0 && !hasPlaceholder)) {
    return { items: [], totalHeight: 0 };
  }
  const cols = Math.max(1, Math.floor((containerWidth + gap) / (colMin + gap)));
  const colW = (containerWidth - gap * (cols - 1)) / cols;
  // Square media: height == column width, plus the meta chrome underneath.
  const cellH = colW + chromeHeight;
  const place = (idx: number) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      width: colW,
      // `height` feeds viewport windowing, so it spans the whole cell, not just media.
      height: cellH,
      top: row * (cellH + gap),
      left: col * (colW + gap),
    };
  };
  const items: PackedItem[] = [];
  if (hasPlaceholder) {
    items.push({ kind: "placeholder", count: placeholderCount, ...place(0) });
  }
  const offset = hasPlaceholder ? 1 : 0;
  saves.forEach((save, idx) => {
    items.push({ save, ...place(idx + offset) });
  });
  const total = saves.length + offset;
  const rows = Math.ceil(total / cols);
  const totalHeight = rows > 0 ? rows * cellH + (rows - 1) * gap : 0;
  return { items, totalHeight };
}

interface GridViewProps {
  saves: ReadonlyArray<Save>;
  placeholderCount: number;
}

export function GridView({ saves, placeholderCount }: GridViewProps) {
  const width = useGridWidth();
  const colMin = useGridMin();
  const prefs = useDisplayPrefs();
  const chromeHeight = chromeHeightFor(prefs);

  const { items, totalHeight } = useMemo(
    () =>
      packUniform(
        saves,
        width,
        colMin,
        ITEM_GAP,
        chromeHeight,
        placeholderCount,
      ),
    [saves, width, colMin, chromeHeight, placeholderCount],
  );

  return <PackedGrid layout="grid" items={items} totalHeight={totalHeight} />;
}
