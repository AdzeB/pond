import { rm } from "node:fs/promises";
import { saves, tasks } from "@pond/schema/db";
import { and, eq } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import { itemFile } from "../../paths";
import { resetTasksForSave } from "../pipeline/enqueue";

export type RefreshOutcome =
  | { ok: true; method: "pipeline-reset" }
  | {
      ok: false;
      reason: "not_found" | "no_url" | "internal_error";
    };

interface RefreshSaveOptions {
  /** Drop already-downloaded media so fetch_blobs re-downloads instead of self-gating on existing covers. */
  overwrite?: boolean;
}

/** Refresh = reset task rows to pending and force harvest_metadata to re-run. */
export async function refreshSave(
  saveId: string,
  opts: RefreshSaveOptions = {},
): Promise<RefreshOutcome> {
  const db = await getDb();
  const rows = await db.select().from(saves).where(eq(saves.id, saveId));
  const current = rows[0];
  if (!current) return { ok: false, reason: "not_found" };
  if (!current.url) return { ok: false, reason: "no_url" };

  try {
    if (opts.overwrite) {
      const existing = current.files ?? [];
      await Promise.all(
        existing.map((f) =>
          rm(itemFile(saveId, f.path), { force: true }).catch(() => {}),
        ),
      );
      db.update(saves)
        .set({ files: [], coverIndex: 0, fileSize: null, mediaUrl: null })
        .where(eq(saves.id, saveId))
        .run();
    }

    db.update(tasks)
      .set({
        payload: { force: true },
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.saveId, saveId), eq(tasks.op, "harvest_metadata")))
      .run();
    await resetTasksForSave(
      saveId,
      opts.overwrite ? "user:refresh-overwrite" : "user:refresh",
    );
    return { ok: true, method: "pipeline-reset" };
  } catch (err) {
    log.error("[pond refresh] reset failed", saveId, err);
    return { ok: false, reason: "internal_error" };
  }
}

export { isSourceConnected, signInToSource } from "./scrape-window";
