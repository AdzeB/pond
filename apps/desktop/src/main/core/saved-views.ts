import {
  type NewSavedView,
  type SavedView,
  savedViews as savedViewsTable,
} from "@pond/schema/db";
import { EMPTY_QUERY, type Query } from "@pond/schema/filters/types";
import type { Transaction } from "@pond/schema/tx";
import { asc, eq, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { z } from "zod";
import type { Db } from "../db";
import { getDb } from "../db";
import { executeBatch, executeTransaction } from "./executor";

const StoredQuerySchema = z.custom<Query>(
  (value) => value instanceof Object && !Array.isArray(value),
);

function coerceQuery(raw: Query | null): Query {
  return StoredQuerySchema.safeParse(raw).data ?? EMPTY_QUERY;
}

export async function listViews(): Promise<SavedView[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(savedViewsTable)
    .orderBy(asc(savedViewsTable.sortOrder), asc(savedViewsTable.createdAt));
  return rows.map((row) => ({ ...row, query: coerceQuery(row.query) }));
}

interface CreateViewInput {
  name: string;
  question?: string | null;
  query?: Query;
  sortKey?: string;
  sortDir?: string;
  layout?: string | null;
}

export async function createView(
  input: CreateViewInput,
): Promise<{ ok: boolean; id?: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false };
  const db = await getDb();
  const data: NewSavedView = {
    id: ulid(),
    name,
    question: input.question ?? null,
    query: input.query ?? EMPTY_QUERY,
    sortKey: input.sortKey ?? "savedAt",
    sortDir: input.sortDir ?? "desc",
    layout: input.layout ?? null,
    sortOrder: await nextSortOrder(db),
  };
  await executeTransaction({
    kind: "create",
    model: "saved_view",
    id: data.id,
    data,
    meta: { actor: "user", actorReason: "saved-view-create" },
  });
  return { ok: true, id: data.id };
}

export async function updateView(
  id: string,
  patch: Partial<NewSavedView>,
): Promise<{ ok: boolean }> {
  const db = await getDb();
  const row = await viewById(db, id);
  if (!row) return { ok: false };
  await executeTransaction({
    kind: "update",
    model: "saved_view",
    id,
    patch,
    before: row,
    meta: { actor: "user", actorReason: "saved-view-update" },
  });
  return { ok: true };
}

export async function renameView(
  id: string,
  name: string,
): Promise<{ ok: boolean }> {
  const target = name.trim();
  if (!target) return { ok: false };
  return updateView(id, { name: target });
}

export async function deleteView(id: string): Promise<{ ok: boolean }> {
  const db = await getDb();
  const row = await viewById(db, id);
  if (!row) return { ok: false };
  await executeTransaction({
    kind: "delete",
    model: "saved_view",
    id,
    before: row,
    meta: { actor: "user", actorReason: "saved-view-delete" },
  });
  return { ok: true };
}

export async function reorderViews(
  orderedIds: string[],
): Promise<{ ok: boolean }> {
  const db = await getDb();
  const txs: Transaction[] = [];
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    if (!id) continue;
    const row = await viewById(db, id);
    if (!row || row.sortOrder === i) continue;
    txs.push({
      kind: "update",
      model: "saved_view",
      id,
      patch: { sortOrder: i },
      before: row,
      meta: { actor: "user", actorReason: "saved-view-reorder" },
    });
  }
  if (txs.length === 0) return { ok: true };
  await executeBatch(txs);
  return { ok: true };
}

async function viewById(db: Db, id: string): Promise<SavedView | undefined> {
  const rows = await db
    .select()
    .from(savedViewsTable)
    .where(eq(savedViewsTable.id, id));
  return rows[0];
}

async function nextSortOrder(db: Db): Promise<number> {
  const rows = await db
    .select({
      max: sql<number>`coalesce(max(${savedViewsTable.sortOrder}), -1)`,
    })
    .from(savedViewsTable);
  return (rows[0]?.max ?? -1) + 1;
}
