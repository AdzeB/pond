import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useCallback, useEffect, useState } from "react";
import {
  setSearchText,
  useSearchText,
} from "@/features/library/stores/view-store";

// The view store is the source of truth; the local mirror keeps typing
// snappy and coalesces writes to one store update every `delayMs`.
export function useDebouncedSearch(
  delayMs: number,
): [string, (next: string) => void] {
  const stored = useSearchText();
  const [value, setValue] = useState(stored);

  useEffect(() => {
    setValue(stored);
  }, [stored]);

  const flush = useDebouncedCallback((next: string) => setSearchText(next), {
    wait: delayMs,
  });

  const set = useCallback(
    (next: string) => {
      setValue(next);
      flush(next);
    },
    [flush],
  );

  return [value, set];
}
