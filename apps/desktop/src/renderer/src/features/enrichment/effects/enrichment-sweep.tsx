import { useEffect } from "react";

export function EnrichmentSweep() {
  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    void import("@/features/enrichment/lib/sweep").then(
      ({ startEnrichmentSweep }) => {
        const handle = startEnrichmentSweep();
        if (cancelled) {
          handle();
          return;
        }
        stop = handle;
      },
    );
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return null;
}
