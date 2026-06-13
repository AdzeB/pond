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

// Returns the subset of indices into `items` whose vertical extent
// overlaps the scroll viewport (plus an overscan band). The waterfall
// packer interleaves columns so item ordering is not monotonic by
// `top`. We scan every item, but the per-item comparison is two
// numeric checks and stays well under a millisecond for thousands
// of items.
//
// Two things keep scrolling smooth here:
//   1. The grid's offset within the scroll content and the viewport
//      height are measured once (and on resize / data change), not on
//      every frame — reading `getBoundingClientRect` per scroll event
//      forces a synchronous reflow and is what made scrolling choppy.
//   2. We only push a new array into React state when the visible set
//      actually changes, so a scroll that doesn't reveal/hide any card
//      is zero React work.
export function useVisibleIndices<T extends PositionedItem>(
  ref: React.RefObject<HTMLElement | null>,
  items: T[],
): number[] {
  const [visible, setVisible] = useState<number[]>(() =>
    items.map((_, i) => i),
  );
  const visibleRef = useRef<number[]>(visible);

  useEffect(() => {
    const node = ref.current;
    const parent = findScrollParent(node);
    if (!node || !parent) {
      const all = items.map((_, i) => i);
      visibleRef.current = all;
      setVisible(all);
      return;
    }

    // Cached geometry. `gridOffsetTop` is the grid's distance from the
    // top of the scroll container's content; combined with the live
    // `scrollTop` it reproduces the per-frame measurement without
    // touching layout on every frame.
    let gridOffsetTop = 0;
    let viewportH = parent.clientHeight;

    const measure = () => {
      const parentRect = parent.getBoundingClientRect();
      const gridRect = node.getBoundingClientRect();
      gridOffsetTop = parent.scrollTop + (gridRect.top - parentRect.top);
      viewportH = parent.clientHeight;
    };

    const compute = (): number[] => {
      const offsetWithinGrid = parent.scrollTop - gridOffsetTop;
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
    };

    const apply = () => {
      const next = compute();
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
