import { useMemo } from "react";
import {
  PackedGrid,
  type PackedItem,
  type PackResult,
} from "@/components/library-packed-grid";
import { chromeHeightFor } from "@/lib/library-chrome";
import type { Save } from "@/lib/types";
import { aspectFor, useAspectVersion } from "@/stores/aspect";
import { useDisplayPrefs } from "@/stores/display-prefs";
import { useGridWidth } from "@/stores/shell-state";

const TARGET_ROW_HEIGHT = 180;

// A square placeholder cell (when `placeholderCount > 0`) leads the first row.
type RowCell = { kind: "placeholder" } | { kind: "save"; save: Save };

function packRows(
  saves: ReadonlyArray<Save>,
  containerWidth: number,
  targetHeight: number,
  gap: number,
  chromeHeight: number,
  placeholderCount: number,
): PackResult {
  const hasPlaceholder = placeholderCount > 0;
  if (containerWidth <= 0 || (saves.length === 0 && !hasPlaceholder)) {
    return { items: [], totalHeight: 0 };
  }

  const cells: RowCell[] = [];
  if (hasPlaceholder) cells.push({ kind: "placeholder" });
  for (const save of saves) cells.push({ kind: "save", save });
  const aspectOf = (cell: RowCell): number =>
    cell.kind === "placeholder" ? 1 : aspectFor(cell.save);

  const items: PackedItem[] = [];
  let current: RowCell[] = [];
  let aspectSum = 0;
  let cursorTop = 0;

  const flushRow = (height: number) => {
    let cursorLeft = 0;
    for (const cell of current) {
      const width = aspectOf(cell) * height;
      if (cell.kind === "placeholder") {
        items.push({
          kind: "placeholder",
          count: placeholderCount,
          width,
          height,
          top: cursorTop,
          left: cursorLeft,
        });
      } else {
        items.push({
          save: cell.save,
          width,
          height,
          top: cursorTop,
          left: cursorLeft,
        });
      }
      cursorLeft += width + gap;
    }
    // Advance past media + the meta block; without chromeHeight the next row overlaps it.
    cursorTop += height + chromeHeight + gap;
    current = [];
    aspectSum = 0;
  };

  for (const cell of cells) {
    const aspect = aspectOf(cell);
    current.push(cell);
    aspectSum += aspect;
    const naturalWidth = aspectSum * targetHeight + gap * (current.length - 1);
    if (naturalWidth >= containerWidth) {
      const available = containerWidth - gap * (current.length - 1);
      flushRow(available / aspectSum);
    }
  }
  // Last partial row keeps target height so cards trail off rather than over-stretch.
  if (current.length > 0) flushRow(targetHeight);
  const totalHeight = Math.max(0, cursorTop - gap);
  return { items, totalHeight };
}

interface JustifiedViewProps {
  saves: ReadonlyArray<Save>;
  placeholderCount: number;
  targetHeight?: number;
}

export function JustifiedView({
  saves,
  placeholderCount,
  targetHeight = TARGET_ROW_HEIGHT,
}: JustifiedViewProps) {
  const width = useGridWidth();
  const prefs = useDisplayPrefs();
  const chromeHeight = chromeHeightFor(prefs);
  const itemGap = 16;
  const aspectVersion = useAspectVersion();

  const { items, totalHeight } = useMemo(() => {
    void aspectVersion;
    return packRows(
      saves,
      width,
      targetHeight,
      itemGap,
      chromeHeight,
      placeholderCount,
    );
  }, [
    saves,
    width,
    targetHeight,
    chromeHeight,
    aspectVersion,
    placeholderCount,
  ]);

  return (
    <PackedGrid layout="justified" items={items} totalHeight={totalHeight} />
  );
}
