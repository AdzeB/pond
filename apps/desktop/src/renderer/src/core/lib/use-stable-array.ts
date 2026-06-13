import { useRef } from "react";

// Reuse the previous array reference when length and id sequence match, so a field-only update doesn't invalidate downstream memos.
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
