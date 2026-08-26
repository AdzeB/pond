import { saves } from "@pond/schema/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import { readSave } from "../pipeline/workers/apply";
import {
  fetchSourceIcon,
  hasSourceIcon,
} from "../pipeline/workers/source-icon";

const CONCURRENCY = 4;

export async function backfillSourceIcons(): Promise<{
  ok: true;
  written: number;
}> {
  const db = await getDb();
  const rows = db
    .select({ id: saves.id, files: saves.files })
    .from(saves)
    .where(
      and(
        eq(saves.source, "web"),
        inArray(saves.status, ["complete", "failed"]),
        isNull(saves.deletedAt),
      ),
    )
    .all();

  const missing = rows.filter((r) => !hasSourceIcon(r.files)).map((r) => r.id);
  if (missing.length === 0) return { ok: true, written: 0 };

  let written = 0;
  let cursor = 0;
  const runLane = async (): Promise<void> => {
    while (cursor < missing.length) {
      const id = missing[cursor++];
      if (!id) continue;
      try {
        const save = await readSave(id);
        if (!save) continue;
        if (await fetchSourceIcon(id, save)) written += 1;
      } catch (err) {
        log.warn("[pond source-icon-backfill] failed", id, err);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, missing.length) }, runLane),
  );

  log.info("[pond source-icon-backfill] done", {
    candidates: missing.length,
    written,
  });
  return { ok: true, written };
}
