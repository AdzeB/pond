import { useMemo } from "react";
import { SavePackedGrid } from "@/features/library/components/layouts/packed-grid/packed-grid";
import {
  LIBRARY_ITEM_GAP,
  packJustified,
} from "@/features/library/components/layouts/packing";
import { useGridMin } from "@/features/library/hooks/use-grid-min";
import { chromeHeightFor } from "@/features/library/lib/library-chrome";
import { useGridWidth } from "@/features/library/state/shell-state";
import { useMediaPickOptions } from "@/features/saves/hooks/use-media-pick-options";
import { aspectFor, useAspectVersion } from "@/features/saves/state/aspect";
import { useDisplayPrefs } from "@/features/saves/state/display-prefs";
import type { Save } from "@/features/saves/types";

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
