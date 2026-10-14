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

function boxesBy<K extends string>(
  keys: readonly K[],
  box: (key: K) => Box,
): Record<K, Box> {
  /** SAFETY: the entries cover every key in `keys`, which is all of `K`. */
  return Object.fromEntries(keys.map((key) => [key, box(key)])) as Record<
    K,
    Box
  >;
}

/** Each target's box in `root`'s own unscaled pixels, so camera and rise transforms cancel out. */
export function useBoxes<K extends string>(
  root: RefObject<HTMLElement | null>,
  targets: Record<K, RefObject<Element | null>>,
): Record<K, Box> {
  /** SAFETY: `targets` is keyed by exactly `K`. */
  const keys = Object.keys(targets) as K[];
  const empty = boxesBy(keys, () => EMPTY);
  return useLayout(() => {
    const el = root.current;
    if (!el) return empty;
    const a = el.getBoundingClientRect();
    const unscale = el.offsetWidth / (a.width || 1);
    return boxesBy(keys, (key) => {
      const b = targets[key].current?.getBoundingClientRect();
      if (!b) return EMPTY;
      return {
        x: (b.x - a.x) * unscale,
        y: (b.y - a.y) * unscale,
        width: b.width * unscale,
        height: b.height * unscale,
      };
    });
  }, empty);
}
