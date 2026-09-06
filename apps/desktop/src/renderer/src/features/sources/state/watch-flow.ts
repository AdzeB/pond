import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface WatchFlowState {
  addedId: string | null;
}

const store = new Store<WatchFlowState>({
  addedId: null,
});

export const watchFlow = {
  added(id: string): void {
    store.setState((s) => ({ ...s, addedId: id }));
  },
  consumeAdded(): void {
    store.setState((s) => (s.addedId === null ? s : { ...s, addedId: null }));
  },
};

export function useWatchAdded(): string | null {
  return useSelector(store, (s) => s.addedId);
}
