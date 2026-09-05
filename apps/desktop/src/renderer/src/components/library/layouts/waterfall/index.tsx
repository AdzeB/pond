import { useMemo } from "react";
import { SavePackedGrid } from "@/components/library/layouts/packed-grid";
import {
  LIBRARY_ITEM_GAP,
  packWaterfall,
} from "@/components/library/layouts/packing";
import { useGridMin } from "@/hooks/use-grid-min";
import { useMediaPickOptions } from "@/hooks/use-media-pick-options";
import type { Save } from "@/lib/types";
import { chromeHeightFor } from "@/lib/ui/library-chrome";
import { aspectFor, useAspectVersion } from "@/stores/aspect";
import { useDisplayPrefs } from "@/stores/display-prefs";
import { useGridWidth } from "@/stores/shell-state";

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
