import type { Source } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

/**
 * The in-flight "watch an account" hand-off between the tray's two cards and the sources page.
 * @remarks Lives in a store because the picker and handle cards (dock tray) and the detail dialog (sources page) are separate trees.
 */
interface WatchFlowState {
  /** Platform picked on the first card; the handle card reads it. */
  source: Source | null;
  /** Watch created by the handle card, waiting for the sources page to refetch and open its detail. */
  addedId: string | null;
}

const store = new Store<WatchFlowState>({ source: null, addedId: null });

export const watchFlow = {
  pick(source: Source): void {
    store.setState((s) => ({ ...s, source }));
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

export function useWatchAdded(): string | null {
  return useSelector(store, (s) => s.addedId);
}
