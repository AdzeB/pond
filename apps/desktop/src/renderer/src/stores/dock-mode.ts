import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

// The mutually exclusive surface the user has explicitly opened on the dock
// pill; "nav" is the resting state. This is only the user-driven half of the
// pill's state — the rendered DockView also accounts for the selection and
// ask stores, which take priority (see library-dock/index.tsx).
//
// Lives in a store (not component state) so surfaces outside the dock — e.g.
// the application menu — can open a view without threading callbacks.
export type DockMode = "nav" | "ask" | "search" | "new" | "options";

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
  // For module-level listeners; components should use useDockMode instead.
  subscribe(fn: (mode: DockMode) => void): () => void {
    const sub = store.subscribe(() => fn(store.state.mode));
    return () => sub.unsubscribe();
  },
};

export function useDockMode(): DockMode {
  return useSelector(store, (s) => s.mode);
}
