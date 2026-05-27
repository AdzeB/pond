import { useRef } from "react";

// Reuses the previous array reference when the new array has the same
// length and id sequence. Stops downstream `useMemo` / `useCallback`s
// from invalidating just because the upstream pool produced a fresh
// array on a field-only update.
export function useStableById<T extends { id: string }>(
  next: ReadonlyArray<T>,
): ReadonlyArray<T> {
  const ref = useRef<ReadonlyArray<T>>(next);
  const prev = ref.current;
  if (prev.length === next.length) {
    let same = true;
    for (let i = 0; i < next.length; i++) {
      const a = prev[i];
      const b = next[i];
      if (!a || !b || a.id !== b.id) {
        same = false;
        break;
      }
    }
    if (same) return prev;
  }
  ref.current = next;
  return next;
}

export function useStableStrings(
  next: ReadonlyArray<string>,
): ReadonlyArray<string> {
  const ref = useRef<ReadonlyArray<string>>(next);
  const prev = ref.current;
  if (prev.length === next.length) {
    let same = true;
    for (let i = 0; i < next.length; i++) {
      if (prev[i] !== next[i]) {
        same = false;
        break;
      }
    }
    if (same) return prev;
  }
  ref.current = next;
  return next;
}
