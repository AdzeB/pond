import { useMemo, useRef } from "react";
import type { Save } from "@/core/data/types";
import type { CardLayout } from "@/features/library/card-thumb";
import { type GridLayout, LibraryGrid } from "@/features/library/grid";
import { useMultiSelectActive } from "@/features/library/grid-context";
import { useVisibleIndices } from "@/features/library/hooks/use-visible-indices";
import { SaveCard } from "@/features/library/save-card";

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
}

export function PackedGrid({ layout, items, totalHeight }: PackedGridProps) {
  const ref = useRef<HTMLUListElement>(null);
  const multiSelectActive = useMultiSelectActive();
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
        return (
          <SaveCard
            key={it.save.id}
            id={it.save.id}
            layout={layout as CardLayout}
            packedWidth={it.width}
            packedHeight={it.height}
            packedTop={it.top}
            packedLeft={it.left}
          />
        );
      })}
    </LibraryGrid.Grid>
  );
}
