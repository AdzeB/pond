import { useMemo } from "react";
import { SavePackedGrid } from "@/components/library/layouts/packed-grid";
import {
  LIBRARY_ITEM_GAP,
  packJustified,
} from "@/components/library/layouts/packing";
import { useGridMin } from "@/hooks/use-grid-min";
import { useMediaPickOptions } from "@/hooks/use-media-pick-options";
import type { Save } from "@/lib/types";
import { chromeHeightFor } from "@/lib/ui/library-chrome";
import { aspectFor, useAspectVersion } from "@/stores/aspect";
import { useDisplayPrefs } from "@/stores/display-prefs";
import { useGridWidth } from "@/stores/shell-state";

interface JustifiedViewProps {
  saves: ReadonlyArray<Save>;
  onEndReached?: () => void;
}

export function JustifiedView({ saves, onEndReached }: JustifiedViewProps) {
  const width = useGridWidth();
  const targetHeight = useGridMin();
  const prefs = useDisplayPrefs();
  const chromeHeight = chromeHeightFor(prefs);
  const aspectVersion = useAspectVersion();
  const pickOpts = useMediaPickOptions();

  const { items, totalHeight } = useMemo(() => {
    void aspectVersion;
    return packJustified(
      saves.map((save) => ({
        id: save.id,
        aspect: aspectFor(save, pickOpts),
      })),
      width,
      targetHeight,
      LIBRARY_ITEM_GAP,
      chromeHeight,
    );
  }, [saves, width, targetHeight, chromeHeight, aspectVersion, pickOpts]);

  return (
    <SavePackedGrid
      layout="justified"
      items={items}
      totalHeight={totalHeight}
      onEndReached={onEndReached}
    />
  );
}
