import { SOURCES, saves } from "@pond/schema/db";
import type { JsonValue } from "@pond/schema/json";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";
import { getDb } from "../db";

const ItemGetParamsSchema = z
  .object({
    limit: z.union([z.string(), z.number()]).optional().catch(undefined),
    offset: z.union([z.string(), z.number()]).optional().catch(undefined),
    includeDeleted: z
      .union([z.string(), z.boolean()])
      .optional()
      .catch(undefined),
    ids: z
      .union([z.array(z.coerce.string()), z.string()])
      .optional()
      .catch(undefined),
    source: z.string().optional().catch(undefined),
  })
  .catch({});

async function readParams(c: Context): Promise<JsonValue> {
  if (c.req.method !== "POST") {
    return Object.fromEntries(new URL(c.req.url).searchParams.entries());
  }
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

export async function itemGetHandler(c: Context) {
  const params = ItemGetParamsSchema.parse(await readParams(c));

  const db = await getDb();
  const limit = Math.min(Number(params.limit ?? 200), 1000);
  const offset = Math.max(Number(params.offset ?? 0), 0);
  const includeDeleted =
    params.includeDeleted === "true" || params.includeDeleted === true;

  const filters = [];
  if (!includeDeleted) filters.push(isNull(saves.deletedAt));

  const ids = Array.isArray(params.ids)
    ? params.ids
    : (params.ids?.split(",").filter(Boolean) ?? []);
  if (ids.length > 0) filters.push(inArray(saves.id, ids));

  if (params.source) {
    const source = SOURCES.find((s) => s === params.source);
    filters.push(source ? eq(saves.source, source) : sql`0`);
  }

  const rows = await db
    .select()
    .from(saves)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(saves.savedAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    status: "success",
    data: rows,
    meta: { limit, offset, count: rows.length, hasMore: rows.length === limit },
  });
}
