import { useLayoutEffect, useState } from "react";

/** Keep in sync with the library Shell.Main padding-inline. */
const MAIN_PADDING_INLINE = 20;
const GRID_PADDING = MAIN_PADDING_INLINE * 2;

function fallbackWidth(): number {
  if (typeof window === "undefined") return 0;
  /** AppShell inset + library Shell.Main padding on both sides. */
  return Math.max(0, window.innerWidth - 64);
}

export function useGridWidth(): number {
  const [width, setWidth] = useState(fallbackWidth);

  useLayoutEffect(() => {
    const viewport = document.querySelector<HTMLElement>(
      "[data-library-grid-viewport]",
    );
    if (!viewport) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = Math.max(0, viewport.clientWidth - GRID_PADDING);
      setWidth((current) => (current === next ? current : next));
    };
    const scheduleMeasure = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(viewport);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return width;
}
