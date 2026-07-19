import { useMemo, useRef } from "react";
import { useMultiSelectActive } from "@/components/grid-context";
import { type GridLayout, LibraryGrid } from "@/components/library-grid";
import { SaveCard } from "@/components/save-card";
import type { CardLayout } from "@/components/save-card-media";
import { useVisibleIndices } from "@/hooks/use-visible-indices";
import type { Save } from "@/lib/types";

const NO_NEW_IDS: ReadonlySet<string> = new Set();

/** Ids that joined the list after first paint; scroll-in mounts from windowing must not replay the enter animation. */
function useNewIds(items: PackedItem[]): ReadonlySet<string> {
  const seen = useRef<Set<string> | null>(null);
  return useMemo(() => {
    if (seen.current === null) {
      seen.current = new Set(items.map((it) => it.save.id));
      return NO_NEW_IDS;
    }
    const fresh = new Set<string>();
    for (const it of items) {
      if (!seen.current.has(it.save.id)) {
        fresh.add(it.save.id);
        seen.current.add(it.save.id);
      }
    }
    return fresh.size > 0 ? fresh : NO_NEW_IDS;
  }, [items]);
}

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

  /** Only items intersecting the overscanned viewport render; the full `totalHeight` keeps the scrollbar accurate. */
  const visible = useVisibleIndices(ref, items);
  const newIds = useNewIds(items);

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
            entering={newIds.has(it.save.id)}
          />
        );
      })}
    </LibraryGrid.Grid>
  );
}
