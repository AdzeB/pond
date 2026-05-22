import type { Transition } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export const drawerSpring: Transition = {
  type: "spring",
  duration: 0.4,
  bounce: 0.15,
};

/* Refcounted "anything in the chrome is mid-animation" flag. Sidebar
 * and inspector ping `start` on `onAnimationStart` and `end` on
 * `onAnimationComplete`; consumers like the masonry packers read
 * `useIsAnimating()` to freeze expensive layout work for the duration. */
const active = new Set<string>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const cb of listeners) cb();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): boolean {
  return active.size > 0;
}

export const animationSignal = {
  start(id: string): void {
    const wasActive = active.size > 0;
    active.add(id);
    if (!wasActive) emit();
  },
  end(id: string): void {
    if (!active.has(id)) return;
    active.delete(id);
    if (active.size === 0) emit();
  },
};

export function useIsAnimating(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useAnimationSignal(id: string): {
  start: () => void;
  end: () => void;
} {
  const start = useCallback(() => animationSignal.start(id), [id]);
  const end = useCallback(() => animationSignal.end(id), [id]);
  useEffect(() => () => animationSignal.end(id), [id]);
  return { start, end };
}

/* Holds `value` steady while `frozen` is true. When `frozen` flips
 * back to false, snaps to the latest `value`. Used by masonry packers
 * to skip re-packing during the sidebar/inspector slide — Motion's
 * `layout` prop then FLIPs cards from the held positions to the new
 * pack in a single transition. */
export function useFrozenValue<T>(value: T, frozen: boolean): T {
  const [held, setHeld] = useState(value);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!frozen) {
      setHeld((prev) =>
        Object.is(prev, valueRef.current) ? prev : valueRef.current,
      );
    }
  }, [frozen]);

  return frozen ? held : value;
}
