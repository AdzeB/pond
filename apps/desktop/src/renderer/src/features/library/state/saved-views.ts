import type { SavedView } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";
import {
  applySavedView,
  getViewState,
} from "@/features/library/state/view-store";
import { prompt } from "@/shared/components/prompt-dialog/prompt-dialog";

const store = new Store<{ views: SavedView[]; loaded: boolean }>({
  views: [],
  loaded: false,
});

export const savedViews = {
  snapshot(): SavedView[] {
    return store.state.views;
  },
  async refresh(): Promise<void> {
    const views = await window.pond.query("savedViews.list", {});
    store.setState(() => ({ views: views ?? [], loaded: true }));
  },
};

export function promptCreateView(): void {
  const { query, sortKey, sortDir, layout } = getViewState();
  prompt({
    title: "Save View",
    confirmLabel: "Save",
    initialValue: "Untitled View",
    onConfirm: async (name) => {
      const result = await window.pond.query("savedViews.create", {
        name,
        query,
        sortKey,
        sortDir,
        layout,
      });
      await savedViews.refresh();
      const view = savedViews
        .snapshot()
        .find((entry) => entry.id === result.id);
      if (view) applySavedView(view);
    },
  });
}

export function useSavedViews(): SavedView[] {
  return useSelector(store, (s) => s.views);
}

export function useHydrateSavedViews(): void {
  useEffect(() => {
    void savedViews.refresh();
  }, []);
}
