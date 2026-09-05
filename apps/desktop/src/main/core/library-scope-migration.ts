import type { Save, SaveFile } from "@pond/schema/db";
import { saves } from "@pond/schema/db";
import { domainFromUrl } from "@pond/schema/domain";
import { majorityMediaType } from "@pond/schema/media-type";
import type { RawJson } from "@pond/schema/raw";
import {
  arenaBlockClassFromRawJson,
  TEXT_COVER_KINDS,
} from "@shared/text-card";
import { eq, sql } from "drizzle-orm";
import log from "electron-log/main.js";
import type { Db } from "../db";

function fileMediaKind(file: SaveFile): "image" | "video" | null {
  if (TEXT_COVER_KINDS.has(file.kind)) return null;
  if (file.kind === "avatar" || file.kind === "source_icon") return null;
  if (
    file.kind === "video" ||
    file.mimeType?.startsWith("video/") === true ||
    /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.path)
  ) {
    return "video";
  }
  if (
    file.kind === "cover" ||
    file.kind === "media" ||
    file.kind === "image" ||
    file.kind === "poster" ||
    file.mimeType?.startsWith("image/") === true
  ) {
    return "image";
  }
  return null;
}

function repairTextMediaType(row: {
  source: string;
  description: string | null;
  files: SaveFile[] | null;
  rawJson: RawJson | null;
}): "image" | "video" | "link" | "text" {
  const kinds = (row.files ?? [])
    .map(fileMediaKind)
    .filter((k): k is "image" | "video" => k != null);
  const fromFiles = majorityMediaType(kinds);
  if (fromFiles) return fromFiles;

  const hasProse = Boolean(row.description?.trim());
  if (!hasProse) return "link";
  if (arenaBlockClassFromRawJson(row.rawJson) === "text") return "text";
  if (row.source === "local") return "text";
  return "link";
}

interface MigrationStore {
  fileSaveIds(): Array<Pick<Save, "id">>;
  mixedSaves(): Array<Pick<Save, "id" | "files">>;
  textSaves(): Array<
    Pick<Save, "id" | "source" | "description" | "files" | "rawJson">
  >;
  missingSiteNames(): Array<Pick<Save, "id" | "url">>;
  updateSave(
    id: string,
    patch: Pick<Partial<Save>, "mediaType" | "siteName">,
  ): void;
}

export async function runLibraryScopeMigration(db: Db): Promise<void> {
  migrateLibraryScope({
    fileSaveIds: () =>
      db
        .select({ id: saves.id })
        .from(saves)
        .where(sql`${saves.mediaType} = 'file'`)
        .all(),
    mixedSaves: () =>
      db
        .select({ id: saves.id, files: saves.files })
        .from(saves)
        .where(sql`${saves.mediaType} = 'mixed'`)
        .all(),
    textSaves: () =>
      db.select().from(saves).where(sql`${saves.mediaType} = 'text'`).all(),
    missingSiteNames: () =>
      db
        .select({ id: saves.id, url: saves.url })
        .from(saves)
        .where(
          sql`(${saves.siteName} is null or trim(${saves.siteName}) = '') and ${saves.source} != 'local' and ${saves.url} is not null and ${saves.url} not like 'pond:%'`,
        )
        .all(),
    updateSave: (id, patch) => {
      db.update(saves).set(patch).where(eq(saves.id, id)).run();
    },
  });
}

export function migrateLibraryScope(store: MigrationStore): void {
  const fileRows = store.fileSaveIds();
  if (fileRows.length > 0)
    log.info("[pond migrate] retained mediaType=file saves", {
      count: fileRows.length,
    });
  const mixedRows = store.mixedSaves();
  for (const row of mixedRows) {
    const kinds = (row.files ?? [])
      .map(fileMediaKind)
      .filter((kind): kind is "image" | "video" => kind != null);
    store.updateSave(row.id, {
      mediaType: majorityMediaType(kinds) ?? "image",
    });
  }
  if (mixedRows.length > 0)
    log.info("[pond migrate] collapsed mediaType=mixed", {
      count: mixedRows.length,
    });
  let repairedText = 0;
  for (const row of store.textSaves()) {
    const next = repairTextMediaType(row);
    if (next === "text") continue;
    store.updateSave(row.id, { mediaType: next });
    repairedText += 1;
  }
  if (repairedText > 0)
    log.info("[pond migrate] repaired mediaType=text stamps", {
      count: repairedText,
    });
  let filled = 0;
  for (const row of store.missingSiteNames()) {
    const site = domainFromUrl(row.url);
    if (!site) continue;
    store.updateSave(row.id, { siteName: site });
    filled += 1;
  }
  if (filled > 0)
    log.info("[pond migrate] backfilled siteName", { count: filled });
}
