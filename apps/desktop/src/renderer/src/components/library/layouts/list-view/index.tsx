import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import { LibraryGrid } from "@/components/library/layouts/grid";
import { SaveCard } from "@/components/save/card";
import { useMultiSelectActive } from "@/components/shared/grid-context";
import { useLibraryLayoutTransition } from "@/hooks/use-library-layout-transition";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import type { Save } from "@/lib/types";
import { useGridWidth } from "@/stores/shell-state";
import styles from "./styles.module.css";

const ROW = 64;

interface ListViewProps {
  saves: ReadonlyArray<Save>;
  onEndReached?: () => void;
}

export function ListView({ saves, onEndReached }: ListViewProps) {
  const scrollFade = useScrollFade<HTMLDivElement>();
  const gridRef = useRef<HTMLUListElement>(null);
  const width = useGridWidth();
  useLibraryLayoutTransition(gridRef, width);
  const multi = useMultiSelectActive();
  const virtualizer = useVirtualizer({
    count: saves.length,
    getScrollElement: () => scrollFade.ref.current,
    estimateSize: () => ROW,
    overscan: 12,
  });

  const items = virtualizer.getVirtualItems();
  const last = items[items.length - 1];
  useEffect(() => {
    if (last && last.index >= saves.length - 8) onEndReached?.();
  }, [last, onEndReached, saves.length]);

  return (
    <div className={styles.scroll} {...scrollFade}>
      <LibraryGrid.Grid
        ref={gridRef}
        layout="list"
        multiSelect={multi}
        style={{ height: virtualizer.getTotalSize() }}
      >
        {items.map((item) => {
          const save = saves[item.index];
          if (!save) return null;
          return (
            <SaveCard
              key={save.id}
              id={save.id}
              layout="list"
              packedWidth={width || undefined}
              packedHeight={ROW}
              packedTop={item.start}
              packedLeft={0}
            />
          );
        })}
      </LibraryGrid.Grid>
    </div>
  );
}
