import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { sourceFlow } from "@/stores/source-flow";

interface SourceDetailState {
  accountId: string | null;
  watchId: string | null;
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
    sourceFlow.open("account-detail");
  },
  openWatch(id: string): void {
    store.setState((s) => ({ ...s, watchId: id }));
    sourceFlow.open("watch-detail");
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
