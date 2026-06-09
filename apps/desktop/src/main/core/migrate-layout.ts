import { existsSync } from "node:fs";
import {
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import log from "electron-log/main.js";
import { migrateItemDirToInfo } from "../lib/library";
import { INFO_FILE, type InfoDoc } from "../lib/library-format";
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

  await drainLegacyTrash();

  return { migrated };
}

// Trash used to be a separate `trash/` folder. It is now an in-place
// `deletedAt` flag inside `info.json`, with every item living in `items/`.
// This one-time migration stamps each legacy `trash/<id>.info` as deleted
// (the folder's location was the only deleted signal) and moves it back
// into `items/` so pond:// resolves its media and the scanner reconciles
// it as trashed. Idempotent: an empty/missing `trash/` is a no-op.
async function drainLegacyTrash(): Promise<number> {
  const paths = resolvePaths();
  let entries: string[] = [];
  try {
    entries = await readdir(paths.trashDir);
  } catch {
    return 0;
  }

  let drained = 0;
  for (const entry of entries) {
    if (!entry.endsWith(".info")) continue;
    const from = join(paths.trashDir, entry);
    const to = join(paths.itemsDir, entry);
    try {
      // Folder mtime is our best estimate of when it was trashed.
      const deletedAtMs = (await stat(from)).mtimeMs;
      await stampDeleted(join(from, INFO_FILE), deletedAtMs);

      if (existsSync(to)) {
        // An item already lives in `items/` (the canonical location);
        // the trash duplicate is stale, so drop it.
        log.warn(
          "[pond migrate] items/ already has",
          entry,
          "- dropping trash copy",
        );
        await rm(from, { recursive: true, force: true });
      } else {
        await rename(from, to);
      }
      drained++;
    } catch (err) {
      log.warn("[pond migrate] trash drain failed", entry, err);
    }
  }

  if (drained > 0) {
    log.info(`[pond migrate] drained ${drained} items from legacy trash/`);
  }
  return drained;
}

// Stamp `deletedAt` into an item's info.json when it isn't already set.
// Missing/corrupt info.json is skipped: the folder still moves so its
// files aren't stranded, and the scanner will treat it as metadata-less.
async function stampDeleted(
  infoPath: string,
  deletedAtMs: number,
): Promise<void> {
  if (!existsSync(infoPath)) return;
  let info: InfoDoc;
  try {
    info = JSON.parse(await readFile(infoPath, "utf8")) as InfoDoc;
  } catch (err) {
    log.warn("[pond migrate] corrupt info.json, leaving as-is", infoPath, err);
    return;
  }
  if (info.deletedAt) return;
  info.deletedAt = new Date(deletedAtMs).toISOString();
  await writeFile(infoPath, JSON.stringify(info, null, 2));
}
