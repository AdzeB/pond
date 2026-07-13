import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface EnrichmentStatus {
  /** On-device enricher runs currently executing. */
  inflight: number;
  /** Keys (`${enricher.id}:${save.id}`) currently running, so a save's detail view can show which of its enrichments are working. */
  activeKeys: ReadonlySet<string>;
  /** Keys that failed this session; retried after a restart/upgrade or an explicit user retry. */
  failedKeys: ReadonlySet<string>;
}

const store = new Store<EnrichmentStatus>({
  inflight: 0,
  activeKeys: new Set<string>(),
  failedKeys: new Set<string>(),
});

export const enrichmentMonitor = {
  set(patch: Partial<EnrichmentStatus>): void {
    store.setState((s) => ({ ...s, ...patch }));
  },
};

export function useEnrichmentStatus(): EnrichmentStatus {
  return useSelector(store, (s) => s);
}
