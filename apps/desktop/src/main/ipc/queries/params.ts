import { SOURCES } from "@pond/schema/db";
import { FIELD_DESCRIPTORS } from "@pond/schema/filters/fields";
import { COMPARATORS_BY_TYPE, type Query } from "@pond/schema/filters/types";
import type { IpcMainInvokeEvent } from "electron";
import { z } from "zod";

/** One structured-clone object per query; the schema a query registers with decides what its own fields mean. */
const QueryParamsSchema = z.looseObject({}).catch({});

export type QueryParams = z.infer<typeof QueryParamsSchema>;

export function query<Schema extends z.ZodType, Result>(
  schema: Schema,
  run: (params: z.infer<Schema>, event?: IpcMainInvokeEvent) => Result,
) {
  return (raw?: QueryParams, event?: IpcMainInvokeEvent): Result =>
    run(schema.parse(QueryParamsSchema.parse(raw)), event);
}

export type QueryHandlerMap = Record<string, ReturnType<typeof query>>;

/** `String(x ?? "")` */
export const StringParam = z.coerce
  .string()
  .nullish()
  .transform((value) => value ?? "");

/** `x != null ? String(x) : null` */
export const NullableStringParam = z.coerce
  .string()
  .nullish()
  .transform((value) => value ?? null);

/** `Number(x)`; the catch restores the NaN `z.coerce.number()` rejects. */
export const NumberParam = z.coerce.number().catch(Number.NaN);

/** `Number(x)` for present params, absent otherwise, for the `x != null` and `x || fallback` guards. */
export const OptionalNumberParam = z.coerce
  .number()
  .nullish()
  .catch(Number.NaN);

/** `Number.isFinite(Number(x ?? 0)) ? Number(x ?? 0) : 0` */
export const FileIndexParam = OptionalNumberParam.transform((value) =>
  value != null && Number.isFinite(value) ? value : 0,
);

/** `x ? String(x) : null` */
export const NonEmptyTextParam = z
  .string()
  .min(1)
  .nullish()
  .catch(null)
  .transform((value) => value ?? null);

/** `typeof x === "string" && x.trim() ? x.trim() : null` */
export const TrimmedTextParam = z
  .string()
  .nullish()
  .catch(null)
  .transform((value) => value?.trim() || null);

/** A known source id, or null where the old `as Source` cast let an unknown string fall through to a rejecting check. */
export const SourceParam = z.enum(SOURCES).nullable().catch(null);

/** `Boolean(x)` */
export const FlagParam = z.coerce.boolean();

/** `Array.isArray(x) ? x.map(String) : []` */
export const StringListParam = z.array(z.coerce.string()).catch([]);

const FIELD_IDS = new Set<string>(Object.keys(FIELD_DESCRIPTORS));
const COMPARATOR_IDS = new Set<string>(
  Object.values(COMPARATORS_BY_TYPE).flat(),
);

const ClauseSchema: z.ZodType = z.union([
  z.looseObject({
    field: z.string().refine((id) => FIELD_IDS.has(id)),
    operator: z.string().refine((id) => COMPARATOR_IDS.has(id)),
  }),
  z.lazy(() => GroupSchema),
]);

const GroupSchema: z.ZodType = z.looseObject({
  combinator: z.enum(["and", "or"]),
  rules: z.array(ClauseSchema),
});

/** The renderer owns `Query`; check the parts `buildWhere` walks, then hand the value on untouched. */
export const QueryParam = z
  .custom<Query>((value) => GroupSchema.safeParse(value).success)
  .nullable()
  .catch(null);
