import { useMemo, useRef } from "react";
import { LibraryGrid } from "@/components/library";
import { aspectFor, useAspectVersion } from "@/lib/aspect";
import { useDisplayPrefs } from "@/lib/display-prefs";
import { chromeHeightFor } from "@/lib/library-chrome";
import { useGridWidth } from "@/lib/shell-state";
import { useVisibleIndices } from "@/lib/use-visible-indices";
import type { Save } from "@/pool/types";

const TARGET_ROW_HEIGHT = 180;

interface PackedItem {
  save: Save;
  width: number;
  height: number;
  top: number;
  left: number;
}

interface PackResult {
  items: PackedItem[];
  totalHeight: number;
}

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
  renderCard: (
    save: Save,
    packed: { top: number; left: number; width: number; height: number },
  ) => React.ReactNode;
  multiSelectActive: boolean;
  targetHeight?: number;
}

export function JustifiedView({
  saves,
  renderCard,
  multiSelectActive,
  targetHeight = TARGET_ROW_HEIGHT,
}: JustifiedViewProps) {
  const ref = useRef<HTMLUListElement>(null);
  const width = useGridWidth();
  const prefs = useDisplayPrefs();
  const chromeHeight = chromeHeightFor(prefs);
  const itemGap = 16;
  const aspectVersion = useAspectVersion();

  const { items, totalHeight } = useMemo(() => {
    void aspectVersion;
    return packRows(saves, width, targetHeight, itemGap, chromeHeight);
  }, [saves, width, targetHeight, chromeHeight, aspectVersion]);

  const style = useMemo<React.CSSProperties>(
    () => ({ height: `${totalHeight}px` }),
    [totalHeight],
  );

  const visible = useVisibleIndices(ref, items);

  return (
    <LibraryGrid.Grid
      ref={ref}
      layout="justified"
      multiSelect={multiSelectActive}
      style={style}
    >
      {visible.map((i) => {
        const it = items[i];
        if (!it) return null;
        return renderCard(it.save, {
          top: it.top,
          left: it.left,
          width: it.width,
          height: it.height,
        });
      })}
    </LibraryGrid.Grid>
  );
}
