import { SOURCES, saves } from "@pond/schema/db";
import type { JsonValue } from "@pond/schema/json";
import { LocalApiSavesGetParamsSchema } from "@pond/schema/local-api";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Context } from "hono";
import { getDb } from "../db";

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

export async function savesGetHandler(c: Context) {
  const params = LocalApiSavesGetParamsSchema.parse(await readParams(c));

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
