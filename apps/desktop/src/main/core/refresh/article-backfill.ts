import { type NewTask, saves, tasks } from "@pond/schema/db";
import { ARTICLE_KIND } from "@shared/save-file-names";
import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { z } from "zod";
import { getDb } from "../../db";
import { persistSave } from "../persist-save";
import { kickReconciler } from "../pipeline/reconciler-client";
import { maxAttemptsFor } from "../pipeline/specs";

/** Stays on the task row so a post with no body is re-harvested once, not on every launch. */
const BACKFILL_PAYLOAD = { force: true, backfill: ARTICLE_KIND };

const MarkerSchema = z
  .object({ backfill: z.string().optional().catch(undefined) })
  .catch({});

/** Re-harvests Substack saves from before posts were stored as `article` files. */
export async function startArticleBackfill(): Promise<{
  ok: true;
  queued: number;
}> {
  const db = await getDb();
  /** Settled saves only: ingesting saves already have live tasks. */
  const rows = db
    .select({ id: saves.id, files: saves.files })
    .from(saves)
    .where(
      and(
        eq(saves.source, "substack"),
        inArray(saves.status, ["complete", "failed"]),
        isNull(saves.deletedAt),
      ),
    )
    .all()
    .filter((row) => !row.files.some((file) => file.kind === ARTICLE_KIND));
  if (rows.length === 0) return { ok: true, queued: 0 };

  const harvestTasks = new Map<string, { id: string; backfill?: string }>();
  for (const task of db
    .select({ id: tasks.id, saveId: tasks.saveId, payload: tasks.payload })
    .from(tasks)
    .where(
      and(
        eq(tasks.op, "harvest_metadata"),
        inArray(
          tasks.saveId,
          rows.map((row) => row.id),
        ),
      ),
    )
    .all()) {
    harvestTasks.set(task.saveId, {
      id: task.id,
      backfill: MarkerSchema.parse(task.payload).backfill,
    });
  }

  const now = new Date();
  let queued = 0;
  for (const { id } of rows) {
    const existing = harvestTasks.get(id);
    if (existing?.backfill === ARTICLE_KIND) continue;
    const blocked = db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.saveId, id),
          notInArray(tasks.op, ["harvest_metadata", "finalize"]),
          notInArray(tasks.status, ["done", "dead", "cancelled"]),
        ),
      )
      .get();
    if (blocked) continue;

    if (existing) {
      db.update(tasks)
        .set({
          status: "pending",
          attempts: 0,
          maxAttempts: maxAttemptsFor("harvest_metadata"),
          payload: BACKFILL_PAYLOAD,
          lastError: null,
          nextRunAt: now,
          updatedAt: now,
        })
        .where(eq(tasks.id, existing.id))
        .run();
    } else {
      const taskRow: NewTask = {
        id: ulid(),
        saveId: id,
        source: "substack",
        op: "harvest_metadata",
        status: "pending",
        attempts: 0,
        maxAttempts: maxAttemptsFor("harvest_metadata"),
        payload: BACKFILL_PAYLOAD,
        nextRunAt: now,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(tasks).values(taskRow).onConflictDoNothing().run();
    }
    db.update(tasks)
      .set({ status: "pending", nextRunAt: now, updatedAt: now })
      .where(and(eq(tasks.saveId, id), eq(tasks.op, "finalize")))
      .run();
    await persistSave(
      id,
      { status: "ingesting", ingestStartedAt: now, ingestCompletedAt: null },
      { actorReason: "pipeline:article-backfill" },
    );
    queued += 1;
  }

  if (queued > 0) {
    log.info("[pond article-backfill] queued Substack saves", { queued });
    kickReconciler();
  }
  return { ok: true, queued };
}
