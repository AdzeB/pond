import { saves, tasks } from "@pond/schema/db";
import { and, asc, eq, inArray, lte, ne, sql } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import {
  type DueTask,
  isSourceTask,
  opOrderCase,
  opOrderCaseRaw,
} from "./reconciler-config";
import { sourcePausedUntil } from "./source-gate";

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
