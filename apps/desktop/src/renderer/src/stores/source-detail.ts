import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { dockMode } from "@/stores/dock-mode";

/**
 * Which account/watch the tray's detail card shows.
 * @remarks Lives in a store because the tiles (sources page) and the detail card (dock tray) are separate trees; visibility belongs to dockMode, so stale ids after close are harmless.
 */
interface SourceDetailState {
  accountId: string | null;
  watchId: string | null;
  /** Bumped after an edit inside the card so the sources page refetches its own list copies. */
  revision: number;
}

const store = new Store<SourceDetailState>({
  accountId: null,
  watchId: null,
  revision: 0,
});

export const sourceDetail = {
  openAccount(id: string): void {
    store.setState((s) => ({ ...s, accountId: id }));
    dockMode.open("account-detail");
  },
  openWatch(id: string): void {
    store.setState((s) => ({ ...s, watchId: id }));
    dockMode.open("watch-detail");
  },
  changed(): void {
    store.setState((s) => ({ ...s, revision: s.revision + 1 }));
  },
};

export function useDetailAccountId(): string | null {
  return useSelector(store, (s) => s.accountId);
}

export function useDetailWatchId(): string | null {
  return useSelector(store, (s) => s.watchId);
}

export function useSourceDetailRevision(): number {
  return useSelector(store, (s) => s.revision);
}
