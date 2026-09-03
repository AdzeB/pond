import type { SavedView } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";

const store = new Store<{ views: SavedView[]; loaded: boolean }>({
  views: [],
  loaded: false,
});

export const savedViews = {
  snapshot(): SavedView[] {
    return store.state.views;
  },
  async refresh(): Promise<void> {
    const views = (await window.pond.query(
      "savedViews.list",
      {},
    )) as unknown as SavedView[];
    store.setState(() => ({ views: views ?? [], loaded: true }));
  },
};

export function useSavedViews(): SavedView[] {
  return useSelector(store, (s) => s.views);
}

export function useHydrateSavedViews(): void {
  useEffect(() => {
    void savedViews.refresh();
  }, []);
}
