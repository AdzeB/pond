import { parseQueryPlan, type QueryPlan } from "@pond/schema";
import { FIELD_META } from "@pond/schema/filters/meta";
import {
  type Clause,
  COMPARATORS_BY_TYPE,
  type ComparatorId,
  EMPTY_QUERY,
  type FieldId,
  type Predicate,
  type Query,
} from "@pond/schema/filters/types";
import { predicateIsActive } from "@/lib/search/filter-helpers";

/** Stage D: re-validate every model predicate against the real field schema so unknown fields, operators, or values cannot sneak in. */

function isFieldId(value: unknown): value is FieldId {
  return typeof value === "string" && value in FIELD_META;
}

function arrayOfPrimitives(value: unknown): (string | number)[] | null {
  if (!Array.isArray(value)) return null;
  const out: (string | number)[] = [];
  for (const v of value) {
    if (typeof v === "string" || typeof v === "number") out.push(v);
    else return null;
  }
  return out;
}

function valueOkForOperator(operator: ComparatorId, value: unknown): boolean {
  switch (operator) {
    case "in":
    case "nin":
    case "some":
    case "every":
    case "none":
      return arrayOfPrimitives(value) != null;
    case "between":
      return Array.isArray(value) && value.length === 2;
    case "exists":
      return typeof value === "boolean";
    case "empty":
      return true;
    default:
      return typeof value === "string" || typeof value === "number";
  }
}

function validatePredicate(raw: unknown): Predicate | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const field = obj.field;
  const operator = obj.operator;
  if (!isFieldId(field) || typeof operator !== "string") return null;

  const allowed = COMPARATORS_BY_TYPE[FIELD_META[field].type];
  if (!(allowed as readonly string[]).includes(operator)) return null;
  const op = operator as ComparatorId;

  let value = obj.value;
  /** `empty` carries no value; normalize so predicateIsActive accepts it. */
  if (op === "empty") value = true;
  if (!valueOkForOperator(op, value)) return null;

  const predicate: Predicate = {
    field,
    operator: op,
    value,
    ...(obj.negate === true ? { negate: true } : {}),
  };
  return predicateIsActive(predicate) ? predicate : null;
}

function validateClause(raw: unknown): Clause | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.rules)) {
    const combinator = obj.combinator === "or" ? "or" : "and";
    const rules = obj.rules
      .map(validateClause)
      .filter((c): c is Clause => c != null);
    if (rules.length === 0) return null;
    return { combinator, rules, ...(obj.not === true ? { not: true } : {}) };
  }
  return validatePredicate(raw);
}

/** Accepts a full group, a bare array of predicates, or junk; always returns a usable Query. */
function validateQuery(raw: unknown): Query {
  if (!raw) return EMPTY_QUERY;

  if (Array.isArray(raw)) {
    const rules = raw.map(validateClause).filter((c): c is Clause => c != null);
    return { combinator: "and", rules };
  }

  const clause = validateClause(raw);
  if (!clause) return EMPTY_QUERY;
  if ("rules" in clause) return clause as Query;
  return { combinator: "and", rules: [clause] };
}

/** A model-emitted plan gets its filter validated and its numeric bounds clamped so the executor is never handed a runaway per-group/limit; structurally invalid plans degrade to filter-only. */

const MAX_PER_GROUP = 50;
const MAX_GROUPS = 100;
const MAX_LIMIT = 1000;

function clampInt(n: number, lo: number, hi: number): number {
  const x = Math.floor(n);
  if (!Number.isFinite(x)) return lo;
  return Math.min(hi, Math.max(lo, x));
}

export function validatePlan(raw: unknown): QueryPlan {
  const parsed = parseQueryPlan(raw);
  const filterRaw =
    parsed?.filter ??
    (raw && typeof raw === "object"
      ? (raw as Record<string, unknown>).filter
      : undefined);
  const filter = validateQuery(filterRaw);
  if (!parsed) return { filter };

  const plan: QueryPlan = { filter };
  if (parsed.rank) plan.rank = parsed.rank;
  if (parsed.group) {
    plan.group = {
      by: parsed.group.by,
      ...(parsed.group.bucket ? { bucket: parsed.group.bucket } : {}),
      ...(parsed.group.perGroup != null
        ? { perGroup: clampInt(parsed.group.perGroup, 1, MAX_PER_GROUP) }
        : {}),
      ...(parsed.group.interleave != null
        ? { interleave: parsed.group.interleave }
        : {}),
      ...(parsed.group.maxGroups != null
        ? { maxGroups: clampInt(parsed.group.maxGroups, 1, MAX_GROUPS) }
        : {}),
    };
  }
  if (parsed.limit != null) plan.limit = clampInt(parsed.limit, 1, MAX_LIMIT);
  if (parsed.aggregate) {
    plan.aggregate = {
      ...(parsed.aggregate.count != null
        ? { count: parsed.aggregate.count }
        : {}),
      ...(parsed.aggregate.countBy
        ? { countBy: parsed.aggregate.countBy }
        : {}),
    };
  }
  return plan;
}
