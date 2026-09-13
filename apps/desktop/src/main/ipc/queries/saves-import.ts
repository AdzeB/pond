import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MEDIA_TYPES } from "@pond/schema/db";
import { BrowserWindow, clipboard, dialog } from "electron";
import log from "electron-log/main.js";
import mime from "mime-types";
import { z } from "zod";
import { isBlankDocumentKind } from "../../../shared/blank-documents";
import { classifyLibraryFile } from "../../../shared/file-format";
import type { QueryResult } from "../../../shared/query-contracts";
import {
  listInstalledBlankDocuments,
  writeBlankDocumentFile,
} from "../../core/blank-documents";
import { parseNetscapeBookmarks } from "../../core/bookmarks";
import {
  dryRunEagleLibrary,
  importEagleLibrary,
} from "../../core/eagle-import";
import { gifFramePng } from "../../core/gif-thumbnail";
import { importFiles } from "../../core/import-files";
import { createManualSave } from "../../core/manual-import";
import { extractPageAssets } from "../../core/page-extract";
import { persistSave } from "../../core/persist-save";
import { enqueue, normalizeUrl } from "../../core/pipeline/enqueue";
import { classifyUrlToSource } from "../../core/pipeline/extractors";
import { UnsupportedError } from "../../core/pipeline/extractors/errors";
import { importPondPackage } from "../../core/pond-package";
import {
  ensureSaveThumbnail,
  persistSaveThumbnail,
  renderThumbnailPng,
  THUMBNAIL_REPLACE_KINDS,
} from "../../core/save-thumbnail";
import { srtToVtt } from "../../core/subtitles";
import { setSaveTags } from "../../core/tags";
import { runTransferJob } from "../../core/transfer-jobs";
import { copySaveSelectionToLibrary } from "../../core/transfer-operations";
import { libraryRoot } from "../../paths";
import { resolvePondItemPath, resolveSaveFilePath } from "../helpers";
import { pickImportPaths } from "./import-picker";
import {
  FileIndexParam,
  NullableStringParam,
  OptionalNumberParam,
  type QueryHandlerMap,
  query,
  StringListParam,
  StringParam,
} from "./params";

async function importFilesImpl(
  paths: string[],
  tags: string[] = [],
  folderIds: string[] = [],
): Promise<{ ok: boolean; ids: string[]; error?: string }> {
  return importFiles({ paths, tags, folderIds });
}

/** Finder/Explorer put file refs on the native pasteboard; Chromium's `clipboardData.files` is often empty. */
function clipboardFilePaths(): string[] {
  const out: string[] = [];
  const pushFileUrl = (raw: string) => {
    const token = raw.trim();
    if (!token.startsWith("file:")) return;
    try {
      out.push(fileURLToPath(token));
    } catch {}
  };

  try {
    const formats = clipboard.availableFormats();
    if (formats.includes("public.file-url")) {
      const buf = clipboard.readBuffer("public.file-url").toString("utf8");
      for (const part of buf.split(/[\r\n\0]+/)) pushFileUrl(part);
    }
  } catch (err) {
    log.warn("[pond ipc] clipboard file-url read failed", err);
  }

  const text = clipboard.readText();
  for (const part of text.split(/\s+/).filter(Boolean)) {
    if (part.startsWith("file:")) pushFileUrl(part);
    else if (isAbsolute(part)) out.push(part);
  }

  return [...new Set(out)];
}

