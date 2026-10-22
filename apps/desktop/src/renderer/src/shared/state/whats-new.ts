import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface WhatsNewState {
  open: boolean;
  /** Versions to show; null shows every bundled entry. */
  versions: readonly string[] | null;
}

const store = new Store<WhatsNewState>({ open: false, versions: null });

export const whatsNewDialog = {
  open(versions: readonly string[] | null = null): void {
    store.setState(() => ({ open: true, versions }));
  },
  close(): void {
    store.setState((s) => (s.open ? { ...s, open: false } : s));
  },
};

export function useWhatsNewDialog(): WhatsNewState {
  return useSelector(store, (s) => s);
}
