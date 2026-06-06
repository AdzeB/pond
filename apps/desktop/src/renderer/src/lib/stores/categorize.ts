import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface CategorizeState {
  readonly open: boolean;
  readonly ids: ReadonlyArray<string>;
}

const CLOSED: CategorizeState = { open: false, ids: [] };

const store = new Store<CategorizeState>(CLOSED);

export const categorize = {
  get(): CategorizeState {
    return store.state;
  },
  open(ids: ReadonlyArray<string>): void {
    if (ids.length === 0) return;
    store.setState(() => ({ open: true, ids: [...ids] }));
  },
  close(): void {
    store.setState((s) => (s.open ? CLOSED : s));
  },
};

export function useCategorize(): CategorizeState {
  return useStore(store, (s) => s);
}
