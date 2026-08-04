import type { Save, SaveFile } from "@pond/schema/db";
import { saves } from "@pond/schema/db";
import { domainFromUrl } from "@pond/schema/domain";
import type { Transaction } from "@pond/schema/tx";
import { eq, sql } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../db";
import { executeBatch } from "./executor";

function majorityFromFiles(
  files: SaveFile[] | null | undefined,
): "image" | "video" {
  let videos = 0;
  let images = 0;
  for (const f of files ?? []) {
    if (
      f.kind === "video" ||
      f.mimeType?.startsWith("video/") === true ||
      /\.(mp4|webm|mov|m4v|mkv)$/i.test(f.path)
    ) {
      videos += 1;
    } else if (
      f.kind === "cover" ||
      f.kind === "media" ||
      f.kind === "poster" ||
      f.mimeType?.startsWith("image/") === true
    ) {
      images += 1;
    }
  }
  return videos > images ? "video" : "image";
}

/** Purge file saves, collapse mixed types, and backfill siteName from URLs. */
export async function runLibraryScopeMigration(): Promise<void> {
  const db = await getDb();

  const fileRows = db
    .select()
    .from(saves)
    .where(sql`${saves.mediaType} = 'file'`)
    .all() as Save[];

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
    const next = majorityFromFiles(row.files as SaveFile[] | null);
    db.update(saves).set({ mediaType: next }).where(eq(saves.id, row.id)).run();
  }
  if (mixedRows.length > 0) {
    log.info("[pond migrate] collapsed mediaType=mixed", {
      count: mixedRows.length,
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
