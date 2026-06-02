import { useMemo, useRef } from "react";
import { type GridLayout, LibraryGrid } from "@/components/library";
import { useVisibleIndices } from "@/lib/use-visible-indices";
import type { Save } from "@/pool/types";

export interface PackedPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface PackedItem extends PackedPosition {
  save: Save;
}

export interface PackResult {
  items: PackedItem[];
  totalHeight: number;
}

interface PackedGridProps {
  layout: GridLayout;
  items: PackedItem[];
  totalHeight: number;
  multiSelectActive: boolean;
  renderCard: (save: Save, packed: PackedPosition) => React.ReactNode;
}

export function PackedGrid({
  layout,
  items,
  totalHeight,
  multiSelectActive,
  renderCard,
}: PackedGridProps) {
  const ref = useRef<HTMLUListElement>(null);
  const style = useMemo<React.CSSProperties>(
    () => ({ height: `${totalHeight}px` }),
    [totalHeight],
  );

  // Only render items whose absolute position intersects the viewport
  // (plus an overscan band). The grid keeps its full `totalHeight` so the
  // scrollbar stays accurate, but off-screen cards never reach React
  // reconciliation, image decode, or paint.
  const visible = useVisibleIndices(ref, items);

  return (
    <LibraryGrid.Grid
      ref={ref}
      layout={layout}
      multiSelect={multiSelectActive}
      style={style}
    >
      {visible.map((i) => {
        const it = items[i];
        if (!it) return null;
        return renderCard(it.save, {
          top: it.top,
          left: it.left,
          width: it.width,
          height: it.height,
        });
      })}
    </LibraryGrid.Grid>
  );
}
