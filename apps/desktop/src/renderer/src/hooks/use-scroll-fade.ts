import { useCallback, useLayoutEffect, useRef, useState } from "react";

type ScrollAxis = "x" | "y";
type ScrollEdges = "" | "start" | "end" | "start end";

function axisOf(element: HTMLElement): ScrollAxis {
  const dx = element.scrollWidth - element.clientWidth;
  const dy = element.scrollHeight - element.clientHeight;
  if (dx > dy) return "x";
  if (dy > dx) return "y";
  const { overflowX, overflowY } = getComputedStyle(element);
  const canX = overflowX === "auto" || overflowX === "scroll";
  const canY = overflowY === "auto" || overflowY === "scroll";
  return canX && !canY ? "x" : "y";
}

function edgesOf(element: HTMLElement, axis: ScrollAxis): ScrollEdges {
  const start = axis === "x" ? element.scrollLeft > 1 : element.scrollTop > 1;
  const end =
    axis === "x"
      ? element.scrollLeft + element.clientWidth < element.scrollWidth - 1
      : element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  return [start && "start", end && "end"]
    .filter(Boolean)
    .join(" ") as ScrollEdges;
}

export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [axis, setAxis] = useState<ScrollAxis>("y");
  const [edges, setEdges] = useState<ScrollEdges>("");

  const update = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const nextAxis = axisOf(element);
    const nextEdges = edgesOf(element, nextAxis);
    setAxis((current) => (current === nextAxis ? current : nextAxis));
    setEdges((current) => (current === nextEdges ? current : nextEdges));
  }, []);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(update);
    const observeLayout = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(element);
      for (const child of element.children) resizeObserver.observe(child);
      update();
    };
    const mutationObserver = new MutationObserver(observeLayout);

    observeLayout();
    element.addEventListener("scroll", update, { passive: true });
    mutationObserver.observe(element, { childList: true, subtree: true });

    return () => {
      element.removeEventListener("scroll", update);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [update]);

  return {
    ref,
    "data-scroll-fade": axis,
    "data-scrollable": edges,
  } as const;
}
