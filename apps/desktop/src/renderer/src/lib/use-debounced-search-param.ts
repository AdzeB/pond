import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

// URL is the source of truth; the local mirror keeps typing snappy and
// coalesces writes to one history entry every `delayMs`. Setting an
// empty string removes the param entirely.
export function useDebouncedSearchParam(
  key: string,
  delayMs: number,
): [string, (next: string) => void] {
  const [params, setParams] = useSearchParams();
  const urlValue = params.get(key) ?? "";
  const [value, setValue] = useState(urlValue);

  useEffect(() => {
    setValue(urlValue);
  }, [urlValue]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const set = useCallback(
    (next: string) => {
      setValue(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setParams(
          (prev) => {
            const p = new URLSearchParams(prev);
            if (next) p.set(key, next);
            else p.delete(key);
            return p;
          },
          { replace: true },
        );
      }, delayMs);
    },
    [key, delayMs, setParams],
  );

  return [value, set];
}
