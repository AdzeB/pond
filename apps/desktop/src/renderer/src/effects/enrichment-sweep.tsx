import { useEffect } from "react";

/** Single mount point for the background on-device enrichment sweep; every enricher is driven from here via the registry. */
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
