import { useEffect } from "react";

export function EnrichmentSweep() {
  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    void import("@/lib/enrichment/sweep").then(({ startEnrichmentSweep }) => {
      const handle = startEnrichmentSweep();
      if (cancelled) {
        handle();
        return;
      }
      stop = handle;
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return null;
}
