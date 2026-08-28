import { useCallback, useRef, useState } from "react";

interface ClientHeight {
  ref: (el: HTMLDivElement | null) => void;
  height: number;
}

export function useClientHeight(): ClientHeight {
  const observer = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(0);

  const ref = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) {
      setHeight(0);
      return;
    }
    const sync = () => {
      const next = el.clientHeight;
      setHeight((h) => (h === next ? h : next));
    };
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    observer.current = ro;
    sync();
  }, []);

  return { ref, height };
}
