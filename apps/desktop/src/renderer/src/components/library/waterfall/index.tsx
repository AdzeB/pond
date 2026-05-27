import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LibraryGrid } from "@/components/library";
import { aspectFor, useAspectVersion } from "@/lib/aspect";
import { useItemGap } from "@/lib/density";
import { useDisplayPrefs } from "@/lib/display-prefs";
import { chromeHeightFor } from "@/lib/library-chrome";
import { useVisibleIndices } from "@/lib/use-visible-indices";
import type { Save } from "@/pool/types";

const DEFAULT_COL_MIN = 130;

interface PackedPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PackedItem extends PackedPosition {
  save: Save;
}

interface PackResult {
  items: PackedItem[];
  totalHeight: number;
}

function packMasonry(
  saves: ReadonlyArray<Save>,
  containerWidth: number,
  colMin: number,
  gap: number,
  chromeHeight: number,
): PackResult {
  if (containerWidth <= 0) {
    return { items: [], totalHeight: 0 };
  }
  const cols = Math.max(1, Math.floor((containerWidth + gap) / (colMin + gap)));
  const colW = (containerWidth - gap * (cols - 1)) / cols;
  const heights = new Array<number>(cols).fill(0);

  const items: PackedItem[] = [];
  for (const save of saves) {
    const ratio = aspectFor(save);
    const mediaH = colW / ratio;
    let target = 0;
    for (let i = 1; i < cols; i++) {
      if ((heights[i] ?? 0) < (heights[target] ?? 0)) target = i;
    }
    const left = target * (colW + gap);
    const top = heights[target] ?? 0;
    items.push({ save, top, left, width: colW, height: mediaH });
    heights[target] = top + mediaH + chromeHeight + gap;
  }
  let max = 0;
  for (const h of heights) if (h > max) max = h;
  return { items, totalHeight: Math.max(0, max - gap) };
}

function readGridMin(): number {
  if (typeof document === "undefined") return DEFAULT_COL_MIN;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--grid-min")
    .trim();
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_COL_MIN;
}

/* `useZoom()` (in `library/toolbar/index.tsx`) writes the current zoom
 * to `document.documentElement.style.--grid-min`. The CSS layouts pick
 * the change up reactively; the JS packer can't, so we observe the
 * root style attribute and re-read on every mutation. Cheap: runs
 * once per zoom step, gated by an equality check. */
function useGridMin(): number {
  const [value, setValue] = useState<number>(readGridMin);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const target = document.documentElement;
    const obs = new MutationObserver(() => {
      const next = readGridMin();
      setValue((prev) => (prev === next ? prev : next));
    });
    obs.observe(target, { attributes: true, attributeFilter: ["style"] });
    return () => obs.disconnect();
  }, []);
  return value;
}

interface WaterfallViewProps {
  saves: ReadonlyArray<Save>;
  renderCard: (save: Save, packed: PackedPosition) => React.ReactNode;
  multiSelectActive: boolean;
}

export function WaterfallView({
  saves,
  renderCard,
  multiSelectActive,
}: WaterfallViewProps) {
  const ref = useRef<HTMLUListElement>(null);
  const [width, setWidth] = useState(0);
  const colMin = useGridMin();
  const prefs = useDisplayPrefs();
  const chromeHeight = chromeHeightFor(prefs);
  const itemGap = useItemGap();
  const aspectVersion = useAspectVersion();

  useLayoutEffect(() => {
    if (!ref.current) return;
    const w = ref.current.getBoundingClientRect().width;
    if (w > 0) setWidth(w);
  }, []);

  // Each tab is kept mounted and hidden via `display: none` (see
  // `App.tsx`). A hidden element has no layout box, so ResizeObserver
  // would otherwise fire with width 0 every time we leave the tab,
  // wiping the packed grid and forcing a full re-pack on return. We
  // keep the last known non-zero width across visibility changes so
  // the layout survives tab switches without a visible reflow.
  useEffect(() => {
    if (!ref.current) return;
    let raf = 0;
    let pending: number | null = null;
    const ro = new ResizeObserver((entries) => {
      const last = entries[entries.length - 1];
      if (!last) return;
      const w = last.contentRect.width;
      if (w <= 0) return;
      pending = w;
      if (raf !== 0) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (pending !== null) {
          const next = pending;
          pending = null;
          setWidth((prev) => (prev === next ? prev : next));
        }
      });
    });
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      if (raf !== 0) cancelAnimationFrame(raf);
    };
  }, []);

  const { items, totalHeight } = useMemo(() => {
    void aspectVersion;
    return packMasonry(saves, width, colMin, itemGap, chromeHeight);
  }, [saves, width, colMin, itemGap, chromeHeight, aspectVersion]);

  const style = useMemo<React.CSSProperties>(
    () => ({ height: `${totalHeight}px` }),
    [totalHeight],
  );

  // Only render items whose absolute position intersects the
  // viewport (plus an overscan band). The grid keeps its full
  // `totalHeight` so the scrollbar stays accurate, but off-screen
  // cards never reach React reconciliation, image decode, or paint.
  const visible = useVisibleIndices(ref, items);

  return (
    <LibraryGrid.Grid
      ref={ref}
      layout="waterfall"
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
