import type { Save, SyncAction, Tag } from "@pond/schema/db";
import {
  folders as foldersTable,
  savedViews as savedViewsTable,
  saves as savesTable,
  syncActions as syncActionsTable,
  tagGroupMembers as tagGroupMembersTable,
  tagGroups as tagGroupsTable,
  tags as tagsTable,
} from "@pond/schema/db";
import type { SyncActionPayload, Transaction, TxMeta } from "@pond/schema/tx";
import { and, eq } from "drizzle-orm";
import { BrowserWindow } from "electron";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { IPC } from "../../shared/constants";
import { getDb } from "../db";
import { toWireSyncAction } from "../ipc/wire";
import {
  applyItemPatch,
  removeItem,
  setItemDeleted,
  writeItemFiles,
} from "../lib/library";
import { withRawSlim } from "../lib/raw-slim";
import { isTagModel, scheduleTagsDump } from "./tags-bundle";

interface ExecuteOptions {
  silent?: boolean;
}

type TagRow = Tag;

function dataForSyncAction(tx: Transaction): SyncActionPayload {
  if ("data" in tx) return tx.data;
  if ("patch" in tx) return tx.patch;
  switch (tx.kind) {
    case "trash":
      return { deletedAt: new Date() };
    case "untrash":
      return { deletedAt: null };
    default:
      return null;
  }
}

function toActionKind(tx: Transaction): "I" | "U" | "D" | "A" {
  switch (tx.kind) {
    case "create":
      return "I";
    case "update":
      return "U";
    case "delete":
    case "purge":
      return "D";
    case "trash":
    case "untrash":
      return "A";
  }
}

function resolveActor(meta: TxMeta | undefined) {
  return {
    actor: meta?.actor ?? "user",
    reason: meta?.actorReason ?? null,
  };
}

const SYNC_ACTIONS_RING = 5000;
let writesSinceTrim = 0;

export async function executeTransaction(
  tx: Transaction,
  opts: ExecuteOptions = {},
): Promise<SyncAction> {
  const db = await getDb();
  const raw = db.$raw;
  const batchId = tx.meta?.batchId ?? null;

  await applyToDisk(tx);

  const action = raw.transaction(() => {
    applyToIndex(db, tx);
    const inserted = db
      .insert(syncActionsTable)
      .values({
        batchId,
        modelName: tx.model,
        modelId: tx.id,
        action: toActionKind(tx),
        data: dataForSyncAction(tx),
        prevData: "before" in tx ? tx.before : null,
        actor: resolveActor(tx.meta).actor,
        actorReason: resolveActor(tx.meta).reason,
      })
      .returning()
      .all()[0];
    if (!inserted) throw new Error("sync_actions insert returned no row");
    return inserted;
  })();

  if (isTagModel(tx.model)) scheduleTagsDump();

  writesSinceTrim += 1;
  if (writesSinceTrim >= 500) {
    writesSinceTrim = 0;
    try {
      raw
        .prepare(
          `DELETE FROM sync_actions WHERE actor != 'agent' AND id <= (
             SELECT id FROM sync_actions WHERE actor != 'agent' ORDER BY id DESC LIMIT 1 OFFSET ?
           )`,
        )
        .run(SYNC_ACTIONS_RING);
    } catch (err) {
      log.warn("[pond executor] sync_actions trim failed", err);
    }
  }

  if (!opts.silent && !tx.meta?.silent) {
    broadcastSyncAction(action);
  }
  return action;
}

export async function executeBatch(
  txs: Transaction[],
  opts: ExecuteOptions = {},
): Promise<SyncAction[]> {
  if (txs.length === 0) return [];
  const batchId = ulid();
  const db = await getDb();
  const raw = db.$raw;

  const withBatch = txs.map((tx) => ({
    ...tx,
    meta: { ...tx.meta, batchId },
  }));

  /** File writes happen outside the transaction; better-sqlite3 cannot await mid-transaction. */
  for (const tx of withBatch) {
    await applyToDisk(tx);
  }

  const actions = raw.transaction(() => {
    const out: SyncAction[] = [];
    for (const tx of withBatch) {
      applyToIndex(db, tx);
      const inserted = db
        .insert(syncActionsTable)
        .values({
          batchId,
          modelName: tx.model,
          modelId: tx.id,
          action: toActionKind(tx),
          data: dataForSyncAction(tx),
          prevData: "before" in tx ? tx.before : null,
          actor: resolveActor(tx.meta).actor,
          actorReason: resolveActor(tx.meta).reason,
        })
        .returning()
        .all()[0];
      if (!inserted) throw new Error("sync_actions insert returned no row");
      out.push(inserted);
    }
    return out;
  })();

  if (withBatch.some((tx) => isTagModel(tx.model))) scheduleTagsDump();

  writesSinceTrim += actions.length;
  if (writesSinceTrim >= 500) {
    writesSinceTrim = 0;
    try {
      raw
        .prepare(
          `DELETE FROM sync_actions WHERE actor != 'agent' AND id <= (
             SELECT id FROM sync_actions WHERE actor != 'agent' ORDER BY id DESC LIMIT 1 OFFSET ?
           )`,
        )
        .run(SYNC_ACTIONS_RING);
    } catch (err) {
      log.warn("[pond executor] sync_actions trim failed", err);
    }
  }

  if (!opts.silent) {
    for (let i = 0; i < actions.length; i += 1) {
      const action = actions[i];
      if (action && !withBatch[i]?.meta?.silent) broadcastSyncAction(action);
    }
  }
  return actions;
}

