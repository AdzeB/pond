import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type DockMode =
  | "nav"
  | "search"
  | "search-help"
  | "options"
  | "layout"
  | "zoom"
  | "sort"
  | "sort-date"
  | "sort-content"
  | "sort-media"
  | "sort-file"
  | "display"
  | "connect-source"
  | "connect-help"
  | "connect-wait"
  | "watch-source"
  | "watch-help"
  | "watch-kind"
  | "watch-target"
  | "account-detail"
  | "account-profile"
  | "account-sync"
  | "account-maintenance"
  | "watch-detail"
  | "sync-frequency"
  | "source-new"
  | "confirm"
  | "selection-run"
  | "selection-tag"
  | "selection-copy"
  | "selection-export";

const store = new Store<{ mode: DockMode }>({ mode: "nav" });

export const dockMode = {
  current(): DockMode {
    return store.state.mode;
  },
  open(mode: Exclude<DockMode, "nav">): void {
    store.setState((s) => (s.mode === mode ? s : { mode }));
  },
  close(): void {
    store.setState((s) => (s.mode === "nav" ? s : { mode: "nav" }));
  },
  subscribe(fn: (mode: DockMode) => void): () => void {
    const sub = store.subscribe(() => fn(store.state.mode));
    return () => sub.unsubscribe();
  },
};

export function useDockMode(): DockMode {
  return useSelector(store, (s) => s.mode);
}
