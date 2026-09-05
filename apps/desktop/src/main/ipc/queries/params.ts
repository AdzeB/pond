import { SOURCES } from "@pond/schema/db";
import { FIELD_DESCRIPTORS } from "@pond/schema/filters/fields";
import { COMPARATORS_BY_TYPE, type Query } from "@pond/schema/filters/types";
import type { IpcMainInvokeEvent } from "electron";
import { z } from "zod";
import type { QueryName, QueryResult } from "../../../shared/query-contracts";

const QueryParamsSchema = z.looseObject({}).catch({});

export type QueryParams = z.infer<typeof QueryParamsSchema>;

export function query<Schema extends z.ZodType, Result>(
  schema: Schema,
  run: (params: z.infer<Schema>, event?: IpcMainInvokeEvent) => Result,
) {
  return (raw?: QueryParams, event?: IpcMainInvokeEvent): Result =>
    run(schema.parse(QueryParamsSchema.parse(raw)), event);
}

export type QueryHandlerMap = Partial<{
  [Name in QueryName]: (
    raw?: QueryParams,
    event?: IpcMainInvokeEvent,
  ) => QueryResult<Name> | Promise<QueryResult<Name>>;
}>;

export const StringParam = z.coerce
  .string()
  .nullish()
  .transform((value) => value ?? "");

export const NullableStringParam = z.coerce
  .string()
  .nullish()
  .transform((value) => value ?? null);

export const NumberParam = z.coerce.number().catch(Number.NaN);

export const OptionalNumberParam = z.coerce
  .number()
  .nullish()
  .catch(Number.NaN);

export const FileIndexParam = OptionalNumberParam.transform((value) =>
  value != null && Number.isFinite(value) ? value : 0,
);

export const NonEmptyTextParam = z
  .string()
  .min(1)
  .nullish()
  .catch(null)
  .transform((value) => value ?? null);

export const TrimmedTextParam = z
  .string()
  .nullish()
  .catch(null)
  .transform((value) => value?.trim() || null);

export const SourceParam = z.enum(SOURCES).nullable().catch(null);

export const FlagParam = z.coerce.boolean();

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

export const QueryParam = z
  .custom<Query>((value) => GroupSchema.safeParse(value).success)
  .nullable()
  .catch(null);