async function applyToDisk(tx: Transaction): Promise<void> {
  if (tx.model !== "save") return;
  switch (tx.kind) {
    case "create": {
      // SAFETY: a create carries the full row it is inserting; `NewSave` only differs by
      // the columns the DB defaults, none of which `writeItemFiles` reads.
      await writeItemFiles(tx.id, tx.data as Save, tx.files ?? []);
      return;
    }
    case "update": {
      // SAFETY: `Partial<NewSave>` and `Partial<Save>` differ only in the timestamp columns'
      // nullability, and `applyItemPatch` writes them straight back out.
      const patched = await applyItemPatch(
        tx.id,
        (tx.patch ?? {}) as Partial<Save>,
        tx.files ?? [],
      );
      if (patched) return;

      if (tx.files && tx.files.length > 0) {
        const db = await getDb();
        const rows = await db
          .select()
          .from(savesTable)
          .where(eq(savesTable.id, tx.id));
        const current = rows[0];
        if (!current) {
          log.warn(
            "[pond executor] update for unknown item (no DB row either)",
            tx.id,
          );
          return;
        }
        // SAFETY: `current` is a full row from the DB; the patch only narrows its columns.
        const merged = { ...current, ...tx.patch } as Save;
        log.info(
          "[pond executor] healing orphan: rebuilding items dir",
          tx.id,
          tx.files.map((f) => f.filename),
        );
        await writeItemFiles(tx.id, merged, tx.files);
        return;
      }
      log.warn("[pond executor] update for unknown item", tx.id);
      return;
    }
    case "delete":
    case "purge":
      await removeItem(tx.id);
      return;
    case "trash":
      await setItemDeleted(tx.id, new Date());
      return;
    case "untrash":
      await setItemDeleted(tx.id, null);
      return;
  }
}

function applyToIndex(
  db: Awaited<ReturnType<typeof getDb>>,
  tx: Transaction,
): void {
  if (tx.model === "save") {
    switch (tx.kind) {
      case "create": {
        const values = withRawSlim(tx.data);
        db.insert(savesTable)
          .values(values)
          .onConflictDoUpdate({
            target: [savesTable.source, savesTable.sourceId],
            set: values,
          })
          .run();
        return;
      }
      case "update":
        db.update(savesTable)
          .set(withRawSlim(tx.patch))
          .where(eq(savesTable.id, tx.id))
          .run();
        return;
      case "delete":
      case "purge":
        db.delete(savesTable).where(eq(savesTable.id, tx.id)).run();
        return;
      case "trash":
        db.update(savesTable)
          .set({ deletedAt: new Date() })
          .where(eq(savesTable.id, tx.id))
          .run();
        return;
      case "untrash":
        db.update(savesTable)
          .set({ deletedAt: null })
          .where(eq(savesTable.id, tx.id))
          .run();
        return;
    }
  }
  if (tx.model === "tag") {
    switch (tx.kind) {
      case "create":
        db.insert(tagsTable).values(tx.data).onConflictDoNothing().run();
        return;
      case "update":
        db.update(tagsTable).set(tx.patch).where(eq(tagsTable.id, tx.id)).run();
        return;
      case "delete":
        db.delete(tagsTable).where(eq(tagsTable.id, tx.id)).run();
        return;
    }
  }
  if (tx.model === "tag_group") {
    switch (tx.kind) {
      case "create":
        db.insert(tagGroupsTable).values(tx.data).onConflictDoNothing().run();
        return;
      case "update":
        db.update(tagGroupsTable)
          .set(tx.patch)
          .where(eq(tagGroupsTable.id, tx.id))
          .run();
        return;
      case "delete":
        db.delete(tagGroupsTable).where(eq(tagGroupsTable.id, tx.id)).run();
        return;
    }
  }
  if (tx.model === "tag_group_member") {
    switch (tx.kind) {
      case "create":
        db.insert(tagGroupMembersTable)
          .values(tx.data)
          .onConflictDoNothing()
          .run();
        return;
      case "delete":
        db.delete(tagGroupMembersTable)
          .where(
            and(
              eq(tagGroupMembersTable.tagId, tx.before.tagId),
              eq(tagGroupMembersTable.groupId, tx.before.groupId),
            ),
          )
          .run();
        return;
    }
  }
  if (tx.model === "saved_view") {
    switch (tx.kind) {
      case "create":
        db.insert(savedViewsTable).values(tx.data).onConflictDoNothing().run();
        return;
      case "update":
        db.update(savedViewsTable)
          .set(tx.patch)
          .where(eq(savedViewsTable.id, tx.id))
          .run();
        return;
      case "delete":
        db.delete(savedViewsTable).where(eq(savedViewsTable.id, tx.id)).run();
        return;
    }
  }
  if (tx.model === "folder") {
    switch (tx.kind) {
      case "create":
        db.insert(foldersTable).values(tx.data).onConflictDoNothing().run();
        return;
      case "update":
        db.update(foldersTable)
          .set(tx.patch)
          .where(eq(foldersTable.id, tx.id))
          .run();
        return;
      case "delete":
        db.delete(foldersTable).where(eq(foldersTable.id, tx.id)).run();
        return;
    }
  }
}

type SyncActionListener = (action: SyncAction) => void;
const syncActionListeners = new Set<SyncActionListener>();

export function registerSyncActionListener(fn: SyncActionListener): () => void {
  syncActionListeners.add(fn);
  return () => syncActionListeners.delete(fn);
}

export function broadcastSyncAction(action: SyncAction): void {
  const wire = toWireSyncAction(action);
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.syncAction, wire);
    }
  }
  for (const fn of syncActionListeners) {
    try {
      fn(action);
    } catch (err) {
      log.warn("[pond executor] sync listener threw", err);
    }
  }
}

void ((): TagRow[] => []);