export const savesImportQueries = {
  "saves.copyToLibrary": query(
    z.object({ ids: StringListParam }),
    async ({ ids }) => {
      const picked = await dialog.showOpenDialog({
        title: "Copy to Library",
        buttonLabel: "Copy",
        properties: ["openDirectory", "openFile"],
      });
      const target = picked.filePaths[0];
      if (picked.canceled || !target) return { ok: false, error: "canceled" };
      try {
        return {
          ok: true,
          ...(await runTransferJob(
            {
              kind: "copy_library",
              origin: libraryRoot(),
              destination: target,
              ids,
            },
            () => copySaveSelectionToLibrary(ids, target),
          )),
        };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "Could not copy Saves.",
        };
      }
    },
  ),

  async "saves.importPackage"() {
    const picked = await dialog.showOpenDialog({
      title: "Import Pond Package",
      buttonLabel: "Import",
      properties: ["openDirectory", "openFile"],
    });
    if (picked.canceled || !picked.filePaths[0])
      return { ok: false, error: "canceled" };
    try {
      const source = picked.filePaths[0];
      return {
        ok: true,
        ...(await runTransferJob(
          {
            kind: "import_package",
            origin: libraryRoot(),
            source,
            destination: libraryRoot(),
          },
          () => importPondPackage(source),
        )),
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Package import failed.",
      };
    }
  },

  "saves.pickImportPaths": query(
    z.object({ kind: z.enum(["files", "folders"]) }),
    (params) => pickImportPaths(params.kind),
  ),

  "saves.classifyUrl": query(z.object({ url: StringParam }), (params) => {
    const url = params.url.trim();
    if (!url) return { source: null };
    const { source } = classifyUrlToSource(normalizeUrl(url));
    return { source };
  }),

  "saves.importFiles": query(
    z.object({
      paths: StringListParam,
      tags: StringListParam,
      folderIds: StringListParam,
    }),
    async (params) => {
      const paths = params.paths.filter(Boolean);
      if (paths.length === 0) return { ok: false, error: "no_files" };
      return importFilesImpl(paths, params.tags, params.folderIds);
    },
  ),

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
    z.object({
      title: NullableStringParam,
      url: NullableStringParam,
      note: NullableStringParam,
      tags: StringListParam,
      filePaths: StringListParam,
      sourceId: NullableStringParam,
      mediaType: z.enum(MEDIA_TYPES).nullable().optional(),
      width: OptionalNumberParam,
      height: OptionalNumberParam,
    }),
    async (params): Promise<QueryResult<"saves.createManual">> => {
      const input: Parameters<typeof createManualSave>[0] = {
        title: params.title,
        url: params.url,
        note: params.note,
        tags: params.tags,
        filePaths: params.filePaths,
        sourceId: params.sourceId,
        mediaType: params.mediaType,
      };
      if (params.width != null && Number.isFinite(params.width)) {
        input.width = params.width;
      }
      if (params.height != null && Number.isFinite(params.height)) {
        input.height = params.height;
      }
      return createManualSave(input);
    },
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

  async "saves.pickEagleLibrary"() {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const opts = {
      properties: ["openDirectory" as const],
      message: "Choose an Eagle library folder",
    };
    const result = win
      ? await dialog.showOpenDialog(win, opts)
      : await dialog.showOpenDialog(opts);
    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, path: null };
    }
    return { ok: true, path: result.filePaths[0] };
  },

  "saves.importEagleLibrary": query(
    z.object({ path: StringParam, dryRun: z.boolean().optional() }),
    async (params) => {
      const path = params.path.trim();
      if (!path)
        return {
          ok: false,
          error: "no_path",
          imported: 0,
          skipped: 0,
          failed: 0,
          deletedSkipped: 0,
          lockedFolders: [],
          droppedFields: [],
        };
      if (params.dryRun) return dryRunEagleLibrary(path);
      return importEagleLibrary(path);
    },
  ),

  async "saves.importClipboard"() {
    const filePaths = clipboardFilePaths();
    if (filePaths.length > 0) return importFilesImpl(filePaths);

    const img = clipboard.readImage();
    if (img.isEmpty()) return { ok: false, error: "empty_clipboard", ids: [] };

    try {
      const dir = await mkdtemp(join(tmpdir(), "pond-clip-"));
      const path = join(dir, "clipboard.png");
      await writeFile(path, img.toPNG());
      return importFilesImpl([path]);
    } catch (err) {
      log.warn("[pond ipc] importClipboard failed", err);
      return { ok: false, error: "clipboard_write_failed", ids: [] };
    }
  },

  "saves.startDrag": query(
    z.object({
      id: StringParam,
      ids: StringListParam,
      fileIndex: FileIndexParam,
    }),
    async (params, event) => {
      const ids = [
        ...new Set(
          (params.ids.length > 0 ? params.ids : [params.id]).filter(Boolean),
        ),
      ];
      if (ids.length === 0 || !event) return { ok: false };
      const files: string[] = [];
      for (const id of ids) {
        const target = await resolveSaveFilePath(id, params.fileIndex);
        if (target.ok) files.push(target.path);
      }
      if (files.length === 0) return { ok: false };
      try {
        const { nativeImage } = await import("electron");
        const first = files[0] ?? "";
        let icon = nativeImage.createFromPath(first);
        if (icon.isEmpty()) icon = nativeImage.createEmpty();
        else icon = icon.resize({ width: 72, height: 72, quality: "better" });
        if (files.length === 1) {
          event.sender.startDrag({ file: first, icon });
        } else {
          event.sender.startDrag({ file: first, files, icon });
        }
        return { ok: true };
      } catch (err) {
        log.warn("[pond ipc] startDrag failed", err);
        return { ok: false };
      }
    },
  ),

  "saves.quickAdd": query(
    z.object({
      url: StringParam,
      note: NullableStringParam,
      tags: StringListParam,
    }),
    async (params) => {
      const url = params.url.trim();
      const note = params.note?.trim() || null;
      const tags = params.tags;

      if (!url) {
        const res = await createManualSave({ title: note, note, tags });
        return res.ok
          ? { ok: true, id: res.id }
          : { ok: false, error: res.error ?? "empty_input" };
      }
      try {
        const result = await enqueue(url, { trigger: "user:quickAdd" });
        if (tags.length > 0) await setSaveTags(result.id, tags);
        if (note) {
          await persistSave(
            result.id,
            { notes: note },
            { actorReason: "user:quickAdd-note" },
          );
        }
        return { ok: true, id: result.id, created: result.created };
      } catch (err) {
        if (err instanceof UnsupportedError) {
          const res = await createManualSave({
            url,
            title: note ?? url,
            note,
            tags,
          });
          return res.ok
            ? { ok: true, id: res.id }
            : { ok: false, error: "unsupported_url" };
        }
        log.error("[pond ipc] quickAdd failed", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  ),

  async "saves.importBookmarks"() {
    const win = BrowserWindow.getFocusedWindow();
    const options = {
      properties: ["openFile" as const],
      message: "Choose a bookmark HTML file",
      filters: [{ name: "Bookmarks", extensions: ["html", "htm"] }],
    };
    const picked = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    const path = picked.filePaths[0];
    if (picked.canceled || !path) return { ok: false, imported: 0, skipped: 0 };
    const html = await readFile(path, "utf8");
    const urls = parseNetscapeBookmarks(html);
    let imported = 0;
    const failed: string[] = [];
    for (const url of urls) {
      try {
        await enqueue(url, { trigger: "user:importBookmarks" });
        imported += 1;
      } catch {
        failed.push(url);
      }
    }
    return { ok: imported > 0, imported, skipped: failed.length };
  },

  "saves.extractPageAssets": query(
    z.object({ url: StringParam }),
    async (params) => {
      const url = params.url.trim();
      if (!url) return { ok: false, imported: 0, skipped: 0, error: "empty" };
      return extractPageAssets(url);
    },
  ),
} satisfies QueryHandlerMap;
