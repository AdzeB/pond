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

// --- Legacy (pre-react-querybuilder) query shape ---------------------------
// The old model tagged nodes with `kind` and nested under `clauses`, with the
// comparator stored as `cmp`. Persisted saved views and old URL payloads may
// still carry this shape, so we convert it to the RQB model at read time.

interface LegacyPredicate {
  kind: "p";
  field: FieldId;
  cmp: ComparatorId;
  value: unknown;
  negate?: boolean;
}

interface LegacyGroup {
  kind: "and" | "or";
  clauses: LegacyClause[];
}

type LegacyClause = LegacyPredicate | LegacyGroup;

export function isLegacyQuery(q: unknown): q is LegacyGroup {
  return (
    typeof q === "object" &&
    q !== null &&
    "kind" in q &&
    "clauses" in q &&
    Array.isArray((q as { clauses: unknown }).clauses)
  );
}

function legacyClauseToClause(c: LegacyClause): Clause {
  if (c.kind === "p") {
    const p: Predicate = { field: c.field, operator: c.cmp, value: c.value };
    if (c.negate) p.negate = true;
    return p;
  }
  return { combinator: c.kind, rules: c.clauses.map(legacyClauseToClause) };
}

export function legacyToRuleGroup(old: LegacyGroup): Query {
  const top = legacyClauseToClause(old);
  return isGroup(top) ? top : { combinator: "and", rules: [top] };
}

function clauseToLegacyClause(c: Clause): LegacyClause {
  if (isGroup(c)) {
    const combinator = c.combinator === "or" ? "or" : "and";
    return { kind: combinator, clauses: c.rules.map(clauseToLegacyClause) };
  }
  const p: LegacyPredicate = {
    kind: "p",
    field: c.field,
    cmp: c.operator,
    value: c.value,
  };
  if (c.negate) p.negate = true;
  return p;
}

export function ruleGroupToLegacy(group: Query): LegacyGroup {
  const legacy = clauseToLegacyClause(group);
  return "clauses" in legacy ? legacy : { kind: "and", clauses: [legacy] };
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
  | "shape"
  | "size"
  | "duration"
  | "dimensions"
  | "creator"
  | "note"
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
