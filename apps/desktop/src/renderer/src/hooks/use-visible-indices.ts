import { useEffect, useRef, useState } from "react";
import { findScrollParent } from "@/lib/dom";

interface PositionedItem {
  top: number;
  height: number;
}

const OVERSCAN_PX = 600;

function sameIndices(a: number[], b: number[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Item indices overlapping the overscanned viewport. Scans all items since waterfall packing isn't monotonic by `top`.
function computeVisible<T extends PositionedItem>(
  items: T[],
  offsetWithinGrid: number,
  viewportH: number,
): number[] {
  const viewMin = offsetWithinGrid - OVERSCAN_PX;
  const viewMax = offsetWithinGrid + viewportH + OVERSCAN_PX;
  const out: number[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    if (item.top + item.height < viewMin) continue;
    if (item.top > viewMax) continue;
    out.push(i);
  }
  return out;
}

// Indices overlapping the overscanned viewport; seeds windowed, recomputes on item-set change, measures geometry once + on resize (per-scroll getBoundingClientRect forces reflow).
export function useVisibleIndices<T extends PositionedItem>(
  ref: React.RefObject<HTMLElement | null>,
  items: T[],
): number[] {
  const estViewportH =
    typeof window !== "undefined" ? window.innerHeight : 1000;
  // Live scroll geometry in a ref so render-time recompute and handlers share one source without extra renders.
  const metricsRef = useRef({
    gridOffsetTop: 0,
    scrollTop: 0,
    viewportH: estViewportH,
  });

  const [visible, setVisible] = useState<number[]>(() =>
    computeVisible(items, 0, estViewportH),
  );
  const visibleRef = useRef<number[]>(visible);
  visibleRef.current = visible;

  // Re-window synchronously on item-set change; cached metrics are still valid since scroll hasn't moved.
  const lastItemsRef = useRef<T[]>(items);
  if (lastItemsRef.current !== items) {
    lastItemsRef.current = items;
    const m = metricsRef.current;
    const next = computeVisible(
      items,
      m.scrollTop - m.gridOffsetTop,
      m.viewportH,
    );
    if (!sameIndices(visibleRef.current, next)) {
      visibleRef.current = next;
      setVisible(next);
    }
  }

  useEffect(() => {
    const node = ref.current;
    const parent = findScrollParent(node);
    if (!node || !parent) return;

    const measure = () => {
      const parentRect = parent.getBoundingClientRect();
      const gridRect = node.getBoundingClientRect();
      const m = metricsRef.current;
      m.gridOffsetTop = parent.scrollTop + (gridRect.top - parentRect.top);
      m.viewportH = parent.clientHeight;
      m.scrollTop = parent.scrollTop;
    };

    const apply = () => {
      const m = metricsRef.current;
      m.scrollTop = parent.scrollTop;
      const next = computeVisible(
        items,
        m.scrollTop - m.gridOffsetTop,
        m.viewportH,
      );
      if (sameIndices(visibleRef.current, next)) return;
      visibleRef.current = next;
      setVisible(next);
    };

    measure();
    apply();

    let raf = 0;
    const onScroll = () => {
      if (raf !== 0) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    };
    const onResize = () => {
      measure();
      apply();
    };

    parent.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      parent.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf !== 0) cancelAnimationFrame(raf);
    };
  }, [ref, items]);

  return visible;
}
