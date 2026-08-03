import { type ReactNode, useMemo, useRef } from "react";
import {
  type GridLayout,
  LibraryGrid,
} from "@/components/library/layouts/grid";
import { SaveCard } from "@/components/save/card";
import type { CardLayout } from "@/components/save/card/media";
import { useMultiSelectActive } from "@/components/shared/grid-context";
import {
  useVisibleIndices,
  type VisibilityMode,
} from "@/hooks/use-visible-indices";
import type { PackedItem } from "./uniform-pack";

function visibilityModeFor(layout: GridLayout): VisibilityMode {
  return layout === "waterfall" ? "scan" : "monotonic";
}

export type { PackedItem, PackResult } from "./uniform-pack";
export { LIBRARY_ITEM_GAP, packUniform } from "./uniform-pack";

const NO_NEW_IDS: ReadonlySet<string> = new Set();

/** Ids that joined the list after first paint; scroll-in mounts from windowing must not replay the enter animation. */
function useNewIds(items: PackedItem[]): ReadonlySet<string> {
  const seen = useRef<Set<string> | null>(null);
  return useMemo(() => {
    if (seen.current === null) {
      seen.current = new Set(items.map((it) => it.id));
      return NO_NEW_IDS;
    }
    const fresh = new Set<string>();
    for (const it of items) {
      if (!seen.current.has(it.id)) {
        fresh.add(it.id);
        seen.current.add(it.id);
      }
    }
    return fresh.size > 0 ? fresh : NO_NEW_IDS;
  }, [items]);
}

interface PackedGridProps {
  layout: GridLayout;
  items: PackedItem[];
  totalHeight: number;
  renderItem: (item: PackedItem, state: { entering: boolean }) => ReactNode;
}

export function PackedGrid({
  layout,
  items,
  totalHeight,
  renderItem,
}: PackedGridProps) {
  const ref = useRef<HTMLUListElement>(null);
  const multiSelectActive = useMultiSelectActive();
  const style = useMemo<React.CSSProperties>(
    () => ({ height: `${totalHeight}px` }),
    [totalHeight],
  );

  /** Only items intersecting the overscanned viewport render; the full `totalHeight` keeps the scrollbar accurate. */
  const visible = useVisibleIndices(ref, items, visibilityModeFor(layout));
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
        return renderItem(it, { entering: newIds.has(it.id) });
      })}
    </LibraryGrid.Grid>
  );
}

interface SavePackedGridProps {
  layout: GridLayout;
  items: PackedItem[];
  totalHeight: number;
}

/** Library save layouts: windowed PackedGrid that always mounts SaveCard. */
export function SavePackedGrid({
  layout,
  items,
  totalHeight,
}: SavePackedGridProps) {
  return (
    <PackedGrid
      layout={layout}
      items={items}
      totalHeight={totalHeight}
      renderItem={(it, { entering }) => (
        <SaveCard
          key={it.id}
          id={it.id}
          layout={layout as CardLayout}
          packedWidth={it.width}
          packedHeight={it.height}
          packedTop={it.top}
          packedLeft={it.left}
          entering={entering}
        />
      )}
    />
  );
}
