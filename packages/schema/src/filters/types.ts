import type { RuleGroupType, RuleType } from "@react-querybuilder/core";

// RQB `RuleType` narrowed to our unions, plus per-rule `negate` (RQB only has group `not`).
export interface Predicate extends RuleType<FieldId, ComparatorId, unknown> {
  negate?: boolean;
}

// RQB `RuleGroupType`; UI keeps root flat but the type allows nested/or for forward-compat.
export type Group = RuleGroupType<Predicate, "and" | "or">;

export type Clause = Predicate | Group;

export type Query = Group;

export const EMPTY_QUERY: Query = { combinator: "and", rules: [] };

export function isEmptyQuery(q: Query | null | undefined): boolean {
  if (!q) return true;
  return q.rules.length === 0;
}

// RQB has no `kind` tag; a group is identified by its `rules` array.
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
  | "fileCount"
  | "duration"
  | "creator"
  | "account"
  | "note"
  | "caption"
  | "transcript"
  | "color"
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
