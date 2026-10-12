import type { RefObject } from "react";
import { useLayout } from "../stage/layout";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const EMPTY: Box = { x: 0, y: 0, width: 0, height: 0 };

export const center = (box: Box) => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

/** Each target's box in `root`'s own unscaled pixels, so camera and rise transforms cancel out. */
export function useBoxes<K extends string>(
  root: RefObject<HTMLElement | null>,
  targets: Record<K, RefObject<Element | null>>,
): Record<K, Box> {
  const keys = Object.keys(targets) as K[];
  const empty = Object.fromEntries(keys.map((key) => [key, EMPTY])) as Record<
    K,
    Box
  >;
  return useLayout(() => {
    const el = root.current;
    if (!el) return empty;
    const a = el.getBoundingClientRect();
    const unscale = el.offsetWidth / (a.width || 1);
    return Object.fromEntries(
      keys.map((key) => {
        const b = targets[key].current?.getBoundingClientRect();
        if (!b) return [key, EMPTY];
        return [
          key,
          {
            x: (b.x - a.x) * unscale,
            y: (b.y - a.y) * unscale,
            width: b.width * unscale,
            height: b.height * unscale,
          },
        ];
      }),
    ) as Record<K, Box>;
  }, empty);
}
