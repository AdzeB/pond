import type { SaveFile } from "@pond/schema/db";
import { saves } from "@pond/schema/db";
import { domainFromUrl } from "@pond/schema/domain";
import { majorityMediaType } from "@pond/schema/media-type";
import type { RawJson } from "@pond/schema/raw";
import type { Transaction } from "@pond/schema/tx";
import {
  arenaBlockClassFromRawJson,
  TEXT_COVER_KINDS,
} from "@shared/text-card";
import { eq, sql } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../db";
import { executeBatch } from "./executor";

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

export async function runLibraryScopeMigration(): Promise<void> {
  const db = await getDb();

  const fileRows = db
    .select()
    .from(saves)
    .where(sql`${saves.mediaType} = 'file'`)
    .all();

  if (fileRows.length > 0) {
    const txs: Transaction[] = fileRows.map((row) => ({
      kind: "purge" as const,
      model: "save" as const,
      id: row.id,
      before: row,
      meta: {
        actor: "system" as const,
        actorReason: "migrate:purge-file-saves",
      },
    }));
    await executeBatch(txs);
    log.info("[pond migrate] purged mediaType=file saves", {
      count: fileRows.length,
    });
  }

  const mixedRows = db
    .select({ id: saves.id, files: saves.files })
    .from(saves)
    .where(sql`${saves.mediaType} = 'mixed'`)
    .all();

  for (const row of mixedRows) {
    const kinds = (row.files ?? [])
      .map(fileMediaKind)
      .filter((k): k is "image" | "video" => k != null);
    const next = majorityMediaType(kinds) ?? "image";
    db.update(saves).set({ mediaType: next }).where(eq(saves.id, row.id)).run();
  }
  if (mixedRows.length > 0) {
    log.info("[pond migrate] collapsed mediaType=mixed", {
      count: mixedRows.length,
    });
  }

  const textRows = db
    .select({
      id: saves.id,
      source: saves.source,
      url: saves.url,
      description: saves.description,
      files: saves.files,
      rawJson: saves.rawJson,
    })
    .from(saves)
    .where(sql`${saves.mediaType} = 'text'`)
    .all();

  let repairedText = 0;
  for (const row of textRows) {
    const next = repairTextMediaType(row);
    if (next === "text") continue;
    db.update(saves).set({ mediaType: next }).where(eq(saves.id, row.id)).run();
    repairedText += 1;
  }
  if (repairedText > 0) {
    log.info("[pond migrate] repaired mediaType=text stamps", {
      count: repairedText,
    });
  }

  const needsSite = db
    .select({
      id: saves.id,
      url: saves.url,
      source: saves.source,
      siteName: saves.siteName,
    })
    .from(saves)
    .where(
      sql`(${saves.siteName} is null or trim(${saves.siteName}) = '')
        and ${saves.source} != 'local'
        and ${saves.url} is not null
        and ${saves.url} not like 'pond:%'`,
    )
    .all();

  let filled = 0;
  for (const row of needsSite) {
    const site = domainFromUrl(row.url);
    if (!site) continue;
    db.update(saves).set({ siteName: site }).where(eq(saves.id, row.id)).run();
    filled += 1;
  }
  if (filled > 0) {
    log.info("[pond migrate] backfilled siteName", { count: filled });
  }
}
