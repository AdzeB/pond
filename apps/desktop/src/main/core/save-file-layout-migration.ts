import { join } from "node:path";
import type { SaveFile } from "@pond/schema/db";
import { saves } from "@pond/schema/db";
import {
  type LayoutFile,
  needsSaveFileLayoutMigration,
} from "@shared/save-file-layout";
import log from "electron-log/main.js";
import type { Db } from "../db";
import { itemDir } from "../paths";
import { persistSave } from "./persist-save";
import { applySaveFileLayoutOnDisk } from "./save-file-layout-disk";

export interface LayoutMigrationResult<T extends LayoutFile> {
  files: T[];
  changed: boolean;
  coverIndex: number;
}

export async function migrateSaveFileLayout<T extends LayoutFile>(
  saveId: string,
  files: T[],
  schema?: number,
  opts?: { root?: string; persist?: boolean },
): Promise<LayoutMigrationResult<T>> {
  const dir = opts?.root
    ? join(opts.root, "items", `${saveId}.info`)
    : itemDir(saveId);
  const result = await applySaveFileLayoutOnDisk(dir, files, schema);
  if (!result.changed) return result;

  if (opts?.persist) {
    try {
      await persistSave(
        saveId,
        {
          files: result.files as unknown as SaveFile[],
          coverIndex: result.coverIndex,
        },
        { actorReason: "migrate:save-file-layout", writeInfo: true },
      );
    } catch (err) {
      log.warn("[pond migrate] could not persist save layout", saveId, err);
    }
  }

  return result;
}

export async function migrateLibrarySaveFileLayouts(db: Db): Promise<void> {
  const rows = db
    .select({ id: saves.id, files: saves.files })
    .from(saves)
    .all();
  let migrated = 0;
  for (const row of rows) {
    const files = row.files ?? [];
    if (!needsSaveFileLayoutMigration(files)) continue;
    const result = await migrateSaveFileLayout(row.id, files, undefined, {
      persist: true,
    });
    if (result.changed) migrated += 1;
  }
  if (migrated > 0) {
    log.info("[pond migrate] save file layout", { count: migrated });
  }
}
