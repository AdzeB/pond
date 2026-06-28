import { useCallback, useEffect, useRef, useState } from "react";

const SLIDE_SELECTOR = "[data-blossom-slide]";

function slideNodes(scroller: HTMLElement) {
  return scroller.querySelectorAll<HTMLElement>(SLIDE_SELECTOR);
}

// Index of the slide whose centre is nearest the scrollport centre. Blossom is
// a native scroll container, so we read this off live geometry rather than a
// carousel API — which also keeps it correct while slides are still resizing.
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

// Scroll the slide at `index` to the scrollport centre using live geometry.
function centerSlide(
  scroller: HTMLElement,
  index: number,
  behavior: ScrollBehavior,
) {
  const nodes = slideNodes(scroller);
  const slide = nodes[Math.max(0, Math.min(index, nodes.length - 1))];
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

// Remember each media's resolved aspect ratio so a slide reserves the SAME box
// whether it is mounted as the live player or as its placeholder. Without this
// the placeholder uses the fallback ratio and the slide resizes on every
// in-view toggle, shifting layout and making the active index oscillate.
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

// The slide currently nearest the centre, tracked reactively off scroll/resize.
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

// Arrow navigation plus initial centring. Both work off live geometry instead
// of Blossom's cached snap positions, which go stale when slides resize from
// the fallback ratio (causing arrow presses to skip a slide).
export function useCarouselNavigation(
  scroller: HTMLElement | null,
  _ratios: ReadonlyMap<string, number>,
) {
  // Once the viewer scrolls/drags we stop re-centring the first slide.
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

  // Native scroll-snap doesn't settle the first slide to centre on load, and the
  // async fallback->real ratio resize shifts layout without re-snapping. Centre
  // it until the viewer interacts. Instant (not "auto"): Blossom sets
  // scroll-behavior:smooth, so "auto" would animate this and the slide appears
  // to slide in from the left on open. Arrows still use "smooth".
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
