import { existsSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { saves } from "@pond/schema/db";
import { needsSaveFileLayoutBackfill } from "@shared/save-file-layout";
import { isNull } from "drizzle-orm";
import log from "electron-log/main.js";
import pLimit from "p-limit";
import { getDb } from "../../db";
import { INFO_FILE, StoredInfoDocSchema } from "../../lib/library-format";
import { itemDir, resolvePaths } from "../../paths";
import { currentPondId } from "../prefs-scope";
import { migrateSaveFileLayout } from "../save-file-layout-migration";

const MIGRATION_ID = "save-file-layout-v4";
const MAX_INFLIGHT = 2;
const PAGE_SIZE = 200;

function markerPath(): string {
  return join(resolvePaths().indexesDir, `${currentPondId()}.${MIGRATION_ID}`);
}

async function readStoredSchema(saveId: string): Promise<number | undefined> {
  try {
    const parsed = StoredInfoDocSchema.safeParse(
      JSON.parse(await readFile(join(itemDir(saveId), INFO_FILE), "utf8")),
    );
    return parsed.success ? parsed.data.schema : undefined;
  } catch {
    return undefined;
  }
}

export async function startSaveFileLayoutBackfill(): Promise<{
  ok: true;
  migrated: number;
  skipped: boolean;
}> {
  if (existsSync(markerPath())) {
    return { ok: true, migrated: 0, skipped: true };
  }

  const db = await getDb();
  let migrated = 0;
  let offset = 0;
  const limit = pLimit(MAX_INFLIGHT);
  const jobs: Promise<void>[] = [];

  for (;;) {
    const page = db
      .select({ id: saves.id, files: saves.files })
      .from(saves)
      .where(isNull(saves.deletedAt))
      .limit(PAGE_SIZE)
      .offset(offset)
      .all();
    if (page.length === 0) break;
    offset += page.length;

    for (const row of page) {
      const files = row.files ?? [];
      const schema = await readStoredSchema(row.id);
      if (!needsSaveFileLayoutBackfill(files, schema)) continue;
      jobs.push(
        limit(async () => {
          try {
            const result = await migrateSaveFileLayout(row.id, files, schema, {
              persist: true,
            });
            if (result.changed) {
              migrated += 1;
              if (migrated % 100 === 0) {
                log.info("[pond save-file-layout-backfill] progress", {
                  migrated,
                  queued: jobs.length,
                });
              }
            }
          } catch (err) {
            log.warn("[pond save-file-layout-backfill] failed", row.id, err);
          }
        }),
      );
    }
    if (page.length < PAGE_SIZE) break;
  }

  if (jobs.length === 0) {
    writeFileSync(markerPath(), `${Date.now()}\n`);
    log.info("[pond save-file-layout-backfill] nothing to migrate");
    return { ok: true, migrated: 0, skipped: false };
  }

  log.info("[pond save-file-layout-backfill] migrating", jobs.length, "saves");
  await Promise.all(jobs);
  writeFileSync(markerPath(), `${Date.now()}\n`);
  log.info(
    "[pond save-file-layout-backfill] migrated",
    migrated,
    "of",
    jobs.length,
  );
  return { ok: true, migrated, skipped: false };
}
