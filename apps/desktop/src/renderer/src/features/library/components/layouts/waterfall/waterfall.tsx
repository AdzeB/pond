import { useMemo } from "react";
import { SavePackedGrid } from "@/features/library/components/layouts/packed-grid/packed-grid";
import {
  LIBRARY_ITEM_GAP,
  packWaterfall,
} from "@/features/library/components/layouts/packing";
import { useGridMin } from "@/features/library/hooks/use-grid-min";
import { chromeHeightFor } from "@/features/library/lib/library-chrome";
import { useDisplayPrefs } from "@/features/library/state/display-prefs";
import { useGridWidth } from "@/features/library/state/shell-state";
import { useMediaPickOptions } from "@/features/saves/hooks/use-media-pick-options";
import { aspectFor, useAspectVersion } from "@/features/saves/state/aspect";
import type { Save } from "@/features/saves/types";

interface WaterfallViewProps {
  saves: ReadonlyArray<Save>;
  onEndReached?: () => void;
}

export function WaterfallView({ saves, onEndReached }: WaterfallViewProps) {
  const width = useGridWidth();
  const colMin = useGridMin();
  const prefs = useDisplayPrefs();
  const chromeHeight = chromeHeightFor(prefs);
  const aspectVersion = useAspectVersion();
  const pickOpts = useMediaPickOptions();

  const { items, totalHeight } = useMemo(() => {
    void aspectVersion;
    return packWaterfall(
      saves.map((save) => ({
        id: save.id,
        aspect: aspectFor(save, pickOpts),
      })),
      width,
      colMin,
      LIBRARY_ITEM_GAP,
      chromeHeight,
    );
  }, [saves, width, colMin, chromeHeight, aspectVersion, pickOpts]);

  return (
    <SavePackedGrid
      layout="waterfall"
      items={items}
      totalHeight={totalHeight}
      onEndReached={onEndReached}
    />
  );
}
