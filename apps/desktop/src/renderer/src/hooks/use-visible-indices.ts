import { useEffect, useRef, useState } from "react";
import { findScrollParent } from "@/lib/util/dom";
import {
  computeVisible,
  type PositionedItem,
  sameIndices,
  type VisibilityMode,
} from "./visible-indices";

export type { PositionedItem, VisibilityMode } from "./visible-indices";
export { computeVisible } from "./visible-indices";

/** Measures geometry once plus on resize because per-scroll getBoundingClientRect forces reflow. */
export function useVisibleIndices<T extends PositionedItem>(
  ref: React.RefObject<HTMLElement | null>,
  items: T[],
  mode: VisibilityMode = "scan",
): number[] {
  const estViewportH =
    typeof window !== "undefined" ? window.innerHeight : 1000;
  /** Live scroll geometry in a ref so render-time recompute and handlers share one source without extra renders. */
  const metricsRef = useRef({
    gridOffsetTop: 0,
    scrollTop: 0,
    viewportH: estViewportH,
  });
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const [visible, setVisible] = useState<number[]>(() =>
    computeVisible(items, 0, estViewportH, mode),
  );
  const visibleRef = useRef<number[]>(visible);
  visibleRef.current = visible;

  /** Re-window synchronously on item-set or mode change; cached metrics are still valid since scroll hasn't moved. */
  const lastItemsRef = useRef<T[]>(items);
  const lastModeRef = useRef(mode);
  if (lastItemsRef.current !== items || lastModeRef.current !== mode) {
    lastItemsRef.current = items;
    lastModeRef.current = mode;
    const m = metricsRef.current;
    const next = computeVisible(
      items,
      m.scrollTop - m.gridOffsetTop,
      m.viewportH,
      mode,
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
        modeRef.current,
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
