import {
  type NewTag,
  saves as savesTable,
  tags as tagsTable,
} from "@pond/schema/db";
import { labelKey, normalizeLabelName } from "@pond/schema/label-name";
import type { Transaction } from "@pond/schema/tx";
import { eq, sql } from "drizzle-orm";
import { ulid } from "ulid";
import type { Db } from "../db";
import { getDb } from "../db";
import { executeBatch, executeTransaction } from "./executor";

export interface CreateTagInput {
  name: string;
}

async function tagByLowerName(db: Db, lowered: string) {
  const rows = await db
    .select()
    .from(tagsTable)
    .where(sql`lower(${tagsTable.name}) = ${lowered}`);
  return rows[0];
}

// Candidate saves whose tag list mentions `lowerKey`, fetching only id + tags
// (never the heavy raw_json) instead of scanning the whole table into JS. The
// tags column is a JSON array of quoted strings, so matching the quoted,
// lowercased token avoids substring false positives ("foo" won't match
// "foobar"); callers still verify each hit in JS before rewriting.
async function savesWithTag(
  db: Db,
  lowerKey: string,
): Promise<Array<{ id: string; tags: string[] | null }>> {
  const needle = `%"${lowerKey}"%`;
  return db
    .select({ id: savesTable.id, tags: savesTable.tags })
    .from(savesTable)
    .where(sql`lower(${savesTable.tags}) LIKE ${needle}`);
}

export async function listTags() {
  const db = await getDb();
  return await db.select().from(tagsTable);
}

export async function createTag(
  input: CreateTagInput,
): Promise<{ ok: boolean }> {
  const name = normalizeLabelName(input.name);
  if (!name) return { ok: false };
  const data: NewTag = {
    id: ulid(),
    name,
    usageCount: 0,
  };
  await executeTransaction({
    kind: "create",
    model: "tag",
    id: data.id,
    data,
    meta: { actor: "user", actorReason: "tag-create" },
  });
  return { ok: true };
}

export async function renameTag(
  from: string,
  to: string,
): Promise<{ ok: boolean; affected: number }> {
  const fromKey = labelKey(from);
  const toStored = normalizeLabelName(to);
  const toKey = toStored.toLowerCase();
  if (!fromKey || !toStored) {
    return { ok: false, affected: 0 };
  }
  const db = await getDb();
  const fromCanon = await tagByLowerName(db, fromKey);

  // Only merge when canonical keys differ; same-key renames just restyle casing.
  if (fromKey !== toKey) {
    const toCanon = await tagByLowerName(db, toKey);
    if (fromCanon && toCanon && fromCanon.id !== toCanon.id) {
      return mergeTags(from, to);
    }
  }

  const all = await savesWithTag(db, fromKey);
  const txs: Transaction[] = [];
  for (const row of all) {
    const current = (row.tags ?? []).slice();
    const idx = current.findIndex((t) => t.toLowerCase() === fromKey);
    if (idx === -1) continue;
    const collidesWithExistingTarget =
      fromKey !== toKey && current.some((t) => t.toLowerCase() === toKey);
    if (collidesWithExistingTarget) {
      current.splice(idx, 1);
    } else {
      if (current[idx] === toStored) continue;
      current[idx] = toStored;
    }
    txs.push({
      kind: "update",
      model: "save",
      id: row.id,
      patch: { tags: current },
      before: { tags: row.tags ?? undefined },
      meta: { actor: "user", actorReason: "tag-rename" },
    });
  }

  if (fromCanon && fromCanon.name !== toStored) {
    txs.push({
      kind: "update",
      model: "tag",
      id: fromCanon.id,
      patch: { name: toStored },
      before: fromCanon,
      meta: { actor: "user", actorReason: "tag-rename" },
    });
  }

  if (txs.length === 0) return { ok: true, affected: 0 };
  await executeBatch(txs);
  return { ok: true, affected: txs.length };
}

