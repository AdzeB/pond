import { useMemo } from "react";
import type { Save } from "@/core/data/types";
import { chromeHeightFor } from "@/features/library/lib/library-chrome";
import { useGridMin } from "@/features/library/lib/use-grid-min";
import { useDisplayPrefs } from "@/features/library/stores/display-prefs";
import { useGridWidth } from "@/features/library/stores/shell-state";
import { PackedGrid, type PackedItem, type PackResult } from "../packed-grid";

const ITEM_GAP = 16;

// Uniform square-cell grid. Unlike waterfall/justified this ignores each
// item's aspect ratio (the media slot is forced square by `.grid-grid .media`),
// so every cell is the same size and the layout is a plain flow. Packing it
// ourselves — instead of leaning on CSS `display: grid` auto-placement — lets
// it ride the same `PackedGrid` viewport-windowing path as the other layouts
// rather than mounting a DOM node for every save.
function packUniform(
  saves: ReadonlyArray<Save>,
  containerWidth: number,
  colMin: number,
  gap: number,
  chromeHeight: number,
): PackResult {
  if (containerWidth <= 0 || saves.length === 0) {
    return { items: [], totalHeight: 0 };
  }
  const cols = Math.max(1, Math.floor((containerWidth + gap) / (colMin + gap)));
  const colW = (containerWidth - gap * (cols - 1)) / cols;
  // Media is square (aspect-ratio: 1/1), so media height == column width; the
  // full cell adds the meta chrome underneath.
  const cellH = colW + chromeHeight;
  const items: PackedItem[] = saves.map((save, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      save,
      width: colW,
      // `height` feeds viewport windowing, so it must span the whole cell
      // (media + chrome), not just the media slot.
      height: cellH,
      top: row * (cellH + gap),
      left: col * (colW + gap),
    };
  });
  const rows = Math.ceil(saves.length / cols);
  const totalHeight = rows > 0 ? rows * cellH + (rows - 1) * gap : 0;
  return { items, totalHeight };
}

interface GridViewProps {
  saves: ReadonlyArray<Save>;
}

export function GridView({ saves }: GridViewProps) {
  const width = useGridWidth();
  const colMin = useGridMin();
  const prefs = useDisplayPrefs();
  const chromeHeight = chromeHeightFor(prefs);

  const { items, totalHeight } = useMemo(
    () => packUniform(saves, width, colMin, ITEM_GAP, chromeHeight),
    [saves, width, colMin, chromeHeight],
  );

  return <PackedGrid layout="grid" items={items} totalHeight={totalHeight} />;
}
