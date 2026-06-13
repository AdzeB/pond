import { useEffect, useRef, useState } from "react";

// Walks up from `el` until it finds the nearest ancestor whose
// computed overflow on the block axis allows scrolling. Falls back
// to `document.documentElement` so the math still works for stories
// / standalone usage where there's no `<main>`.
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    const oy = style.overflowY;
    if (oy === "auto" || oy === "scroll" || oy === "overlay") return node;
    node = node.parentElement;
  }
  return document.documentElement;
}

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

// Pure windowing: which item indices overlap `[offset - overscan,
// offset + viewport + overscan]`. The waterfall packer interleaves
// columns so item ordering is not monotonic by `top`; we scan every
// item, but the per-item comparison is two numeric checks and stays
// well under a millisecond for thousands of items.
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

// Returns the subset of indices into `items` whose vertical extent
// overlaps the scroll viewport (plus an overscan band).
//
// Three things keep this fast and avoid jank:
//   1. The initial state is the *windowed* set computed from an
//      estimated viewport (scrollTop 0, `window.innerHeight`), NOT every
//      index. Seeding with all indices mounts the entire library on the
//      first paint of every grid, then throws ~99% away one frame later
//      — the single worst spike when navigating into a large library.
//   2. When the item set changes (filter / sort / repack), we recompute
//      synchronously *during render* from the last known scroll metrics,
//      so a data swap never momentarily mounts everything either.
//   3. The grid's offset within the scroll content and the viewport
//      height are measured once (and on resize), not on every frame —
//      reading `getBoundingClientRect` per scroll event forces a
//      synchronous reflow and is what made scrolling choppy. We also
//      only push a new array into React state when the visible set
//      actually changes.
export function useVisibleIndices<T extends PositionedItem>(
  ref: React.RefObject<HTMLElement | null>,
  items: T[],
): number[] {
  const estViewportH =
    typeof window !== "undefined" ? window.innerHeight : 1000;
  // Live scroll geometry, kept in a ref so the render-time recompute and
  // the scroll/resize handlers share one source of truth without extra
  // renders.
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

  // Re-window synchronously when the item set identity changes. Scroll
  // position hasn't moved, so the cached metrics are still valid; this
  // keeps the mounted set small across navigation / filtering without
  // waiting for the effect to run after commit.
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
