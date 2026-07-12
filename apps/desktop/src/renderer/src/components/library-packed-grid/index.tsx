import { useMemo, useRef } from "react";
import { useMultiSelectActive } from "@/components/grid-context";
import { type GridLayout, LibraryGrid } from "@/components/library-grid";
import { SaveCard } from "@/components/save-card";
import type { CardLayout } from "@/components/save-card-media";
import { useVisibleIndices } from "@/hooks/use-visible-indices";
import type { Save } from "@/lib/types";

export interface PackedItem {
  top: number;
  left: number;
  width: number;
  height: number;
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

  // Only render items intersecting the overscanned viewport; full `totalHeight` keeps the scrollbar accurate.
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
