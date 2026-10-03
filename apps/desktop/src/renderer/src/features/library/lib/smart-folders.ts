import type { SavedView } from "@pond/schema/db";
import {
  type Clause,
  EMPTY_QUERY,
  type Query,
} from "@pond/schema/filters/types";

function flattenConjunction(clause: Clause): Clause[] {
  if ("rules" in clause && clause.combinator === "and" && !clause.not) {
    return clause.rules.flatMap(flattenConjunction);
  }
  return [clause];
}

export function combineQueries(queries: ReadonlyArray<Query>): Query {
  const active = queries.filter((query) => query.rules.length > 0);
  if (active.length === 0) return EMPTY_QUERY;
  if (active.length === 1) return active[0] ?? EMPTY_QUERY;
  return { combinator: "and", rules: active.flatMap(flattenConjunction) };
}

function ancestors(
  view: SavedView,
  views: ReadonlyArray<SavedView>,
): SavedView[] {
  const byId = new Map(views.map((entry) => [entry.id, entry]));
  const seen = new Set([view.id]);
  const result: SavedView[] = [];
  let parentId = view.parentId;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (parent?.kind !== "group") break;
    result.unshift(parent);
    parentId = parent.parentId;
  }
  return result;
}

export function inheritedQueryFor(
  view: SavedView,
  views: ReadonlyArray<SavedView>,
): Query {
  return combineQueries(ancestors(view, views).map((parent) => parent.query));
}

export function groupMoveChoices(
  viewId: string,
  views: ReadonlyArray<SavedView>,
): SavedView[] {
  return views.filter(
    (view) =>
      view.kind === "group" &&
      view.id !== viewId &&
      !ancestors(view, views).some((parent) => parent.id === viewId),
  );
}

export function selectedViewRoots(
  ids: readonly string[],
  views: readonly SavedView[],
): SavedView[] {
  const selected = new Set(ids);
  return views.filter(
    (view) =>
      selected.has(view.id) &&
      !ancestors(view, views).some((parent) => selected.has(parent.id)),
  );
}
