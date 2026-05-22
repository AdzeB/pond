import {
  libraryScan,
  type SaveFile,
  saves,
  syncActions,
} from "@pond/schema/db";
import { eq } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../db";
import { scanLibrary } from "../lib/library";
import { broadcastSyncAction } from "./executor";

export async function reconcileLibrary(): Promise<{
  updated: number;
  total: number;
}> {
  const db = await getDb();
  let updated = 0;
  let total = 0;

  for await (const { id, mtimeMs, metadata } of scanLibrary()) {
    total++;
    const existing = await db
      .select()
      .from(libraryScan)
      .where(eq(libraryScan.itemId, id));

    if (existing[0] && existing[0].mtimeMs === mtimeMs) continue;
    if (!metadata) {
      // Stamp the scan row anyway so we don't re-read this file every
      // tick when its metadata is missing or unreadable.
      await stampScan(db, id, mtimeMs);
      continue;
    }

    if (!metadata.source || !metadata.sourceId || !metadata.url) {
      log.warn("[pond scan] skipping item with incomplete metadata", {
        id,
        hasSource: Boolean(metadata.source),
        hasSourceId: Boolean(metadata.sourceId),
        hasUrl: Boolean(metadata.url),
      });
      await stampScan(db, id, mtimeMs);
      continue;
    }

    const files: SaveFile[] = (metadata.files ?? []).map((f) => ({
      kind: f.kind,
      path: f.path,
      sha256: f.sha256,
      size: f.size,
    }));
    const tags = metadata.tags ?? [];

    try {
      const insertValues: typeof saves.$inferInsert = {
        id,
        source:
          metadata.source as unknown as (typeof saves.$inferInsert)["source"],
        sourceId: metadata.sourceId,
        url: metadata.url,
        title: metadata.name,
        description: metadata.pond.description ?? null,
        author: metadata.pond.author ?? null,
        notes: metadata.annotation || null,
        mediaUrl: null,
        mediaType:
          (metadata.pond.mediaType as
            | (typeof saves.$inferInsert)["mediaType"]
            | null
            | undefined) ?? null,
        rawJson: metadata.pond.rawSource ?? null,
        tags,
        files,
        coverIndex: metadata.pond.coverIndex ?? 0,
        width: metadata.width,
        height: metadata.height,
        fileSize: metadata.size,
        deletedAt: metadata.isDeleted ? new Date(metadata.mtime) : null,
        savedAt: new Date(metadata.importedAt),
        createdAt: new Date(metadata.btime),
      };
      const updateSet = {
        title: metadata.name,
        description: metadata.pond.description ?? null,
        author: metadata.pond.author ?? null,
        notes: metadata.annotation || null,
        tags,
        files,
        width: metadata.width,
        height: metadata.height,
        fileSize: metadata.size,
      };

      // Check row presence first so we know whether to emit an `I` or
      // `U` action. One extra select per save isn't free, but it's
      // dwarfed by the metadata read; this lets the renderer pool
      // reconcile without a full re-hydrate after a rescan.
      const prior = await db
        .select({ id: saves.id })
        .from(saves)
        .where(eq(saves.id, id));
      const wasInsert = prior.length === 0;

      await db
        .insert(saves)
        .values(insertValues)
        .onConflictDoUpdate({ target: saves.id, set: updateSet })
        .run();

      const inserted = db
        .insert(syncActions)
        .values({
          modelName: "save",
          modelId: id,
          action: wasInsert ? "I" : "U",
          data: (wasInsert
            ? insertValues
            : updateSet) as unknown as (typeof syncActions.$inferInsert)["data"],
          actor: "system",
          actorReason: "library-scan",
        })
        .returning()
        .all()[0];
      if (inserted) broadcastSyncAction(inserted);

      await stampScan(db, id, mtimeMs);
      updated++;
    } catch (err) {
      // One bad row shouldn't abort the whole reconciliation. Log and
      // keep going; stamp the scan row so we don't retry it forever.
      log.warn("[pond scan] upsert failed", { id, err });
      await stampScan(db, id, mtimeMs);
    }
  }

  log.info(`[pond scan] updated=${updated} total=${total}`);
  return { updated, total };
}

async function stampScan(
  db: Awaited<ReturnType<typeof getDb>>,
  itemId: string,
  mtimeMs: number,
): Promise<void> {
  await db
    .insert(libraryScan)
    .values({ itemId, mtimeMs })
    .onConflictDoUpdate({
      target: libraryScan.itemId,
      set: { mtimeMs, scannedAt: new Date() },
    })
    .run();
}
