import type { Query } from "@pond/schema/filters/types";
import { EMPTY_QUERY } from "@pond/schema/filters/types";
import type { SortDir } from "@/pool/use-filtered-saves";

export interface QuickFilter {
  id: string;
  name: string;
  query: Query;
  sortKey: string;
  sortDir: SortDir;
}

export const QUICK_FILTERS: readonly QuickFilter[] = [
  {
    id: "quick:all-saves",
    name: "All Saves",
    query: EMPTY_QUERY,
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
