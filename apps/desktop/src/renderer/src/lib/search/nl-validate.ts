import type { QueryPlan } from "@pond/schema";
import { readColorMatch } from "@pond/schema/filters/color";
import { FIELD_META } from "@pond/schema/filters/meta";
import {
  type Clause,
  COMPARATORS_BY_TYPE,
  type ComparatorId,
  EMPTY_QUERY,
  type FieldId,
  type Group,
  isGroup,
  type Predicate,
  type PredicateValue,
  type Query,
} from "@pond/schema/filters/types";
import { z } from "zod";
import { predicateIsActive } from "@/lib/search/filter-helpers";

interface RawPredicate {
  field: string;
  operator: string;
  value?: unknown;
  negate?: boolean;
}

interface RawGroup {
  combinator?: "and" | "or";
  rules: (RawClause | null)[];
  not?: boolean;
}

type RawClause = RawGroup | RawPredicate;

const RawClauseSchema: z.ZodType<RawClause> = z.lazy(() =>
  z.union([RawGroupSchema, RawPredicateSchema]),
);

const RawGroupSchema = z.object({
  combinator: z.enum(["and", "or"]).optional().catch(undefined),
  rules: z.array(RawClauseSchema.nullable().catch(null)),
  not: z.boolean().optional().catch(undefined),
});

const RawPredicateSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.unknown().optional(),
  negate: z.boolean().optional().catch(undefined),
});

const RawFilterSchema = z
  .union([z.array(RawClauseSchema.nullable().catch(null)), RawClauseSchema])
  .nullable()
  .catch(null);

type RawFilter = z.infer<typeof RawFilterSchema>;

const PrimitiveSchema = z.union([z.string(), z.number()]);

function valueSchemaFor(operator: ComparatorId): z.ZodType<PredicateValue> {
  switch (operator) {
    case "near":
      return z.unknown().transform((value, context) => {
        const color = readColorMatch(value);
        if (color) return color;
        context.addIssue({ code: "custom", message: "Invalid color match" });
        return z.NEVER;
      });
    case "in":
    case "nin":
    case "some":
    case "every":
    case "none":
      return z.array(PrimitiveSchema);
    case "between":
      return z.tuple([PrimitiveSchema, PrimitiveSchema]);
    case "exists":
      return z.boolean();
    case "empty":
      return z.literal(true);
    default:
      return PrimitiveSchema;
  }
}

function isFieldId(field: string): field is FieldId {
  return field in FIELD_META;
}

function validatePredicate(raw: RawPredicate): Predicate | null {
  if (!isFieldId(raw.field)) return null;

  const allowed = COMPARATORS_BY_TYPE[FIELD_META[raw.field].type];
  const op = allowed.find((comparator) => comparator === raw.operator);
  if (!op) return null;

  const value = valueSchemaFor(op).safeParse(op === "empty" ? true : raw.value);
  if (!value.success) return null;

  const predicate: Predicate = {
    field: raw.field,
    operator: op,
    value: value.data,
  };
  if (raw.negate) predicate.negate = true;
  return predicateIsActive(predicate) ? predicate : null;
}

function validateClause(raw: RawClause): Clause | null {
  if (!("rules" in raw)) return validatePredicate(raw);
  const rules = validateClauses(raw.rules);
  if (rules.length === 0) return null;
  const group: Group = { combinator: raw.combinator ?? "and", rules };
  if (raw.not) group.not = true;
  return group;
}

function validateClauses(raw: (RawClause | null)[]): Clause[] {
  const out: Clause[] = [];
  for (const entry of raw) {
    const clause = entry === null ? null : validateClause(entry);
    if (clause) out.push(clause);
  }
  return out;
}

function validateQuery(raw: RawFilter): Query {
  if (!raw) return EMPTY_QUERY;
  if (Array.isArray(raw)) {
    return { combinator: "and", rules: validateClauses(raw) };
  }
  const clause = validateClause(raw);
  if (!clause) return EMPTY_QUERY;
  if (isGroup(clause)) return clause;
  return { combinator: "and", rules: [clause] };
}

export const RawPlanSchema = z
  .object({ filter: RawFilterSchema })
  .catch({ filter: null });

export function validatePlan(plan: z.infer<typeof RawPlanSchema>): QueryPlan {
  return { filter: validateQuery(plan.filter) };
}
