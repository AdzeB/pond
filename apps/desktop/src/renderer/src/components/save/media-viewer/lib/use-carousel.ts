import { useCallback, useEffect, useRef, useState } from "react";
import { clamp } from "@/lib/util/math";

const SLIDE_SELECTOR = "[data-blossom-slide]";

function slideNodes(scroller: HTMLElement) {
  return scroller.querySelectorAll<HTMLElement>(SLIDE_SELECTOR);
}

/** Blossom is a native scroll container, so live geometry beats a carousel API and stays correct while slides are still resizing. */
function centeredIndex(scroller: HTMLElement): number {
  const viewportCenter =
    scroller.getBoundingClientRect().left + scroller.clientWidth / 2;
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  slideNodes(scroller).forEach((node, i) => {
    const rect = node.getBoundingClientRect();
    const dist = Math.abs((rect.left + rect.right) / 2 - viewportCenter);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

function centerSlide(
  scroller: HTMLElement,
  index: number,
  behavior: ScrollBehavior,
) {
  const nodes = slideNodes(scroller);
  const slide = nodes[clamp(index, 0, nodes.length - 1)];
  if (!slide) return;
  const elRect = scroller.getBoundingClientRect();
  const slideRect = slide.getBoundingClientRect();
  const delta =
    slideRect.left +
    slideRect.width / 2 -
    (elRect.left + scroller.clientWidth / 2);
  if (Math.abs(delta) > 1)
    scroller.scrollTo({ left: scroller.scrollLeft + delta, behavior });
}

/** A slide must reserve the same box as player and placeholder; otherwise it resizes on every in-view toggle and the active index oscillates. */
export function useRatioCache() {
  const [ratios, setRatios] = useState<ReadonlyMap<string, number>>(
    () => new Map(),
  );
  const reportRatio = useCallback((src: string, r: number) => {
    setRatios((prev) => {
      const cur = prev.get(src);
      if (cur != null && Math.abs(cur - r) < 0.01) return prev;
      const next = new Map(prev);
      next.set(src, r);
      return next;
    });
  }, []);
  return { ratios, reportRatio };
}

export function useActiveSlide(
  scroller: HTMLElement | null,
  _count: number,
): number {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!scroller) return;
    let frame = 0;
    const compute = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setActive(centeredIndex(scroller)));
    };
    compute();
    scroller.addEventListener("scroll", compute, { passive: true });
    const observer = new ResizeObserver(compute);
    observer.observe(scroller);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", compute);
      observer.disconnect();
    };
  }, [scroller]);
  return active;
}

/** Works off live geometry instead of Blossom's cached snap positions, which go stale when slides resize from the fallback ratio and make arrow presses skip a slide. */
export function useCarouselNavigation(
  scroller: HTMLElement | null,
  _ratios: ReadonlyMap<string, number>,
) {
  /** Once the viewer scrolls or drags, stop re-centring the first slide. */
  const interactedRef = useRef(false);
  useEffect(() => {
    if (!scroller) return;
    const mark = () => {
      interactedRef.current = true;
    };
    scroller.addEventListener("pointerdown", mark, { passive: true });
    scroller.addEventListener("wheel", mark, { passive: true });
    return () => {
      scroller.removeEventListener("pointerdown", mark);
      scroller.removeEventListener("wheel", mark);
    };
  }, [scroller]);

  /** Native scroll-snap doesn't settle the first slide to centre on load; "instant" because Blossom sets scroll-behavior:smooth and "auto" would animate the slide in from the left. */
  useEffect(() => {
    if (!scroller || interactedRef.current) return;
    centerSlide(scroller, 0, "instant");
  }, [scroller]);

  const goPrev = useCallback(() => {
    if (!scroller) return;
    interactedRef.current = true;
    centerSlide(scroller, centeredIndex(scroller) - 1, "smooth");
  }, [scroller]);
  const goNext = useCallback(() => {
    if (!scroller) return;
    interactedRef.current = true;
    centerSlide(scroller, centeredIndex(scroller) + 1, "smooth");
  }, [scroller]);

  return { goPrev, goNext };
}
