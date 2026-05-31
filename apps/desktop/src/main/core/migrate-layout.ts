import { readdir } from "node:fs/promises";
import { join } from "node:path";
import log from "electron-log/main.js";
import { migrateItemDirToInfo } from "../lib/library";
import { resolvePaths } from "../paths";

// Rewrite legacy per-item `metadata.json` into `info.json` + `source.json`
// in place. Runs on boot before reconcile so the scanner only ever sees
// the new layout. Idempotent: items that already have `info.json` are
// skipped, so re-running is cheap and safe.
export async function migrateLibraryLayout(): Promise<{ migrated: number }> {
  const paths = resolvePaths();
  let migrated = 0;

  for (const root of [paths.itemsDir, paths.trashDir]) {
    let entries: string[] = [];
    try {
      entries = await readdir(root);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".info")) continue;
      try {
        if (await migrateItemDirToInfo(join(root, entry))) migrated++;
      } catch (err) {
        log.warn("[pond migrate] item failed", entry, err);
      }
    }
  }

  if (migrated > 0) {
    log.info(`[pond migrate] upgraded ${migrated} items to info.json`);
  }
  return { migrated };
}
