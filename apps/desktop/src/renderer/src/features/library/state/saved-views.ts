import type { SavedView } from "@pond/schema/db";
import { EMPTY_QUERY, type Query } from "@pond/schema/filters/types";
import type { QueryInput } from "@shared/query-contracts";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";
import {
  combineQueries,
  inheritedQueryFor,
} from "@/features/library/lib/smart-folders";
import { folders } from "@/features/library/state/folders";
import { libraryChrome } from "@/features/library/state/library-chrome";
import {
  applySavedView,
  getViewState,
  resetFilters,
  setInheritedQuery,
} from "@/features/library/state/view-store";
import { descendantFolderIds } from "@/features/saves/lib/nav-filter";

const store = new Store<{ views: SavedView[]; loaded: boolean }>({
  views: [],
  loaded: false,
});

function currentQuery(): Query {
  const { query, inheritedQuery, includeSubfolders } = getViewState();
  const { nav } = libraryChrome.getState();
  let scope = EMPTY_QUERY;
  if (nav.kind === "folder") {
    scope = {
      combinator: "and",
      rules: [
        {
          field: "folder",
          operator: "some",
          value: includeSubfolders
            ? [...descendantFolderIds(nav.id, folders.snapshot())]
            : [nav.id],
        },
      ],
    };
  } else if (nav.kind === "tag") {
    scope = {
      combinator: "and",
      rules: [{ field: "tags", operator: "some", value: [nav.name] }],
    };
  } else if (nav.kind === "uncategorized") {
    scope = {
      combinator: "and",
      rules: [{ field: "folder", operator: "empty", value: null }],
    };
  }
  return combineQueries([inheritedQuery, query, scope]);
}

export const savedViews = {
  snapshot(): SavedView[] {
    return store.state.views;
  },
  async refresh(): Promise<void> {
    const views = await window.pond.query("savedViews.list", {});
    store.setState(() => ({ views: views ?? [], loaded: true }));
    const { activeViewId } = getViewState();
    if (!activeViewId) return;
    const active = store.state.views.find((view) => view.id === activeViewId);
    if (!active) resetFilters();
    else setInheritedQuery(inheritedQueryFor(active, store.state.views));
  },
  select(id: string): void {
    const view = store.state.views.find((entry) => entry.id === id);
    if (!view) throw new Error("This smart folder item no longer exists.");
    applySavedView({
      ...view,
      inheritedQuery: inheritedQueryFor(view, store.state.views),
    });
  },
  async create(input: {
    kind: SavedView["kind"];
    parentId?: string | null;
    name: string;
    query?: Query;
  }): Promise<SavedView> {
    const { sortKey, sortDir, layout } = getViewState();
    const payload: QueryInput<"savedViews.create"> = {
      ...input,
      query: input.query ?? (input.parentId ? EMPTY_QUERY : currentQuery()),
    };
    if (input.kind === "saved_view") {
      payload.sortKey = sortKey;
      payload.sortDir = sortDir;
      payload.layout = layout;
    }
    const result = await window.pond.query("savedViews.create", payload);
    if (!result.ok || !result.id)
      throw new Error("Could not create this smart folder item.");
    await savedViews.refresh();
    const view = store.state.views.find((entry) => entry.id === result.id);
    if (!view)
      throw new Error("The new smart folder item could not be loaded.");
    savedViews.select(view.id);
    return view;
  },
  async updateCurrent(id: string): Promise<void> {
    const state = getViewState();
    const view = store.state.views.find((entry) => entry.id === id);
    if (!view || state.activeViewId !== id)
      throw new Error("Open this smart folder item before updating it.");
    const patch: QueryInput<"savedViews.update">["patch"] = {
      query: state.query,
    };
    if (view.kind === "saved_view") {
      patch.sortKey = state.sortKey;
      patch.sortDir = state.sortDir;
      patch.layout = state.layout;
    }
    const result = await window.pond.query("savedViews.update", { id, patch });
    if (!result.ok) throw new Error("Could not update this smart folder item.");
    await savedViews.refresh();
  },
  async edit(id: string, name: string, query: Query): Promise<void> {
    const active = getViewState().activeViewId === id;
    const result = await window.pond.query("savedViews.update", {
      id,
      patch: { name, query },
    });
    if (!result.ok) throw new Error("Could not save these rules.");
    await savedViews.refresh();
    if (active) savedViews.select(id);
  },
  async rename(id: string, name: string): Promise<void> {
    const result = await window.pond.query("savedViews.rename", { id, name });
    if (!result.ok) throw new Error("Could not rename this smart folder item.");
    await savedViews.refresh();
  },
  async move(id: string, parentId: string | null): Promise<void> {
    const result = await window.pond.query("savedViews.update", {
      id,
      patch: { parentId },
    });
    if (!result.ok) throw new Error("Could not move this smart folder item.");
    await savedViews.refresh();
  },
  async remove(id: string): Promise<void> {
    const result = await window.pond.query("savedViews.delete", { id });
    if (!result.ok) throw new Error("Could not delete this smart folder item.");
    await savedViews.refresh();
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
