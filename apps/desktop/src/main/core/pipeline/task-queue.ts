import { type NewTask, type Source, saves, tasks } from "@pond/schema/db";
import { and, asc, eq, inArray, lte, ne, notExists, sql } from "drizzle-orm";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { getDb } from "../../db";
import { persistSave } from "../persist-save";
import {
  type DueTask,
  isSourceTask,
  opOrderCase,
  opOrderCaseRaw,
} from "./reconciler-config";
import { sourcePausedUntil } from "./source-gate";
import { maxAttemptsFor, planOps } from "./specs";

// NOT EXISTS enforces the sequential op gate in SQL so the window isn't
// filled with non-runnable tasks. Pull 3x the dispatch window for round-robin.
export async function pullDueTasks(): Promise<DueTask[]> {
  const db = await getDb();
  const now = new Date();
  const rows = (await db
    .select({
      id: tasks.id,
      saveId: tasks.saveId,
      op: tasks.op,
      status: tasks.status,
      attempts: tasks.attempts,
      maxAttempts: tasks.maxAttempts,
      nextRunAt: tasks.nextRunAt,
      lastError: tasks.lastError,
      payload: tasks.payload,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      source: saves.source,
    })
    .from(tasks)
    .innerJoin(saves, eq(tasks.saveId, saves.id))
    .where(
      and(
        eq(tasks.status, "pending"),
        lte(tasks.nextRunAt, now),
        eq(saves.status, "ingesting"),
        sql`NOT EXISTS (
          SELECT 1 FROM ${tasks} AS peers
          WHERE peers.save_id = ${tasks.saveId}
            AND peers.status != 'done'
            AND ${opOrderCaseRaw("peers.op")} < ${opOrderCase(tasks.op)}
        )`,
      ),
    )
    .orderBy(asc(tasks.nextRunAt))
    .limit(60)) as unknown as DueTask[];

  if (rows.length === 0) return rows;

  // Per-save round-robin so progress is shared, not monopolised by one save.
  // Skip paused sources so we don't pin inflight slots on stalled work.
  const buckets = new Map<string, DueTask[]>();
  for (const row of rows) {
    if (isSourceTask(row.op) && sourcePausedUntil(row.source as never) > 0) {
      continue;
    }
    const bucket = buckets.get(row.saveId);
    if (bucket) bucket.push(row);
    else buckets.set(row.saveId, [row]);
  }
  const interleaved: DueTask[] = [];
  let progress = true;
  while (progress && interleaved.length < 20) {
    progress = false;
    for (const bucket of buckets.values()) {
      if (interleaved.length >= 20) break;
      const next = bucket.shift();
      if (!next) continue;
      interleaved.push(next);
      progress = true;
    }
  }
  return interleaved;
}

// Fail `pending` tasks on non-ingesting saves; they can't run and starve the window.
export async function sweepOrphanTasks(): Promise<void> {
  const db = await getDb();
  const orphans = db
    .select({ id: tasks.id })
    .from(tasks)
    .innerJoin(saves, eq(tasks.saveId, saves.id))
    .where(and(eq(tasks.status, "pending"), ne(saves.status, "ingesting")))
    .all();
  if (orphans.length === 0) return;
  db.update(tasks)
    .set({
      status: "failed",
      lastError: "orphan: save no longer ingesting",
      updatedAt: new Date(),
    })
    .where(
      inArray(
        tasks.id,
        orphans.map((o) => o.id),
      ),
    )
    .run();
  log.info("[pond pipeline:reconciler] swept orphan tasks", {
    count: orphans.length,
  });
}

// Heal `ingesting` saves that have no task rows at all. Nothing can ever move
// them: `pullDueTasks` finds no work and `maybeFinalizeSave` bails on an empty
// task list, so they'd sit in the saving pill forever. (Task rows are local:
// a save row synced in from another device mid-ingest arrives taskless.)
// Re-seed the source's op plan so the pipeline can run the save to completion;
// sources with no plan (local) just settle as complete.
export async function sweepTasklessIngestingSaves(): Promise<void> {
  const db = await getDb();
  const stuck = db
    .select({ id: saves.id, source: saves.source })
    .from(saves)
    .where(
      and(
        eq(saves.status, "ingesting"),
        notExists(
          db
            .select({ id: tasks.id })
            .from(tasks)
            .where(eq(tasks.saveId, saves.id)),
        ),
      ),
    )
    .all();
  if (stuck.length === 0) return;

  const now = new Date();
  for (const { id, source } of stuck) {
    const ops = planOps(source as Source);
    if (ops.length === 0) {
      // Via persistSave so the flip broadcasts to the renderer pool.
      await persistSave(
        id,
        { status: "complete", ingestCompletedAt: now },
        { actorReason: "pipeline:sweep-taskless" },
      );
      continue;
    }
    const taskRows: NewTask[] = ops.map((op) => ({
      id: ulid(),
      saveId: id,
      op,
      status: "pending",
      attempts: 0,
      maxAttempts: maxAttemptsFor(op),
      nextRunAt: now,
      createdAt: now,
      updatedAt: now,
    }));
    db.insert(tasks).values(taskRows).run();
  }
  log.info("[pond pipeline:reconciler] re-seeded taskless ingesting saves", {
    count: stuck.length,
  });
}
