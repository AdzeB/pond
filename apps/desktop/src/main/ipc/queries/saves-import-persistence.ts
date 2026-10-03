import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";
import { saves } from "@pond/schema/db";
import { eq } from "drizzle-orm";
import { app, BrowserWindow, dialog, nativeImage } from "electron";
import mime from "mime-types";
import { z } from "zod";
import { isBlankDocumentKind } from "../../../shared/blank-documents";
import { CombineImagesOptionsSchema } from "../../../shared/combine-images-contracts";
import { classifyLibraryFile } from "../../../shared/file-format";
import type { QueryResult } from "../../../shared/query-contracts";
import {
  listInstalledBlankDocumentApps,
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
import { readLibraryMedia } from "../../core/storage/library-media-storage";
import { srtToVtt } from "../../core/subtitles";
import { getDb } from "../../db";
import { itemFile } from "../../paths";
import { resolvePondItemPath } from "../helpers";
import {
  NullableStringParam,
  type QueryHandlerMap,
  query,
  StringListParam,
  StringParam,
} from "./params";
import { readClipboardImage } from "./saves-import-clipboard";
import {
  CreateManualParamsSchema,
  normalizeManualSaveInput,
} from "./saves-import-input";

const LottieAnimationSchema = z
  .object({ layers: z.array(z.unknown()) })
  .passthrough();
const blankDocumentIconCache = new Map<string, string | null>();
const run = promisify(execFile);

async function readBundleIcon(path: string) {
  try {
    const { stdout } = await run(
      "/usr/bin/plutil",
      [
        "-extract",
        "CFBundleIconFile",
        "raw",
        join(path, "Contents/Info.plist"),
      ],
      { timeout: 3000 },
    );
    const configured = basename(stdout.trim());
    if (!configured) return null;
    const filename = configured.endsWith(".icns")
      ? configured
      : `${configured}.icns`;
    const iconPath = join(path, "Contents/Resources", filename);
    const scratch = await mkdtemp(join(tmpdir(), "pond-app-icon-"));
    try {
      const pngPath = join(scratch, "icon.png");
      await run(
        "/usr/bin/sips",
        ["-s", "format", "png", iconPath, "--out", pngPath],
        { timeout: 5000 },
      );
      const icon = nativeImage.createFromBuffer(await readFile(pngPath));
      return icon.isEmpty() ? null : icon;
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  } catch {
    return null;
  }
}

async function blankDocumentIcon(path: string): Promise<string | null> {
  if (blankDocumentIconCache.has(path)) {
    return blankDocumentIconCache.get(path) ?? null;
  }
  try {
    const icon =
      (await readBundleIcon(path)) ??
      (await app.getFileIcon(path, { size: "normal" }));
    const sized = icon.isEmpty()
      ? icon
      : icon.resize({ width: 32, height: 32, quality: "best" });
    const dataUrl = sized.isEmpty() ? null : sized.toDataURL();
    blankDocumentIconCache.set(path, dataUrl);
    return dataUrl;
  } catch {
    blankDocumentIconCache.set(path, null);
    return null;
  }
}

async function listBlankDocuments() {
  const documents = listInstalledBlankDocumentApps();
  const iconEntries = await Promise.all(
    documents.map(async ({ kind, path }) => {
      const icon = await blankDocumentIcon(path);
      return icon ? ([kind, icon] as const) : null;
    }),
  );
  return {
    kinds: documents.map((document) => document.kind),
    icons: Object.fromEntries(iconEntries.filter((entry) => entry != null)),
  };
}

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

  "saves.setThumbnailFromClipboard": query(
    z.object({ id: StringParam }),
    async ({ id }) => {
      const image = await readClipboardImage();
      if (image.isEmpty()) return { ok: false, error: "clipboard_empty" };
      const bytes = await renderThumbnailPng(image.toPNG());
      if (!bytes) return { ok: false, error: "not_an_image" };
      const updated = await persistSaveThumbnail(
        id,
        bytes,
        "user:set-thumbnail-from-clipboard",
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
      const png = await gifFramePng(
        await readLibraryMedia(resolved.path),
        params.frameIndex,
      );
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

  "saves.exportDotLottie": query(
    z.object({ id: StringParam, fileIndex: z.number().int().nonnegative() }),
    async ({ id, fileIndex }) => {
      const db = await getDb();
      const row = db.select().from(saves).where(eq(saves.id, id)).get();
      const file = row?.files[fileIndex];
      if (!row || !file || !/\.json$/i.test(file.path))
        return { ok: false, error: "Choose a Lottie JSON file." };
      const bytes = await readLibraryMedia(itemFile(id, file.path));
      let source: unknown;
      try {
        source = JSON.parse(bytes.toString("utf8"));
      } catch {
        return { ok: false, error: "This file does not contain valid JSON." };
      }
      const animation = LottieAnimationSchema.safeParse(source);
      if (!animation.success)
        return {
          ok: false,
          error: "This JSON file is not a Lottie animation.",
        };
      const defaultName = `${basename(
        row.title?.trim() || file.path,
        extname(row.title?.trim() || file.path),
      )}.lottie`;
      const picked = await dialog.showSaveDialog({
        title: "Export dotLottie",
        defaultPath: defaultName,
        filters: [{ name: "dotLottie", extensions: ["lottie"] }],
      });
      if (picked.canceled || !picked.filePath)
        return { ok: false, canceled: true };
      const { default: JSZip } = await import("jszip");
      const archive = new JSZip();
      archive.file(
        "manifest.json",
        JSON.stringify({
          version: "1.0",
          generator: "Pond",
          animations: [{ id: "animation", loop: true, speed: 1 }],
        }),
      );
      archive.file("animations/animation.json", JSON.stringify(animation.data));
      await writeFile(
        picked.filePath,
        await archive.generateAsync({
          type: "nodebuffer",
          compression: "DEFLATE",
        }),
      );
      return { ok: true };
    },
  ),

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

  "saves.listBlankDocuments": query(z.object({}), listBlankDocuments),

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
      options: CombineImagesOptionsSchema.partial().optional(),
    }),
    async (params) => {
      const { combineImages } = await import("../../core/combine-images");
      const options = CombineImagesOptionsSchema.parse(params.options ?? {});
      if (options.output === "export" && !options.outputPath) {
        const extension = options.format === "jpeg" ? "jpg" : options.format;
        const picked = await dialog.showSaveDialog({
          title: "Export Combined Image",
          defaultPath: `Combined Images.${extension}`,
          filters: [
            {
              name: options.format.toUpperCase(),
              extensions: [extension],
            },
          ],
        });
        if (picked.canceled || !picked.filePath)
          return { ok: false, error: "canceled" };
        options.outputPath = picked.filePath;
      }
      return combineImages({
        ids: params.ids,
        folderId: params.folderId || null,
        options,
      });
    },
  ),
} satisfies QueryHandlerMap;
