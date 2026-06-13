import type { RuleGroupType, RuleType } from "@react-querybuilder/core";

// A single filter rule. Structurally an react-querybuilder `RuleType`, narrowed
// to our `FieldId`/`ComparatorId` unions, plus an optional per-rule `negate`
// (react-querybuilder only models group-level `not`; we carry per-rule negation
// through our own SQL/match processors).
export interface Predicate extends RuleType<FieldId, ComparatorId, unknown> {
  negate?: boolean;
}

// A group of clauses. Structurally an react-querybuilder `RuleGroupType`. The UI
// keeps the root flat (one predicate per field, AND-only), but the type permits
// nested groups and "or" so the model stays forward-compatible with RQB.
export type Group = RuleGroupType<Predicate, "and" | "or">;

export type Clause = Predicate | Group;

export type Query = Group;

export const EMPTY_QUERY: Query = { combinator: "and", rules: [] };

export function isEmptyQuery(q: Query | null | undefined): boolean {
  if (!q) return true;
  return q.rules.length === 0;
}

// Runtime discriminators between predicates and groups (RQB has no `kind` tag;
// a group is identified by its `rules` array / `combinator`).
export function isGroup(clause: Clause): clause is Group {
  return "rules" in clause;
}

export function isPredicate(clause: Clause): clause is Predicate {
  return !("rules" in clause);
}

export type FieldTypeId =
  | "string"
  | "stringArray"
  | "enum"
  | "number"
  | "boolean"
  | "date"
  | "optional"
  | "color";

export type ComparatorId =
  | "eq"
  | "neq"
  | "in"
  | "nin"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "between"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "some"
  | "every"
  | "none"
  | "exists"
  | "empty"
  | "near";

export const COMPARATORS_BY_TYPE: Record<FieldTypeId, readonly ComparatorId[]> =
  {
    string: ["eq", "neq", "in", "nin", "contains", "startsWith", "endsWith"],
    stringArray: ["some", "every", "none", "empty"],
    enum: ["eq", "neq", "in", "nin"],
    number: ["eq", "neq", "lt", "lte", "gt", "gte", "between"],
    boolean: ["eq"],
    date: ["lt", "lte", "gt", "gte", "between"],
    optional: ["exists"],
    color: ["near"],
  };

export type FieldId =
  | "tags"
  | "source"
  | "type"
  | "duration"
  | "creator"
  | "note"
  | "color"
  | "sensitivity"
  | "savedAt"
  | "publishedAt"
  | "modifiedAt";

export interface FieldMeta {
  id: FieldId;
  type: FieldTypeId;
  label: string;
  group: "content" | "media" | "time" | "people";
  presets?: ReadonlyArray<{ id: string; label: string; value: unknown }>;
}
