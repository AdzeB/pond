import type { Query } from "@pond/schema/filters/types";
import { EMPTY_QUERY } from "@pond/schema/filters/types";
import type { SortDir } from "@/pool/use-filtered-saves";

// Built-in, code-defined filter presets shown as tabs before the user's saved
// filters. Each applies a fixed query + sort via `applySavedView`. Their ids
// are namespaced `quick:*` so they never collide with DB saved-view ids — and
// because they aren't in the saved-view list, editing one and pressing Save
// creates a brand-new saved filter rather than mutating the preset.
export interface QuickFilter {
  id: string;
  name: string;
  query: Query;
  sortKey: string;
  sortDir: SortDir;
}

export const QUICK_FILTERS: readonly QuickFilter[] = [
  {
    id: "quick:recently-saved",
    name: "Recently Saved",
    query: EMPTY_QUERY,
    sortKey: "savedAt",
    sortDir: "desc",
  },
  {
    id: "quick:untagged",
    name: "Untagged",
    query: {
      combinator: "and",
      rules: [{ field: "tags", operator: "empty", value: null }],
    },
    sortKey: "savedAt",
    sortDir: "desc",
  },
  {
    id: "quick:images",
    name: "Images",
    query: {
      combinator: "and",
      rules: [{ field: "type", operator: "eq", value: "image" }],
    },
    sortKey: "savedAt",
    sortDir: "desc",
  },
  {
    id: "quick:videos",
    name: "Videos",
    query: {
      combinator: "and",
      rules: [{ field: "type", operator: "eq", value: "video" }],
    },
    sortKey: "savedAt",
    sortDir: "desc",
  },
];

// The quick filter whose query + sort match the live view state, if any. Lets
// the tabs row highlight (e.g.) "Recently Saved" on a fresh load when no saved
// view is explicitly active.
export function findActiveQuickFilterId(
  query: Query,
  sortKey: string,
  sortDir: SortDir,
): string | null {
  const live = JSON.stringify(query);
  for (const qf of QUICK_FILTERS) {
    if (
      JSON.stringify(qf.query) === live &&
      qf.sortKey === sortKey &&
      qf.sortDir === sortDir
    ) {
      return qf.id;
    }
  }
  return null;
}