export async function mergeTags(
  from: string,
  to: string,
): Promise<{ ok: boolean; affected: number }> {
  const fromKey = labelKey(from);
  const toStored = normalizeLabelName(to);
  const toKey = toStored.toLowerCase();
  if (!fromKey || !toStored || fromKey === toKey) {
    return { ok: false, affected: 0 };
  }

  const db = await getDb();
  const fromRow = await tagByLowerName(db, fromKey);
  const toRow = await tagByLowerName(db, toKey);

  const all = await savesWithTag(db, fromKey);
  const txs: Transaction[] = [];
  for (const row of all) {
    const current = (row.tags ?? []).slice();
    const idx = current.findIndex((t) => t.toLowerCase() === fromKey);
    if (idx === -1) continue;
    if (current.some((t) => t.toLowerCase() === toKey)) {
      current.splice(idx, 1);
    } else {
      current[idx] = toStored;
    }
    txs.push({
      kind: "update",
      model: "save",
      id: row.id,
      patch: { tags: current },
      before: { tags: row.tags ?? undefined },
      meta: { actor: "user", actorReason: "tag-merge" },
    });
  }

  if (fromRow && toRow && fromRow.id !== toRow.id) {
    txs.push({
      kind: "delete",
      model: "tag",
      id: fromRow.id,
      before: fromRow,
      meta: { actor: "user", actorReason: "tag-merge" },
    });
  } else if (fromRow && !toRow) {
    txs.push({
      kind: "update",
      model: "tag",
      id: fromRow.id,
      patch: { name: toStored },
      before: fromRow,
      meta: { actor: "user", actorReason: "tag-merge" },
    });
  }

  if (txs.length === 0) return { ok: true, affected: 0 };
  await executeBatch(txs);
  return { ok: true, affected: txs.length };
}

export interface TagPatch {
  archived?: boolean;
  starred?: boolean;
}

// Restyle a single tag (archive / star). Name changes go through renameTag
// because they have to rewrite every save's tag list.
export async function updateTag(
  name: string,
  patch: TagPatch,
): Promise<{ ok: boolean }> {
  const key = labelKey(name) || name.trim().toLowerCase();
  const db = await getDb();
  const row = await tagByLowerName(db, key);
  if (!row) return { ok: false };

  const next: TagPatch = {};
  if ("archived" in patch) next.archived = Boolean(patch.archived);
  if ("starred" in patch) next.starred = Boolean(patch.starred);
  if (Object.keys(next).length === 0) return { ok: true };

  await executeTransaction({
    kind: "update",
    model: "tag",
    id: row.id,
    patch: next,
    before: row,
    meta: { actor: "user", actorReason: "tag-update" },
  });
  return { ok: true };
}

export async function deleteTag(name: string): Promise<{
  ok: boolean;
  affected: number;
}> {
  const key = labelKey(name) || name.trim().toLowerCase();
  const db = await getDb();
  const all = await savesWithTag(db, key);
  const txs: Transaction[] = [];
  for (const row of all) {
    const current = (row.tags ?? []).filter((t) => t.toLowerCase() !== key);
    if (current.length === (row.tags?.length ?? 0)) continue;
    txs.push({
      kind: "update",
      model: "save",
      id: row.id,
      patch: { tags: current },
      before: { tags: row.tags ?? undefined },
      meta: { actor: "user", actorReason: "tag-delete" },
    });
  }
  const tagRow = await tagByLowerName(db, key);
  if (tagRow) {
    txs.push({
      kind: "delete",
      model: "tag",
      id: tagRow.id,
      before: tagRow,
      meta: { actor: "user", actorReason: "tag-delete" },
    });
  }
  if (txs.length === 0) return { ok: true, affected: 0 };
  await executeBatch(txs);
  return { ok: true, affected: txs.length };
}

function normalizeTagList(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const n = normalizeLabelName(raw);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

export async function setSaveTags(
  saveId: string,
  next: string[],
): Promise<{ ok: boolean }> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(savesTable)
    .where(eq(savesTable.id, saveId));
  const row = rows[0];
  if (!row) return { ok: false };
  const normalized = normalizeTagList(next);
  await executeTransaction({
    kind: "update",
    model: "save",
    id: saveId,
    patch: { tags: normalized },
    before: { tags: row.tags },
    meta: { actor: "user", actorReason: "save-tags-set" },
  });
  for (const name of normalized) {
    const existing = await tagByLowerName(db, name.toLowerCase());
    if (existing) continue;
    const id = ulid();
    try {
      await executeTransaction({
        kind: "create",
        model: "tag",
        id,
        data: { id, name, usageCount: 0 },
        meta: { actor: "system", actorReason: "tag-autocreate" },
      });
    } catch {
      /* race-safe; another concurrent write may have just created it */
    }
  }
  if (normalized.length > 0) {
    await bumpLastUsedAt(normalized).catch(() => {
      /* best-effort; failing to bump shouldn't fail the tag write */
    });
  }
  return { ok: true };
}

async function bumpLastUsedAt(names: string[]): Promise<void> {
  if (names.length === 0) return;
  const db = await getDb();
  const now = new Date();
  for (const raw of names) {
    const key = labelKey(raw);
    if (!key) continue;
    const row = await tagByLowerName(db, key);
    if (!row) continue;
    await executeTransaction(
      {
        kind: "update",
        model: "tag",
        id: row.id,
        patch: { lastUsedAt: now },
        before: { lastUsedAt: row.lastUsedAt },
        meta: { actor: "system", actorReason: "tag-bump-last-used" },
      },
      // Silent: don't broadcast a syncAction storm for a passive bump.
      { silent: true },
    );
  }
}
