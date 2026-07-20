import type { Source, WatchKind } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

/**
 * The in-flight "watch an account" hand-off between the tray's cards and the sources page.
 * @remarks Lives in a store because the picker, kind, and handle cards (dock tray) and the detail dialog (sources page) are separate trees.
 */
interface WatchFlowState {
  /** Platform picked on the first card; the kind and handle cards read it. */
  source: Source | null;
  /** What to watch on that platform, picked on the kind card; null for single-kind sources. */
  kind: WatchKind | null;
  /** Watch created by the handle card, waiting for the sources page to refetch and open its detail. */
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
