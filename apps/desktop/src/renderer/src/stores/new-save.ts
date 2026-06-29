import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface NewSaveState {
  readonly open: boolean;
}

const store = new Store<NewSaveState>({ open: false });

export const newSave = {
  isOpen(): boolean {
    return store.state.open;
  },
  open(): void {
    store.setState((s) => (s.open ? s : { open: true }));
  },
  set(open: boolean): void {
    store.setState((s) => (s.open === open ? s : { open }));
  },
};

export function useNewSaveOpen(): boolean {
  return useSelector(store, (s) => s.open);
}
