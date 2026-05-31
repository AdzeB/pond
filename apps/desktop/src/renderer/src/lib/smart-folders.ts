import type { SmartFolder } from "@pond/schema/db";
import type { Query } from "@pond/schema/filters/types";
import { writeQuery } from "@pond/schema/filters/url";
import { ulid } from "ulid";
import { paramsToSearch } from "./search-schemas";

export function sortFolders(items: ReadonlyArray<SmartFolder>): SmartFolder[] {
  return [...items].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

export function makeSmartFolder(
  name: string,
  query: Query,
  existing: ReadonlyArray<SmartFolder>,
): SmartFolder {
  const maxOrder = existing.reduce((m, f) => Math.max(m, f.sortOrder), 0);
  return {
    id: ulid(),
    name: name.trim(),
    query,
    icon: null,
    pinned: false,
    sortOrder: maxOrder + 1,
  };
}

// Search object to navigate to when applying a folder. Mirrors tagFilterSearch.
export function smartFolderSearch(
  folder: SmartFolder,
): Record<string, string | string[]> {
  const params = writeQuery(new URLSearchParams(), folder.query);
  return paramsToSearch(params);
}

// Stable structural comparison for "which folder is active" highlighting.
export function queryEquals(a: Query | null, b: Query | null): boolean {
  return canonical(a) === canonical(b);
}

function canonical(q: Query | null): string {
  if (!q) return "";
  const clauses = [...q.clauses].map((c) => JSON.stringify(c)).sort();
  return JSON.stringify({ kind: q.kind, clauses });
}
