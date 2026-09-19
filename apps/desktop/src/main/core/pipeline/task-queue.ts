import { type NewTask, saves, tasks } from "@pond/schema/db";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  lte,
  ne,
  notExists,
  sql,
} from "drizzle-orm";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { getDb } from "../../db";
import { persistSave } from "../persist-save";
import { isInteractiveTask } from "./priority";
import { sourcePausedUntil } from "./rate-governor";
import {
  type DueTask,
  isSourceTask,
  opOrderCase,
  opOrderCaseRaw,
} from "./reconciler-config";
import { maxAttemptsFor, planOps } from "./specs";

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
    .orderBy(
      sql`(CASE json_extract(${tasks.payload}, '$.priority') WHEN 'interactive' THEN 0 ELSE 1 END)`,
      desc(saves.createdAt),
      asc(tasks.nextRunAt),
    )
    .limit(60)) satisfies DueTask[];

  if (rows.length === 0) return rows;

  const runnable = rows.filter(
    (row) => !isBlockedBySourceCooldown(row, sourcePausedUntil(row.source)),
  );
  return scheduleDueTasks(runnable);
}

export function isDueTaskRunnable(row: DueTask, sourceUntil: number): boolean {
  return !isBlockedBySourceCooldown(row, sourceUntil);
}

function isBlockedBySourceCooldown(row: DueTask, sourceUntil: number): boolean {
  return isSourceTask(row.op) && sourceUntil > 0 && !isInteractiveTask(row);
}

const DISPATCH_BATCH = 20;

export function scheduleDueTasks(rows: readonly DueTask[]): DueTask[] {
  const interactive: DueTask[] = [];
  const background: DueTask[] = [];
  for (const row of rows) {
    if (isInteractiveTask(row)) interactive.push(row);
    else background.push(row);
  }
  const head = interleaveBySave(interactive, DISPATCH_BATCH);
  if (head.length >= DISPATCH_BATCH) return head;
  return [
    ...head,
    ...interleaveBySave(background, DISPATCH_BATCH - head.length),
  ];
}

function interleaveBySave(rows: readonly DueTask[], limit: number): DueTask[] {
  const buckets = new Map<string, DueTask[]>();
  for (const row of rows) {
    const bucket = buckets.get(row.saveId);
    if (bucket) bucket.push(row);
    else buckets.set(row.saveId, [row]);
  }
  const interleaved: DueTask[] = [];
  let progress = true;
  while (progress && interleaved.length < limit) {
    progress = false;
    for (const bucket of buckets.values()) {
      if (interleaved.length >= limit) break;
      const next = bucket.shift();
      if (!next) continue;
      interleaved.push(next);
      progress = true;
    }
  }
  return interleaved;
}

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
    const ops = planOps(source);
    if (ops.length === 0) {
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
