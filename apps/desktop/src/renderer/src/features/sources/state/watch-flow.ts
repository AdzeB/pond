import type { Source } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface WatchFlowState {
  addedId: string | null;
  source: Source | null;
}

const store = new Store<WatchFlowState>({
  addedId: null,
  source: null,
});

export const watchFlow = {
  start(source: Source): void {
    store.setState((s) => ({ ...s, source }));
  },
  added(id: string): void {
    store.setState((s) => ({ ...s, addedId: id }));
  },
  consumeAdded(): void {
    store.setState((s) => (s.addedId === null ? s : { ...s, addedId: null }));
  },
  clear(): void {
    store.setState((s) => (s.source === null ? s : { ...s, source: null }));
  },
};

export function useWatchAdded(): string | null {
  return useSelector(store, (s) => s.addedId);
}

export function useWatchSource(): Source | null {
  return useSelector(store, (s) => s.source);
}
