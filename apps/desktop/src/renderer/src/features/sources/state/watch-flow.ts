import type { Source, WatchKind } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface WatchFlowState {
  source: Source | null;
  kind: WatchKind | null;
  addedId: string | null;
}

const store = new Store<WatchFlowState>({
  source: null,
  kind: null,
  addedId: null,
});

export const watchFlow = {
  pick(source: Source): void {
    store.setState((s) => ({ ...s, source, kind: null }));
  },
  pickKind(kind: WatchKind): void {
    store.setState((s) => ({ ...s, kind }));
  },
  added(id: string): void {
    store.setState((s) => ({ ...s, addedId: id }));
  },
  consumeAdded(): void {
    store.setState((s) => (s.addedId === null ? s : { ...s, addedId: null }));
  },
};

export function useWatchSource(): Source | null {
  return useSelector(store, (s) => s.source);
}

export function useWatchKind(): WatchKind | null {
  return useSelector(store, (s) => s.kind);
}

export function useWatchAdded(): string | null {
  return useSelector(store, (s) => s.addedId);
}
