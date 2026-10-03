import { type NewTask, type Save, saves, tasks } from "@pond/schema/db";
import { isVideoFile } from "@shared/media-index";
import { and, eq, inArray, isNull } from "drizzle-orm";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { getDb } from "../../db";
import { persistSave } from "../persist-save";
import { kickReconciler } from "../pipeline/reconciler-client";
import { expectedVideoDownloads, maxAttemptsFor } from "../pipeline/specs";

const VIDEO_FOLLOW_UPS = [
  "fetch_video_ytdlp",
  "ensure_poster",
  "finalize",
] as const;

const PAGE_SIZE = 200;

function videoFileCount(files: Save["files"]): number {
  return (files ?? []).filter(isVideoFile).length;
}

export async function startMissingVideoBackfill(): Promise<{
  ok: true;
  queued: number;
}> {
  const db = await getDb();
  const now = new Date();
  let queued = 0;
  let offset = 0;

  for (;;) {
    const page = db
      .select({
        id: saves.id,
        source: saves.source,
        files: saves.files,
        mediaType: saves.mediaType,
        rawJson: saves.rawJson,
        status: saves.status,
      })
      .from(saves)
      .where(
        and(
          inArray(saves.status, ["complete", "failed"]),
          isNull(saves.deletedAt),
        ),
      )
      .limit(PAGE_SIZE)
      .offset(offset)
      .all();
    if (page.length === 0) break;
    offset += page.length;

    const missing = page.filter(
      (row) => expectedVideoDownloads(row) > videoFileCount(row.files),
    );
    if (missing.length > 0) {
      const existingRows = db
        .select({ id: tasks.id, saveId: tasks.saveId, op: tasks.op })
        .from(tasks)
        .where(
          and(
            inArray(
              tasks.saveId,
              missing.map((row) => row.id),
            ),
            inArray(tasks.op, [...VIDEO_FOLLOW_UPS]),
          ),
        )
        .all();
      const existingByKey = new Map(
        existingRows.map((row) => [`${row.saveId}:${row.op}`, row.id]),
      );

      for (const row of missing) {
        for (const op of VIDEO_FOLLOW_UPS) {
          const existingId = existingByKey.get(`${row.id}:${op}`);
          if (existingId) {
            db.update(tasks)
              .set({
                status: "pending",
                attempts: 0,
                maxAttempts: maxAttemptsFor(op),
                lastError: null,
                nextRunAt: now,
                updatedAt: now,
              })
              .where(eq(tasks.id, existingId))
              .run();
          } else {
            const taskRow: NewTask = {
              id: ulid(),
              saveId: row.id,
              source: row.source,
              op,
              status: "pending",
              attempts: 0,
              maxAttempts: maxAttemptsFor(op),
              nextRunAt: now,
              createdAt: now,
              updatedAt: now,
            };
            db.insert(tasks).values(taskRow).onConflictDoNothing().run();
          }
        }

        await persistSave(
          row.id,
          {
            status: "ingesting",
            ingestStartedAt: now,
            ingestCompletedAt: null,
          },
          { actorReason: "pipeline:missing-video-backfill" },
        );
        queued += 1;
      }
    }

    if (page.length < PAGE_SIZE) break;
  }

  if (queued > 0) {
    log.info("[pond missing-video-backfill] queued saves for video download", {
      queued,
    });
    kickReconciler();
  }
  return { ok: true, queued };
}
