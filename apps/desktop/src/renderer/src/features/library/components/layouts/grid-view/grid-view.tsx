import { useMemo } from "react";
import { SavePackedGrid } from "@/features/library/components/layouts/packed-grid/packed-grid";
import {
  LIBRARY_ITEM_GAP,
  packGrid,
} from "@/features/library/components/layouts/packing";
import { useGridMin } from "@/features/library/hooks/use-grid-min";
import { chromeHeightFor } from "@/features/library/lib/library-chrome";
import { useDisplayPrefs } from "@/features/library/state/display-prefs";
import { useGridWidth } from "@/features/library/state/shell-state";
import type { Save } from "@/features/saves/types";

interface GridViewProps {
  saves: ReadonlyArray<Save>;
  onEndReached?: () => void;
}

export function GridView({ saves, onEndReached }: GridViewProps) {
  const width = useGridWidth();
  const colMin = useGridMin();
  const prefs = useDisplayPrefs();
  const chromeHeight = chromeHeightFor(prefs);

  const { items, totalHeight } = useMemo(
    () =>
      packGrid(
        saves.map((s) => s.id),
        width,
        colMin,
        LIBRARY_ITEM_GAP,
        chromeHeight,
      ),
    [saves, width, colMin, chromeHeight],
  );

  return (
    <SavePackedGrid
      layout="grid"
      items={items}
      totalHeight={totalHeight}
      onEndReached={onEndReached}
    />
  );
}
