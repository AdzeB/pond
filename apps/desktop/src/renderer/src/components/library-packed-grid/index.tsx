import { useMemo, useRef } from "react";
import { useMultiSelectActive } from "@/components/grid-context";
import { type GridLayout, LibraryGrid } from "@/components/library-grid";
import { UploadingCard } from "@/components/library-uploading-card";
import { SaveCard } from "@/components/save-card";
import type { CardLayout } from "@/components/save-card-media";
import { useVisibleIndices } from "@/hooks/use-visible-indices";
import type { Save } from "@/lib/types";

interface PackedPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PackedSaveItem extends PackedPosition {
  kind?: "save";
  save: Save;
}

// Synthetic leading tile for in-flight (ingesting) saves the grid filter still hides.
interface PackedPlaceholderItem extends PackedPosition {
  kind: "placeholder";
  count: number;
}

export type PackedItem = PackedSaveItem | PackedPlaceholderItem;

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
        if (it.kind === "placeholder") {
          return (
            <UploadingCard
              key="__uploading__"
              count={it.count}
              layout={layout as CardLayout}
              packedWidth={it.width}
              packedHeight={it.height}
              packedTop={it.top}
              packedLeft={it.left}
            />
          );
        }
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
