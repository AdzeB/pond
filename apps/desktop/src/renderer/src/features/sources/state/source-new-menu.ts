import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

const store = new Store({ open: false });

export const sourceNewMenu = {
  open(): void {
    store.setState(() => ({ open: true }));
  },
  close(): void {
    store.setState(() => ({ open: false }));
  },
  setOpen(open: boolean): void {
    store.setState(() => ({ open }));
  },
};

export function useSourceNewMenuOpen(): boolean {
  return useSelector(store, (state) => state.open);
}
