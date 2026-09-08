import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import {
  defaultSourceFilters,
  type SourceFilters,
} from "@/features/sources/components/page/lib/filters";

const store = new Store<SourceFilters>(defaultSourceFilters());

export const sourcesFilters = {
  snapshot(): SourceFilters {
    return store.state;
  },
  setQ(q: string): void {
    store.setState((s) => (s.q === q ? s : { ...s, q }));
  },
  reset(): void {
    store.setState((s) => (s.q === "" ? s : defaultSourceFilters()));
  },
  subscribe(fn: () => void): () => void {
    const sub = store.subscribe(fn);
    return () => sub.unsubscribe();
  },
};

export function useSourcesFilters(): SourceFilters {
  return useSelector(store, (s) => s);
}
