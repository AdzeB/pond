import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { patchSearch } from "@/lib/navigate-path";

// URL is the source of truth; the local mirror keeps typing snappy and
// coalesces writes to one history entry every `delayMs`. Setting an
// empty string removes the param entirely.
export function useDebouncedSearch(
  key: string,
  delayMs: number,
): [string, (next: string) => void] {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const raw = search[key];
  const urlValue = typeof raw === "string" ? raw : "";
  const [value, setValue] = useState(urlValue);

  useEffect(() => {
    setValue(urlValue);
  }, [urlValue]);

  const flush = useDebouncedCallback(
    (next: string) => {
      patchSearch(
        navigate,
        (prev) => {
          const out = { ...prev };
          if (next) out[key] = next;
          else delete out[key];
          return out;
        },
        { replace: true },
      );
    },
    { wait: delayMs },
  );

  const set = useCallback(
    (next: string) => {
      setValue(next);
      flush(next);
    },
    [flush],
  );

  return [value, set];
}
