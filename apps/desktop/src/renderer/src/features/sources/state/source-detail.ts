import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { detailsDialog } from "@/features/library";

interface SourceDetailState {
  revision: number;
}

const store = new Store<SourceDetailState>({
  revision: 0,
});

export const sourceDetail = {
  openAccount(id: string): void {
    detailsDialog.openSource("account", id);
  },
  openWatch(id: string): void {
    detailsDialog.openSource("watch", id);
  },
  openFolder(path: string): void {
    detailsDialog.openSource("folder", path);
  },
  close(): void {
    if (detailsDialog.getState()?.kind === "source") detailsDialog.close();
  },
  changed(): void {
    store.setState((s) => ({ revision: s.revision + 1 }));
  },
};

export function useSourceDetailRevision(): number {
  return useSelector(store, (s) => s.revision);
}
