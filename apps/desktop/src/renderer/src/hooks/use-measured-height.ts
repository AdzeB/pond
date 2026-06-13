import { useState } from "react";
import { useResizeObserverRef } from "rooks";

// Measure natural height so only the wrapper morphs while rows snap to final layout.
export function useMeasuredHeight<
  T extends HTMLElement = HTMLElement,
>(): readonly [(node: T | null) => void, number | "auto"] {
  const [height, setHeight] = useState<number | "auto">("auto");
  const [ref] = useResizeObserverRef((entries) => {
    const el = entries[0]?.target as T | undefined;
    if (el) setHeight(el.offsetHeight);
  });
  return [ref, height] as const;
}
