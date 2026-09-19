import { readFile, stat } from "node:fs/promises";
import { BrowserWindow, dialog } from "electron";
import mime from "mime-types";
import { z } from "zod";
import { isBlankDocumentKind } from "../../../shared/blank-documents";
import { classifyLibraryFile } from "../../../shared/file-format";
import type { QueryResult } from "../../../shared/query-contracts";
import {
  listInstalledBlankDocuments,
  writeBlankDocumentFile,
} from "../../core/blank-documents";
import { gifFramePng } from "../../core/gif-thumbnail";
import { createManualSave } from "../../core/manual-import";
import { persistSave } from "../../core/persist-save";
import {
  ensureSaveThumbnail,
  persistSaveThumbnail,
  renderThumbnailPng,
  THUMBNAIL_REPLACE_KINDS,
} from "../../core/save-thumbnail";
import { srtToVtt } from "../../core/subtitles";
import { resolvePondItemPath } from "../helpers";
import {
  NullableStringParam,
  type QueryHandlerMap,
  query,
  StringListParam,
  StringParam,
} from "./params";
import {
  CreateManualParamsSchema,
  normalizeManualSaveInput,
} from "./saves-import-input";

export const savesImportPersistenceQueries = {
  "saves.setCustomThumbnail": query(
    z.object({ id: StringParam }),
    async (params) => {
      const win = BrowserWindow.getFocusedWindow() ?? undefined;
      const options = {
        properties: ["openFile" as const],
        message: "Choose a thumbnail",
        filters: [
          {
            name: "Images",
            extensions: [
              "jpg",
              "jpeg",
              "png",
              "webp",
              "avif",
              "gif",
              "heic",
              "heif",
              "jxl",
              "tif",
              "tiff",
            ],
          },
        ],
      };
      const result = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options);
      const path = result.filePaths[0];
      if (result.canceled || !path) return { ok: false, canceled: true };
      const format = classifyLibraryFile(path, mime.lookup(path) || null);
      if (format.mediaType !== "image") {
        return { ok: false, error: "not_an_image" };
      }
      const fileInfo = await stat(path).catch(() => null);
      if (!fileInfo?.isFile() || fileInfo.size === 0) {
        return { ok: false, error: "empty_file" };
      }
      const bytes = await renderThumbnailPng(await readFile(path));
      if (!bytes) return { ok: false, error: "not_an_image" };
      const updated = await persistSaveThumbnail(
        params.id,
        bytes,
        "user:set-thumbnail",
      );
      return { ok: Boolean(updated) };
    },
  ),

  "saves.setGifThumbnail": query(
    z.object({
      id: StringParam,
      src: StringParam,
      frameIndex: z.number().int().min(0),
    }),
    async (params) => {
      const resolved = resolvePondItemPath(params.src);
      if (
        !resolved ||
        resolved.saveId.toLowerCase() !== params.id.toLowerCase()
      ) {
        return { ok: false, error: "missing_file" };
      }
      const png = await gifFramePng(resolved.path, params.frameIndex);
      const updated = await persistSaveThumbnail(
        params.id,
        png,
        "user:set-gif-thumbnail",
      );
      return { ok: Boolean(updated) };
    },
  ),

  "saves.loadSubtitles": query(
    z.object({ id: StringParam }),
    async (params) => {
      const win = BrowserWindow.getFocusedWindow() ?? undefined;
      const options = {
        properties: ["openFile" as const],
        message: "Choose a subtitle file",
        filters: [{ name: "Subtitles", extensions: ["vtt", "srt"] }],
      };
      const result = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options);
      const path = result.filePaths[0];
      if (result.canceled || !path) return { ok: false, canceled: true };
      const raw = await readFile(path, "utf8");
      const vtt = srtToVtt(raw);
      const updated = await persistSave(
        params.id,
        {},
        {
          actorReason: "user:load-subtitles",
          replaceFilesWithKind: "subtitle",
          newFiles: [
            {
              kind: "subtitle",
              filename: "subtitles.vtt",
              mimeType: "text/vtt",
              bytes: Buffer.from(vtt, "utf8"),
            },
          ],
        },
      );
      return { ok: Boolean(updated) };
    },
  ),

  "saves.replaceFile": query(z.object({ id: StringParam }), async (params) => {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const options = {
      properties: ["openFile" as const],
      message: "Choose a replacement file",
    };
    const picked = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    const path = picked.filePaths[0];
    if (picked.canceled || !path) return { ok: false, canceled: true };
    const { replaceSaveFile } = await import("../../core/replace-file");
    return replaceSaveFile({ id: params.id, sourcePath: path });
  }),

  "saves.removeCustomThumbnail": query(
    z.object({ id: StringParam }),
    async (params) => {
      const updated = await persistSave(
        params.id,
        {},
        {
          actorReason: "user:remove-thumbnail",
          replaceFilesWithKind: THUMBNAIL_REPLACE_KINDS,
        },
      );
      if (updated) await ensureSaveThumbnail(params.id, updated);
      return { ok: Boolean(updated) };
    },
  ),

  "saves.createManual": query(
    CreateManualParamsSchema,
    async (params): Promise<QueryResult<"saves.createManual">> =>
      createManualSave(normalizeManualSaveInput(params)),
  ),

  "saves.listBlankDocuments": query(z.object({}), async () => ({
    kinds: listInstalledBlankDocuments(),
  })),

  "saves.createBlankDocument": query(
    z.object({
      kind: z.string(),
      folderId: NullableStringParam,
    }),
    async (params): Promise<QueryResult<"saves.createBlankDocument">> => {
      if (!isBlankDocumentKind(params.kind)) return { ok: false };
      const path = await writeBlankDocumentFile(params.kind);
      if (!path) return { ok: false };
      const created = await createManualSave({
        title: null,
        filePaths: [path],
      });
      if (!created.ok || !created.id) return { ok: false };
      if (params.folderId) {
        const { addSavesToFolder } = await import("../../core/folders");
        await addSavesToFolder(params.folderId, [created.id]);
      }
      return { ok: true, id: created.id };
    },
  ),

  "saves.combineImages": query(
    z.object({
      ids: StringListParam,
      folderId: NullableStringParam,
    }),
    async (params) => {
      const { combineImages } = await import("../../core/combine-images");
      return combineImages({
        ids: params.ids,
        folderId: params.folderId || null,
      });
    },
  ),
} satisfies QueryHandlerMap;
