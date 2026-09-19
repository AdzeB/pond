import {
  CANCEL_REASON,
  type NewTask,
  type Source,
  saves,
  tasks,
} from "@pond/schema/db";
import {
  and,
  eq,
  exists,
  inArray,
  isNull,
  ne,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { getDb } from "../../db";
import { persistSave } from "../persist-save";
import {
  isInteractiveTrigger,
  TaskPayloadSchema,
  withInteractivePriority,
} from "./priority";
import { kickReconciler } from "./reconciler-client";
import { maxAttemptsFor, planOps } from "./specs";

export function createPendingTasks(
  saveId: string,
  source: Source,
  now: Date,
  trigger: string | undefined,
  createId: () => string = ulid,
): NewTask[] {
  const interactive = isInteractiveTrigger(trigger);
  return planOps(source).map((op) => {
    const row: NewTask = {
      id: createId(),
      saveId,
      op,
      status: "pending",
      attempts: 0,
      maxAttempts: maxAttemptsFor(op),
      nextRunAt: now,
      createdAt: now,
      updatedAt: now,
    };
    if (interactive) row.payload = withInteractivePriority();
    return row;
  });
}

async function promoteInteractiveTasks(saveId: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const rows = db
    .select({ id: tasks.id, payload: tasks.payload })
    .from(tasks)
    .where(and(eq(tasks.saveId, saveId), eq(tasks.status, "pending")))
    .all();
  for (const row of rows) {
    db.update(tasks)
      .set({
        payload: withInteractivePriority(TaskPayloadSchema.parse(row.payload)),
        nextRunAt: now,
        updatedAt: now,
      })
      .where(eq(tasks.id, row.id))
      .run();
  }
}

export async function promoteInteractiveSaveTasks(
  saveId: string,
): Promise<void> {
  await promoteInteractiveTasks(saveId);
}

export async function rependArchiveForCookies(saveId: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  db.update(tasks)
    .set({
      status: "pending",
      attempts: 0,
      lastError: null,
      nextRunAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(tasks.saveId, saveId),
        inArray(tasks.op, ["archive_page", "finalize"]),
      ),
    )
    .run();
  await persistSave(
    saveId,
    { status: "ingesting", ingestStartedAt: now, ingestCompletedAt: null },
    { actorReason: "pipeline:enqueue:page-cookies" },
  );
}

export async function resetTasksForSave(
  saveId: string,
  reason: string,
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  db.update(tasks)
    .set({
      status: "pending",
      attempts: 0,
      lastError: null,
      nextRunAt: now,
      updatedAt: now,
    })
    .where(eq(tasks.saveId, saveId))
    .run();
  db.update(saves)
    .set({ status: "ingesting", ingestStartedAt: now, ingestCompletedAt: null })
    .where(eq(saves.id, saveId))
    .run();
  if (isInteractiveTrigger(reason)) await promoteInteractiveTasks(saveId);
  log.info("[pond pipeline:enqueue] reset tasks", { saveId, reason });
}

export async function retryFailedSaves(
  ids?: readonly string[],
): Promise<number> {
  const db = await getDb();
  const scoped = ids != null && ids.length > 0;
  const rows = scoped
    ? db
        .select({ id: saves.id })
        .from(saves)
        .where(and(eq(saves.status, "failed"), inArray(saves.id, [...ids])))
        .all()
    : db
        .select({ id: saves.id })
        .from(saves)
        .where(
          and(
            eq(saves.status, "failed"),
            isNull(saves.deletedAt),
            or(
              notExists(
                db
                  .select({ one: sql`1` })
                  .from(tasks)
                  .where(
                    and(
                      eq(tasks.saveId, saves.id),
                      eq(tasks.lastError, CANCEL_REASON),
                    ),
                  ),
              ),
              exists(
                db
                  .select({ one: sql`1` })
                  .from(tasks)
                  .where(
                    and(
                      eq(tasks.saveId, saves.id),
                      inArray(tasks.status, ["failed", "blocked"]),
                      or(
                        isNull(tasks.lastError),
                        ne(tasks.lastError, CANCEL_REASON),
                      ),
                    ),
                  ),
              ),
            ),
          ),
        )
        .all();
  if (rows.length === 0) return 0;

  const now = new Date();
  for (const { id } of rows) {
    db.update(tasks)
      .set({
        status: "pending",
        attempts: 0,
        lastError: null,
        nextRunAt: now,
        updatedAt: now,
      })
      .where(and(eq(tasks.saveId, id), eq(tasks.status, "failed")))
      .run();
    await persistSave(
      id,
      { status: "ingesting", ingestStartedAt: now, ingestCompletedAt: null },
      { actorReason: "pipeline:retry-failed" },
    );
  }

  log.info("[pond pipeline:enqueue] retry failed saves", {
    requeued: rows.length,
    scoped,
  });
  kickReconciler();
  return rows.length;
}
