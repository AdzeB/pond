import { FIELD_META } from "@pond/schema/filters/meta";
import {
  COMPARATORS_BY_TYPE,
  type ComparatorId,
  type FieldId,
  type Predicate,
} from "@pond/schema/filters/types";

export function defaultPredicateFor(field: FieldId): Predicate {
  const meta = FIELD_META[field];
  const operator = (COMPARATORS_BY_TYPE[meta.type][0] ?? "eq") as ComparatorId;
  return {
    field,
    operator,
    value: emptyValueFor(operator),
  };
}

function emptyValueFor(operator: ComparatorId): unknown {
  switch (operator) {
    case "in":
    case "nin":
    case "some":
    case "every":
    case "none":
      return [];
    case "between":
      return [0, 0];
    case "exists":
      return true;
    default:
      return "";
  }
}

export function predicateIsActive(p: Predicate): boolean {
  if (p.operator === "exists" || p.operator === "empty") return true;
  const v = p.value;
  if (v == null) return false;
  if (Array.isArray(v)) {
    return v.some((x) => x !== "" && x !== 0 && x != null);
  }
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "object") {
    const hex = (v as { hex?: unknown }).hex;
    return typeof hex === "string" && hex.length > 0;
  }
  return true;
}
