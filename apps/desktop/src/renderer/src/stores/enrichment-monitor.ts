import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export interface EnrichmentStatus {
  paused: boolean;
  // On-device enricher runs currently executing.
  inflight: number;
}

const store = new Store<EnrichmentStatus>({ paused: false, inflight: 0 });

export const enrichmentMonitor = {
  set(patch: Partial<EnrichmentStatus>): void {
    store.setState((s) => ({ ...s, ...patch }));
  },
};

export function useEnrichmentStatus(): EnrichmentStatus {
  return useSelector(store, (s) => s);
}
