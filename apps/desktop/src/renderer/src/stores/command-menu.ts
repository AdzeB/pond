import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

const store = new Store({ open: false });

export const commandMenu = {
  open(): void {
    store.setState(() => ({ open: true }));
  },
  close(): void {
    store.setState(() => ({ open: false }));
  },
  toggle(): void {
    store.setState((state) => ({ open: !state.open }));
  },
};

export function useCommandMenuOpen(): boolean {
  return useSelector(store, (state) => state.open);
}
