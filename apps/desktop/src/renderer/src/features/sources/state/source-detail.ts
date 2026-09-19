import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { libraryChrome } from "@/features/library/state/library-chrome";

interface SourceDetailState {
  revision: number;
}

const store = new Store<SourceDetailState>({
  revision: 0,
});

export const sourceDetail = {
  openAccount(id: string): void {
    libraryChrome.inspectSource("account", id);
  },
  openWatch(id: string): void {
    libraryChrome.inspectSource("watch", id);
  },
  close(): void {
    libraryChrome.clearSourceInspector();
  },
  changed(): void {
    store.setState((s) => ({ revision: s.revision + 1 }));
  },
};

export function useSourceDetailRevision(): number {
  return useSelector(store, (s) => s.revision);
}
