import { useMemo } from "react";
import { aspectFor, useAspectVersion } from "@/lib/stores/aspect";
import { useDisplayPrefs } from "@/lib/stores/display-prefs";
import { useGridWidth } from "@/lib/stores/shell-state";
import { chromeHeightFor } from "@/lib/utils/library-chrome";
import type { Save } from "@/pool/types";
import {
  PackedGrid,
  type PackedItem,
  type PackedPosition,
  type PackResult,
} from "../packed-grid";

const TARGET_ROW_HEIGHT = 180;

function packRows(
  saves: ReadonlyArray<Save>,
  containerWidth: number,
  targetHeight: number,
  gap: number,
  chromeHeight: number,
): PackResult {
  if (containerWidth <= 0 || saves.length === 0) {
    return { items: [], totalHeight: 0 };
  }
  const items: PackedItem[] = [];
  let current: Save[] = [];
  let aspectSum = 0;
  let cursorTop = 0;

  const flushRow = (height: number) => {
    let cursorLeft = 0;
    for (const s of current) {
      const width = aspectFor(s) * height;
      items.push({
        save: s,
        width,
        height,
        top: cursorTop,
        left: cursorLeft,
      });
      cursorLeft += width + gap;
    }
    // Advance past the media slot AND the meta block underneath it
    // (title / date). Without `chromeHeight` the next row would draw
    // its media on top of the previous row's meta block.
    cursorTop += height + chromeHeight + gap;
    current = [];
    aspectSum = 0;
  };

  for (const save of saves) {
    const aspect = aspectFor(save);
    current.push(save);
    aspectSum += aspect;
    const naturalWidth = aspectSum * targetHeight + gap * (current.length - 1);
    if (naturalWidth >= containerWidth) {
      const available = containerWidth - gap * (current.length - 1);
      flushRow(available / aspectSum);
    }
  }
  /* Last partial row keeps target height; cards retain natural widths
   * and trail off rather than over-stretching. Matches Eagle. */
  if (current.length > 0) flushRow(targetHeight);
  const totalHeight = Math.max(0, cursorTop - gap);
  return { items, totalHeight };
}

interface JustifiedViewProps {
  saves: ReadonlyArray<Save>;
  renderCard: (save: Save, packed: PackedPosition) => React.ReactNode;
  multiSelectActive: boolean;
  targetHeight?: number;
}

export function JustifiedView({
  saves,
  renderCard,
  multiSelectActive,
  targetHeight = TARGET_ROW_HEIGHT,
}: JustifiedViewProps) {
  const width = useGridWidth();
  const prefs = useDisplayPrefs();
  const chromeHeight = chromeHeightFor(prefs);
  const itemGap = 16;
  const aspectVersion = useAspectVersion();

  const { items, totalHeight } = useMemo(() => {
    void aspectVersion;
    return packRows(saves, width, targetHeight, itemGap, chromeHeight);
  }, [saves, width, targetHeight, chromeHeight, aspectVersion]);

  return (
    <PackedGrid
      layout="justified"
      items={items}
      totalHeight={totalHeight}
      multiSelectActive={multiSelectActive}
      renderCard={renderCard}
    />
  );
}
