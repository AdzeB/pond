/** Queues archive_page for web saves that predate site archiving; the reconciler then crawls them one at a time. */
import { type NewTask, saves, tasks } from "@pond/schema/db";
import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { getDb } from "../../db";
import { persistSave } from "../persist-save";
import { kickReconciler } from "../pipeline/reconciler";
import { maxAttemptsFor } from "../pipeline/specs";
import {
  ARCHIVE_VERSION,
  hasWarcArchive,
  readArchivedMeta,
} from "../pipeline/workers/archive-page";

export async function startArchiveBackfill(): Promise<{
  ok: true;
  queued: number;
}> {
  const db = await getDb();
  /** Settled saves only: ingesting saves already have live tasks, and pending archive_page behind non-done peers would deadlock the sequential gate. */
  const rows = db
    .select({ id: saves.id, files: saves.files, status: saves.status })
    .from(saves)
    .where(
      and(
        eq(saves.source, "web"),
        inArray(saves.status, ["complete", "failed"]),
        isNull(saves.deletedAt),
      ),
    )
    .all();

  /** MHTML-era saves lack a WARC; WARC saves on an outdated format version also get re-crawled. */
  const candidates: { id: string; status: string }[] = [];
  for (const r of rows) {
    if (!hasWarcArchive(r.files)) {
      candidates.push({ id: r.id, status: r.status });
      continue;
    }
    const meta = await readArchivedMeta(r.id);
    if (meta.version < ARCHIVE_VERSION) {
      candidates.push({ id: r.id, status: r.status });
    }
  }

  /** Failed saves qualify only when the failure sits in archive_page/finalize (e.g. a cancelled archive); failed prior ops would block the re-pended archive forever. */
  const unarchived: { id: string }[] = [];
  for (const c of candidates) {
    if (c.status === "complete") {
      unarchived.push({ id: c.id });
      continue;
    }
    const blocked = db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.saveId, c.id),
          notInArray(tasks.op, ["archive_page", "finalize"]),
          notInArray(tasks.status, ["done"]),
        ),
      )
      .get();
    if (!blocked) unarchived.push({ id: c.id });
  }
  if (unarchived.length === 0) return { ok: true, queued: 0 };

  const withTask = new Set(
    db
      .select({ saveId: tasks.saveId })
      .from(tasks)
      .where(
        and(
          eq(tasks.op, "archive_page"),
          inArray(
            tasks.saveId,
            unarchived.map((r) => r.id),
          ),
        ),
      )
      .all()
      .map((t) => t.saveId),
  );

  const now = new Date();
  let queued = 0;
  for (const { id } of unarchived) {
    if (withTask.has(id)) {
      /** Outdated archives already carry a settled task; re-pend it so the reconciler re-crawls. */
      db.update(tasks)
        .set({
          status: "pending",
          attempts: 0,
          maxAttempts: maxAttemptsFor("archive_page"),
          lastError: null,
          nextRunAt: now,
          updatedAt: now,
        })
        .where(and(eq(tasks.saveId, id), eq(tasks.op, "archive_page")))
        .run();
    } else {
      const taskRow: NewTask = {
        id: ulid(),
        saveId: id,
        op: "archive_page",
        status: "pending",
        attempts: 0,
        maxAttempts: maxAttemptsFor("archive_page"),
        nextRunAt: now,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(tasks).values(taskRow).onConflictDoNothing().run();
    }
    /** finalize must re-run after the archive so the save settles back to complete and info.json refreshes. */
    db.update(tasks)
      .set({ status: "pending", nextRunAt: now, updatedAt: now })
      .where(and(eq(tasks.saveId, id), eq(tasks.op, "finalize")))
      .run();
    /** Via persistSave so the ingesting flip broadcasts to the renderer pool. */
    await persistSave(
      id,
      { status: "ingesting", ingestStartedAt: now, ingestCompletedAt: null },
      { actorReason: "user:archive-backfill" },
    );
    queued += 1;
  }

  log.info("[pond archive-backfill] queued web saves for archiving", {
    queued,
  });
  kickReconciler();
  return { ok: true, queued };
}

/** Queues a full-site crawl for one save; the worker re-archives because the payload scope upgrades page to site. */
export async function archiveSiteForSave(
  saveId: string,
): Promise<{ ok: boolean }> {
  const db = await getDb();
  const row = db
    .select({ id: saves.id, source: saves.source, status: saves.status })
    .from(saves)
    .where(and(eq(saves.id, saveId), isNull(saves.deletedAt)))
    .get();
  /** Only settled saves: a pending archive_page behind non-done peers would deadlock the sequential gate. */
  if (row?.source !== "web" || row.status !== "complete") {
    return { ok: false };
  }

  const now = new Date();
  const payload = { scope: "site" as const };
  const existing = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.saveId, saveId), eq(tasks.op, "archive_page")))
    .get();
  if (existing) {
    db.update(tasks)
      .set({
        status: "pending",
        attempts: 0,
        maxAttempts: maxAttemptsFor("archive_page"),
        payload,
        lastError: null,
        nextRunAt: now,
        updatedAt: now,
      })
      .where(eq(tasks.id, existing.id))
      .run();
  } else {
    const taskRow: NewTask = {
      id: ulid(),
      saveId,
      op: "archive_page",
      status: "pending",
      attempts: 0,
      maxAttempts: maxAttemptsFor("archive_page"),
      payload,
      nextRunAt: now,
      createdAt: now,
      updatedAt: now,
    };
    db.insert(tasks).values(taskRow).onConflictDoNothing().run();
  }

  /** finalize must re-run after the archive so the save settles back to complete and info.json refreshes. */
  db.update(tasks)
    .set({ status: "pending", nextRunAt: now, updatedAt: now })
    .where(and(eq(tasks.saveId, saveId), eq(tasks.op, "finalize")))
    .run();
  await persistSave(
    saveId,
    { status: "ingesting", ingestStartedAt: now, ingestCompletedAt: null },
    { actorReason: "user:archive-site" },
  );
  log.info("[pond archive-backfill] queued full-site archive", { saveId });
  kickReconciler();
  return { ok: true };
}
