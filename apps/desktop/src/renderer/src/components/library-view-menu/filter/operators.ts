import { FIELD_META } from "@pond/schema/filters/meta";
import {
  COMPARATORS_BY_TYPE,
  type ComparatorId,
  type Predicate,
} from "@pond/schema/filters/types";

const BASE_LABELS: Record<ComparatorId, string> = {
  eq: "is",
  neq: "is not",
  in: "is any of",
  nin: "is none of",
  contains: "contains",
  startsWith: "starts with",
  endsWith: "ends with",
  some: "includes any of",
  every: "includes all of",
  none: "excludes",
  lt: "less than",
  lte: "at most",
  gt: "greater than",
  gte: "at least",
  between: "between",
  exists: "is",
  empty: "is empty",
  near: "is like",
};

const DATE_LABELS: Partial<Record<ComparatorId, string>> = {
  lt: "before",
  lte: "on or before",
  gt: "after",
  gte: "on or after",
  between: "between",
};

function isMulti(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.filter((v) => v !== "" && v != null).length > 1
  );
}

export interface OperatorOption {
  operator: ComparatorId;
  label: string;
}

// The human-readable relation word for the current predicate.
export function operatorPhrase(predicate: Predicate): string {
  const type = FIELD_META[predicate.field].type;
  const { operator, value } = predicate;
  const multi = isMulti(value);

  if (type === "date") return DATE_LABELS[operator] ?? BASE_LABELS[operator];

  switch (operator) {
    case "eq":
    case "in":
      return multi ? "is any of" : "is";
    case "neq":
    case "nin":
      return multi ? "is none of" : "is not";
    default:
      return BASE_LABELS[operator];
  }
}

// Comparators offered in the operator menu. Set-like types collapse eq/in into one positive/negative choice. Returns [] when there's no meaningful choice.
export function operatorOptions(predicate: Predicate): OperatorOption[] {
  const type = FIELD_META[predicate.field].type;
  const multi = isMulti(predicate.value);

  switch (type) {
    case "enum":
      return [
        { operator: multi ? "in" : "eq", label: multi ? "is any of" : "is" },
        {
          operator: multi ? "nin" : "neq",
          label: multi ? "is none of" : "is not",
        },
      ];
    case "string":
      return [
        { operator: "eq", label: BASE_LABELS.eq },
        { operator: "neq", label: BASE_LABELS.neq },
        { operator: "contains", label: BASE_LABELS.contains },
        { operator: "startsWith", label: BASE_LABELS.startsWith },
        { operator: "endsWith", label: BASE_LABELS.endsWith },
      ];
    case "stringArray":
      return [
        { operator: "some", label: BASE_LABELS.some },
        { operator: "every", label: BASE_LABELS.every },
        { operator: "none", label: BASE_LABELS.none },
        { operator: "empty", label: BASE_LABELS.empty },
      ];
    case "number":
      return COMPARATORS_BY_TYPE.number.map((operator) => ({
        operator,
        label: BASE_LABELS[operator],
      }));
    case "date":
      return COMPARATORS_BY_TYPE.date.map((operator) => ({
        operator,
        label: DATE_LABELS[operator] ?? BASE_LABELS[operator],
      }));
    default:
      return [];
  }
}

const ARRAY_CMPS: ReadonlySet<ComparatorId> = new Set([
  "in",
  "nin",
  "some",
  "every",
  "none",
]);

// Swap comparator, coercing the value into the new shape (scalar <-> array, range) while preserving the selection.
export function changeComparator(
  predicate: Predicate,
  operator: ComparatorId,
): Predicate {
  if (operator === predicate.operator) return predicate;
  const prev = predicate.value;

  let value: unknown;
  if (operator === "empty") {
    value = null;
  } else if (operator === "between") {
    value = Array.isArray(prev) && prev.length === 2 ? prev : [null, null];
  } else if (operator === "exists") {
    value = typeof prev === "boolean" ? prev : true;
  } else if (ARRAY_CMPS.has(operator)) {
    if (Array.isArray(prev)) value = prev;
    else if (prev === "" || prev == null) value = [];
    else value = [prev];
  } else {
    value = Array.isArray(prev) ? (prev[0] ?? "") : (prev ?? "");
  }

  return { ...predicate, operator, value };
}
