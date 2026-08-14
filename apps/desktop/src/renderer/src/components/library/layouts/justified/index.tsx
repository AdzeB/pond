import { useMemo } from "react";
import {
  LIBRARY_ITEM_GAP,
  type PackedItem,
  type PackResult,
  SavePackedGrid,
} from "@/components/library/layouts/packed-grid";
import { useGridMin } from "@/hooks/use-grid-min";
import { useMediaPickOptions } from "@/hooks/use-media-pick-options";
import type { MediaPickOptions } from "@/lib/media/units";
import type { Save } from "@/lib/types";
import { chromeHeightFor } from "@/lib/ui/library-chrome";
import { aspectFor, useAspectVersion } from "@/stores/aspect";
import { useDisplayPrefs } from "@/stores/display-prefs";
import { useGridWidth } from "@/stores/shell-state";

function packRows(
  saves: ReadonlyArray<Save>,
  containerWidth: number,
  targetHeight: number,
  gap: number,
  chromeHeight: number,
  opts: MediaPickOptions,
): PackResult {
  if (containerWidth <= 0 || saves.length === 0) {
    return { items: [], totalHeight: 0 };
  }

  const items: PackedItem[] = [];
  let current: Array<{ save: Save; aspect: number }> = [];
  let aspectSum = 0;
  let cursorTop = 0;

  const flushRow = (height: number) => {
    let cursorLeft = 0;
    for (const { save, aspect } of current) {
      const width = aspect * height;
      items.push({
        id: save.id,
        width,
        height: height + chromeHeight,
        mediaHeight: height,
        top: cursorTop,
        left: cursorLeft,
      });
      cursorLeft += width + gap;
    }
    /** Without chromeHeight the next row overlaps the meta block. */
    cursorTop += height + chromeHeight + gap;
    current = [];
    aspectSum = 0;
  };

  for (const save of saves) {
    const aspect = aspectFor(save, opts);
    current.push({ save, aspect });
    aspectSum += aspect;
    const naturalWidth = aspectSum * targetHeight + gap * (current.length - 1);
    if (naturalWidth >= containerWidth) {
      const available = containerWidth - gap * (current.length - 1);
      flushRow(available / aspectSum);
    }
  }
  /** The last partial row keeps target height so cards trail off rather than over-stretch. */
  if (current.length > 0) flushRow(targetHeight);
  const totalHeight = Math.max(0, cursorTop - gap);
  return { items, totalHeight };
}

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
    return packRows(
      saves,
      width,
      targetHeight,
      LIBRARY_ITEM_GAP,
      chromeHeight,
      pickOpts,
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
