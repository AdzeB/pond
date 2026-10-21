import { type NewTask, type Source, saves, tasks } from "@pond/schema/db";
import { isVideoFile } from "@shared/media-index";
import { and, eq, inArray, isNull, ne, notInArray } from "drizzle-orm";
import { ulid } from "ulid";
import type { Db } from "../../db";
import { getDb } from "../../db";
import { persistSave } from "../persist-save";
import { withInteractivePriority } from "../pipeline/priority";
import { kickReconciler } from "../pipeline/reconciler-client";
import { expectedVideoDownloads, maxAttemptsFor } from "../pipeline/specs";

const VIDEO_FOLLOW_UPS = [
  "fetch_video_ytdlp",
  "ensure_poster",
  "finalize",
] as const;

interface VideoDownloadRuntime {
  getDb: () => Promise<Db>;
  kickReconciler: () => void;
  persistSave: typeof persistSave;
}

const defaultRuntime: VideoDownloadRuntime = {
  getDb,
  kickReconciler,
  persistSave,
};

export async function findSavesMissingVideo(
  source?: Source,
  runtime: VideoDownloadRuntime = defaultRuntime,
): Promise<string[]> {
  const db = await runtime.getDb();
  const rows = db
    .select({
      id: saves.id,
      files: saves.files,
      mediaType: saves.mediaType,
      rawJson: saves.rawJson,
    })
    .from(saves)
    .where(
      and(
        isNull(saves.deletedAt),
        ne(saves.source, "local"),
        source ? eq(saves.source, source) : undefined,
      ),
    )
    .all();
  return rows
    .filter(
      (row) =>
        expectedVideoDownloads(row) >
        (row.files ?? []).filter(isVideoFile).length,
    )
    .map((row) => row.id);
}

export async function queueVideoDownloads(
  saveIds: readonly string[],
  runtime: VideoDownloadRuntime = defaultRuntime,
): Promise<number> {
  if (saveIds.length === 0) return 0;
  const db = await runtime.getDb();
  const now = new Date();
  /** Claims require an ingesting save, so only settled saves reopen; ingesting saves already have live tasks. */
  const settled = db
    .select({ id: saves.id, source: saves.source })
    .from(saves)
    .where(
      and(
        inArray(saves.id, [...saveIds]),
        inArray(saves.status, ["complete", "failed"]),
        isNull(saves.deletedAt),
      ),
    )
    .all();
  if (settled.length === 0) return 0;
  const settledIds = settled.map((row) => row.id);
  /** A non-done earlier task holds the sequential gate, so the download would never run. */
  const blocked = new Set(
    db
      .select({ saveId: tasks.saveId })
      .from(tasks)
      .where(
        and(
          inArray(tasks.saveId, settledIds),
          notInArray(tasks.op, [...VIDEO_FOLLOW_UPS]),
          notInArray(tasks.status, ["done", "cancelled"]),
        ),
      )
      .all()
      .map((row) => row.saveId),
  );
  const rows = settled.filter((row) => !blocked.has(row.id));
  if (rows.length === 0) return 0;
  const existing = new Map(
    db
      .select({ id: tasks.id, saveId: tasks.saveId, op: tasks.op })
      .from(tasks)
      .where(
        and(
          inArray(
            tasks.saveId,
            rows.map((row) => row.id),
          ),
          inArray(tasks.op, [...VIDEO_FOLLOW_UPS]),
        ),
      )
      .all()
      .map((row) => [`${row.saveId}:${row.op}`, row.id]),
  );
  const requested = withInteractivePriority({ requested: true });

  for (const row of rows) {
    for (const op of VIDEO_FOLLOW_UPS) {
      const payload = op === "fetch_video_ytdlp" ? requested : undefined;
      const existingId = existing.get(`${row.id}:${op}`);
      if (existingId) {
        db.update(tasks)
          .set({
            status: "pending",
            attempts: 0,
            maxAttempts: maxAttemptsFor(op),
            payload,
            generationId: null,
            lastError: null,
            nextRunAt: now,
            updatedAt: now,
          })
          .where(eq(tasks.id, existingId))
          .run();
      } else {
        const task: NewTask = {
          id: ulid(),
          saveId: row.id,
          source: row.source,
          op,
          status: "pending",
          attempts: 0,
          maxAttempts: maxAttemptsFor(op),
          payload,
          nextRunAt: now,
          createdAt: now,
          updatedAt: now,
        };
        db.insert(tasks).values(task).onConflictDoNothing().run();
      }
    }
    await runtime.persistSave(
      row.id,
      { status: "ingesting", ingestStartedAt: now, ingestCompletedAt: null },
      { actorReason: "user:download-video" },
    );
  }
  runtime.kickReconciler();
  return rows.length;
}
