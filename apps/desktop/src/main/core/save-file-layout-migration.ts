import { join } from "node:path";
import type { SaveFile } from "@pond/schema/db";
import { saves } from "@pond/schema/db";
import { needsSaveFileLayoutMigration } from "@shared/save-file-layout";
import log from "electron-log/main.js";
import type { Db } from "../db";
import type { InfoFile } from "../lib/library-format";
import { itemDir } from "../paths";
import { persistSave } from "./persist-save";
import { applySaveFileLayoutOnDisk } from "./save-file-layout-disk";

export interface LayoutMigrationResult<T extends SaveFile> {
  files: T[];
  changed: boolean;
  coverIndex: number;
}

export function migrateSaveFileLayout(
  saveId: string,
  files: InfoFile[],
  schema?: number,
  opts?: { root?: string; persist?: boolean },
): Promise<LayoutMigrationResult<InfoFile>>;
export function migrateSaveFileLayout(
  saveId: string,
  files: SaveFile[],
  schema?: number,
  opts?: { root?: string; persist?: boolean },
): Promise<LayoutMigrationResult<SaveFile>>;
export function migrateSaveFileLayout(
  saveId: string,
  files: Array<InfoFile | SaveFile>,
  schema?: number,
  opts?: { root?: string; persist?: boolean },
): Promise<LayoutMigrationResult<InfoFile | SaveFile>>;
export async function migrateSaveFileLayout(
  saveId: string,
  files: Array<InfoFile | SaveFile>,
  schema?: number,
  opts?: { root?: string; persist?: boolean },
): Promise<LayoutMigrationResult<InfoFile | SaveFile>> {
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
          files: result.files,
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
