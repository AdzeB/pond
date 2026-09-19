import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function useResultsHeight<LayoutKey>(
  open: boolean,
  layoutKey: LayoutKey,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [sized, setSized] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      setHeight(null);
      setSized(false);
      return;
    }

    void layoutKey;
    if (!content) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const cap = Number.parseFloat(getComputedStyle(viewport).maxHeight);
      const next = Math.min(
        content.offsetHeight,
        Number.isFinite(cap) ? cap : content.offsetHeight,
      );
      if (next <= 0) return;
      setHeight((current) => (current === next ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [content, layoutKey, open]);

  useEffect(() => {
    if (!open || height == null) return;
    const id = requestAnimationFrame(() => setSized(true));
    return () => cancelAnimationFrame(id);
  }, [open, height]);

  return { viewportRef, contentRef: setContent, height, sized };
}
