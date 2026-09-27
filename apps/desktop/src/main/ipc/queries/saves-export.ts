import { basename, dirname, extname } from "node:path";
import { saves } from "@pond/schema/db";
import { desc, eq, inArray, isNull } from "drizzle-orm";
import { BrowserWindow, dialog } from "electron";
import log from "electron-log/main.js";
import sharp from "sharp";
import { z } from "zod";
import { copyExportFile, writeExportFile } from "../../core/export-files";
import {
  exportSavesToDirectory,
  exportSavesToEaglePackage,
} from "../../core/export-saves";
import { exportPondPackage } from "../../core/pond-package";
import {
  materializeLibraryMediaForExternalUse,
  withDecryptedLibraryMediaPath,
} from "../../core/storage/library-media-storage";
import { runTransferJob } from "../../core/transfer-jobs";
import { getDb } from "../../db";
import { toCsv } from "../../lib/csv";
import { showNativeShareMenu } from "../../lib/native-share";
import { libraryRoot } from "../../paths";
import { resolveSaveFilePath } from "../helpers";
import {
  FileIndexParam,
  type QueryHandlerMap,
  query,
  StringListParam,
  StringParam,
} from "./params";

const IdListParams = z.object({ ids: StringListParam });

export const savesExportQueries = {
  "saves.exportEaglePackage": query(IdListParams, async ({ ids }) => {
    const picked = await dialog.showSaveDialog({
      title: "Export Eagle Package",
      defaultPath: "Saves.eaglepack",
      buttonLabel: "Export",
    });
    if (picked.canceled || !picked.filePath)
      return { ok: false, error: "canceled" };
    try {
      const destination = picked.filePath.endsWith(".eaglepack")
        ? picked.filePath
        : `${picked.filePath}.eaglepack`;
      return {
        ok: true,
        ...(await runTransferJob(
          {
            kind: "export_eagle_package",
            origin: libraryRoot(),
            destination,
            ids,
          },
          () => exportSavesToEaglePackage(ids, destination),
        )),
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Eagle package export failed.",
      };
    }
  }),

  "saves.exportPackage": query(IdListParams, async ({ ids }) => {
    const picked = await dialog.showSaveDialog({
      title: "Export Pond Package",
      defaultPath: "Saves.pondpack",
      buttonLabel: "Export",
    });
    if (picked.canceled || !picked.filePath)
      return { ok: false, error: "canceled" };
    try {
      const destination = picked.filePath.endsWith(".pondpack")
        ? picked.filePath
        : `${picked.filePath}.pondpack`;
      return {
        ok: true,
        ...(await runTransferJob(
          { kind: "export_package", origin: libraryRoot(), destination, ids },
          () => exportPondPackage(ids, destination),
        )),
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Package export failed.",
      };
    }
  }),

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
        const path = await copyExportFile(
          target.path,
          dirname(result.filePath),
          basename(result.filePath),
        );
        return { ok: true as const, path };
      } catch (err) {
        log.warn("[pond ipc] saves.exportFile failed", err);
        return { ok: false as const, reason: "internal_error" as const };
      }
    },
  ),

  "saves.share": query(
    z.object({ id: StringParam, fileIndex: FileIndexParam }),
    async (params, event) => {
      const target = await resolveSaveFilePath(params.id, params.fileIndex);
      if (!target.ok) {
        return { ok: false, error: "This save has no file to share." };
      }
      if (process.platform !== "darwin") {
        return { ok: false, error: "Share is unavailable on this Mac." };
      }
      try {
        const parentWindow = event
          ? BrowserWindow.fromWebContents(event.sender)
          : null;
        showNativeShareMenu(
          await materializeLibraryMediaForExternalUse(target.path),
          parentWindow ?? undefined,
        );
        return { ok: true };
      } catch (error) {
        log.warn("[pond ipc] saves.share failed", error);
        return { ok: false, error: "Couldn’t share this file." };
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

    const { exported } = await runTransferJob(
      { kind: "export_files", origin: libraryRoot(), destination: dir, ids },
      () => exportSavesToDirectory(ids, dir),
    );
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
        const bytes = await withDecryptedLibraryMediaPath(
          target.path,
          (source) => sharp(source).webp({ quality: 80 }).toBuffer(),
        );
        await writeExportFile(dir, `${id}.webp`, bytes);
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
    const path = await writeExportFile(
      dirname(picked.filePath),
      basename(picked.filePath),
      csv,
    );
    return { ok: true as const, count: rows.length, path };
  }),
} satisfies QueryHandlerMap;
