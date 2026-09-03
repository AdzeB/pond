import { copyFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { saves } from "@pond/schema/db";
import { desc, eq, inArray, isNull } from "drizzle-orm";
import { dialog } from "electron";
import log from "electron-log/main.js";
import sharp from "sharp";
import { z } from "zod";
import { getDb } from "../../db";
import { toCsv } from "../../lib/csv";
import { resolveSaveFilePath } from "../helpers";
import {
  FileIndexParam,
  type QueryHandlerMap,
  query,
  StringListParam,
  StringParam,
} from "./params";

function sanitizeName(s: string): string {
  return s
    .replace(/[/\\?%*:|"<>]/g, "_")
    .trim()
    .slice(0, 120);
}

const IdListParams = z.object({ ids: StringListParam });

export const savesExportQueries: QueryHandlerMap = {
  "saves.exportFile": query(
    z.object({ id: StringParam, fileIndex: FileIndexParam }),
    async (params) => {
      const id = params.id;
      if (!id) return { ok: false as const, reason: "not_found" as const };
      const target = await resolveSaveFilePath(id, params.fileIndex);
      if (!target.ok) return target;

      const db = await getDb();
      const rows = await db.select().from(saves).where(eq(saves.id, id));
      const row = rows[0];
      const ext = extname(target.path);
      const base = (row?.title ?? row?.id ?? "save")
        .replace(/[\\/:*?"<>|]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);
      const defaultName = `${base || "save"}${ext}`;

      try {
        const result = await dialog.showSaveDialog({
          defaultPath: defaultName,
        });
        if (result.canceled || !result.filePath) {
          return { ok: false as const, reason: "cancelled" as const };
        }
        await copyFile(target.path, result.filePath);
        return { ok: true as const, path: result.filePath };
      } catch (err) {
        log.warn("[pond ipc] saves.exportFile failed", err);
        return { ok: false as const, reason: "internal_error" as const };
      }
    },
  ),

  "saves.exportFiles": query(IdListParams, async (params) => {
    const ids = params.ids.filter(Boolean);
    if (ids.length === 0) return { ok: false as const, error: "no_selection" };

    const picked = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    if (picked.canceled || !picked.filePaths[0]) {
      return { ok: false as const, error: "canceled" };
    }
    const dir = picked.filePaths[0];

    const db = await getDb();
    const rows = await db.select().from(saves).where(inArray(saves.id, ids));

    const used = new Set<string>();
    let exported = 0;
    for (const row of rows) {
      const preferred = row.coverIndex ?? 0;
      const fileIndex =
        row.files[preferred]?.kind !== "custom_thumbnail"
          ? preferred
          : row.files.findIndex((file) => file.kind !== "custom_thumbnail");
      if (fileIndex < 0) continue;
      const target = await resolveSaveFilePath(row.id, fileIndex);
      if (!target.ok) continue;
      const ext = extname(target.path);
      const base =
        sanitizeName(row.title ?? basename(target.path, ext)) || row.id;
      let name = `${base}${ext}`;
      let n = 1;
      while (used.has(name.toLowerCase())) name = `${base}-${n++}${ext}`;
      used.add(name.toLowerCase());
      await copyFile(target.path, join(dir, name));
      exported++;
    }
    return { ok: true as const, exported, dir };
  }),

  "saves.exportWebp": query(IdListParams, async (params) => {
    const ids = params.ids.filter(Boolean);
    if (ids.length === 0) return { ok: false as const, error: "no_selection" };
    const picked = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    if (picked.canceled || !picked.filePaths[0]) {
      return { ok: false as const, error: "canceled" };
    }
    const dir = picked.filePaths[0];
    let exported = 0;
    for (const id of ids) {
      const target = await resolveSaveFilePath(id, 0);
      if (!target.ok) continue;
      try {
        const out = join(dir, `${id}.webp`);
        await sharp(target.path).webp({ quality: 80 }).toFile(out);
        exported += 1;
      } catch (err) {
        log.warn("[pond ipc] exportWebp failed", id, err);
      }
    }
    return { ok: true as const, exported, dir };
  }),

  "saves.exportCsv": query(IdListParams, async (params) => {
    const ids = params.ids.filter(Boolean);

    const db = await getDb();
    const rows =
      ids.length > 0
        ? await db.select().from(saves).where(inArray(saves.id, ids))
        : await db
            .select()
            .from(saves)
            .where(isNull(saves.deletedAt))
            .orderBy(desc(saves.savedAt));

    const columns = [
      "id",
      "source",
      "url",
      "title",
      "author",
      "description",
      "notes",
      "tags",
      "mediaType",
      "width",
      "height",
      "fileSize",
      "status",
      "savedAt",
    ];
    const records = rows.map((r) => [
      r.id,
      r.source,
      r.url,
      r.title,
      r.author,
      r.description,
      r.notes,
      r.tags,
      r.mediaType,
      r.width,
      r.height,
      r.fileSize,
      r.status,
      r.savedAt ? new Date(r.savedAt).toISOString() : "",
    ]);
    const csv = toCsv(records, columns);

    const picked = await dialog.showSaveDialog({
      defaultPath: "pond-export.csv",
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (picked.canceled || !picked.filePath) {
      return { ok: false as const, error: "canceled" };
    }
    await writeFile(picked.filePath, csv, "utf8");
    return { ok: true as const, count: rows.length, path: picked.filePath };
  }),
};
