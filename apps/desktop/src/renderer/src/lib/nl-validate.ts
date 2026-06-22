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
import { predicateIsActive } from "./filter-helpers";

// Stage D: the safety gate. Whatever a model (bundled, Ollama, or a user's own
// endpoint) returns is untrusted, so we re-validate every predicate against the
// real field schema and drop anything that doesn't fit. A model literally cannot
// inject an unknown field, an operator that field doesn't support, or a
// malformed value. Invalid pieces are pruned; the rest survives.

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
  // `empty` carries no value; normalize so predicateIsActive accepts it.
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

// Sanitize an untrusted model result into a valid Query. Accepts either a full
// group, a bare array of predicates, or junk; always returns a usable Query.
export function validateQuery(raw: unknown): Query {
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
