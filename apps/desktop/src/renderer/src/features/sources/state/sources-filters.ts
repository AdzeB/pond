import type { Source } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import {
  defaultSourceFilters,
  KIND_OPTIONS,
  SOURCE_OPTIONS,
  type SourceFilters,
  type SourceKind,
  type SourceStatusId,
  STATUS_OPTIONS,
} from "@/features/sources/components/page/lib/filters";
import { toggleInSet } from "@/shared/lib/set";

const store = new Store<SourceFilters>(defaultSourceFilters());

function toggleLimited<T extends string>(
  current: ReadonlySet<T>,
  id: T,
  on: boolean,
  total: number,
): ReadonlySet<T> {
  const next = toggleInSet(current, id, on);
  if (next.size >= total) return current.size === 0 ? current : new Set();
  return next;
}

export const sourcesFilters = {
  snapshot(): SourceFilters {
    return store.state;
  },
  setQ(q: string): void {
    store.setState((s) => (s.q === q ? s : { ...s, q }));
  },
  toggleStatus(id: SourceStatusId, on: boolean): void {
    store.setState((s) => {
      const statuses = toggleLimited(s.statuses, id, on, STATUS_OPTIONS.length);
      return statuses === s.statuses ? s : { ...s, statuses };
    });
  },
  toggleSource(id: Source, on: boolean): void {
    store.setState((s) => {
      const sources = toggleLimited(s.sources, id, on, SOURCE_OPTIONS.length);
      return sources === s.sources ? s : { ...s, sources };
    });
  },
  toggleKind(id: SourceKind, on: boolean): void {
    store.setState((s) => {
      const kinds = toggleLimited(s.kinds, id, on, KIND_OPTIONS.length);
      return kinds === s.kinds ? s : { ...s, kinds };
    });
  },
  reset(): void {
    store.setState((s) =>
      s.q === "" &&
      s.statuses.size === 0 &&
      s.sources.size === 0 &&
      s.kinds.size === 0
        ? s
        : defaultSourceFilters(),
    );
  },
  subscribe(fn: () => void): () => void {
    const sub = store.subscribe(fn);
    return () => sub.unsubscribe();
  },
};

export function useSourcesFilters(): SourceFilters {
  return useSelector(store, (s) => s);
}
