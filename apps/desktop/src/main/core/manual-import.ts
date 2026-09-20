import { open, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import {
  type MediaType,
  type NewSave,
  type Save,
  type SaveFile,
  type Source,
  saves,
} from "@pond/schema/db";
import {
  classifyLibraryFile,
  type LibraryFileFormat,
  libraryFilename,
} from "@shared/file-format";
import { isAuxiliaryKind, THUMBNAIL_KIND } from "@shared/save-file-names";
import { and, eq } from "drizzle-orm";
import mime from "mime-types";
import sharp from "sharp";
import { ulid } from "ulid";
import { getDb } from "../db";
import { writeSaveInfo } from "../lib/library";
import { itemDir } from "../paths";
import { executeBatch, withMutationScope } from "./executor";
import { extractFontFamily } from "./font-metadata";
import { persistSave } from "./persist-save";
import type { WriteFileArgs } from "./pipeline/workers/apply";
import { ensureSaveThumbnail } from "./save-thumbnail";
import { libraryMediaMetadata } from "./security/library-media-storage";
import { normalizeTagList, prepareTagRegistryUpdates } from "./tags";

const MAX_TEXT_BODY_BYTES = 100_000;

export interface ManualSaveInput {
  title?: string | null;
  url?: string | null;
  note?: string | null;
  tags?: string[];
  filePaths?: string[];
  memoryFiles?: ManualSaveMemoryFile[];
  fileSourceUrls?: string[];
  /** Optional preview supplied by an external library such as Eagle. */
  thumbnailPath?: string | null;
  sourceId?: string | null;
  source?: Source;
  savedAt?: Date;
  createdAt?: Date;
  publishedAt?: Date;
  width?: number;
  height?: number;
  rating?: number | null;
  comments?: import("@pond/schema/db").ImageComment[];
  videoNotes?: import("@pond/schema/db").VideoNote[];
  dominantColors?: string[];
  mediaType?: MediaType | null;
}

export interface ManualSaveMemoryFile {
  bytes: Buffer;
  filename: string;
  mimeType: string;
}

export interface ManualSaveResult {
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

interface ReadableImport {
  filename: string;
  size: number;
  format: LibraryFileFormat;
  source: { path: string } | { bytes: Buffer };
  body?: string;
  width?: number;
  height?: number;
}

const MEDIA_TYPE_PRIORITY: readonly MediaType[] = [
  "image",
  "video",
  "audio",
  "document",
  "font",
  "text",
  "file",
];

export function mediaTypeForImportedFiles(
  formats: readonly LibraryFileFormat[],
): MediaType | null {
  if (formats.length === 0) return null;
  const counts = new Map<MediaType, number>();
  for (const item of formats) {
    counts.set(item.mediaType, (counts.get(item.mediaType) ?? 0) + 1);
  }
  let selected: MediaType = formats[0]?.mediaType ?? "file";
  let selectedCount = counts.get(selected) ?? 0;
  for (const candidate of MEDIA_TYPE_PRIORITY) {
    const count = counts.get(candidate) ?? 0;
    if (count > selectedCount) {
      selected = candidate;
      selectedCount = count;
    } else if (
      count === selectedCount &&
      count > 0 &&
      MEDIA_TYPE_PRIORITY.indexOf(candidate) <
        MEDIA_TYPE_PRIORITY.indexOf(selected)
    ) {
      selected = candidate;
    }
  }
  return selected;
}

export function classifyManualSave(input: {
  hasFiles: boolean;
  hasUrl: boolean;
  onlyTextFiles: boolean;
  title: string | null;
  textBody: string | null;
  mediaType?: MediaType | null;
  importedType: MediaType | null;
}):
  | { ok: false; error: "empty_input" }
  | { ok: true; isTextSave: boolean; mediaType: MediaType } {
  const forcedText = input.mediaType === "text";
  const isTextSave =
    !input.hasUrl &&
    (forcedText ||
      input.onlyTextFiles ||
      (!input.hasFiles && Boolean(input.textBody)));
  if (
    !input.hasFiles &&
    !input.title &&
    !input.textBody &&
    !input.hasUrl &&
    !forcedText
  ) {
    return { ok: false, error: "empty_input" };
  }
  return {
    ok: true,
    isTextSave,
    mediaType:
      input.importedType ?? (isTextSave ? "text" : (input.mediaType ?? "link")),
  };
}

export function storageKindForImport(
  format: LibraryFileFormat,
): SaveFile["kind"] {
  switch (format.mediaType) {
    case "image":
      if (format.previewKind === "generic") return "file";
      return "image";
    case "video":
      return "video";
    case "audio":
      return "audio";
    case "document":
      return "document";
    case "font":
      return "font";
    case "text":
      return "text_file";
    default:
      return "file";
  }
}

export async function createManualSave(
  input: ManualSaveInput,
): Promise<ManualSaveResult> {
  return withMutationScope(() => importManualSave(input));
}

async function importManualSave(
  input: ManualSaveInput,
): Promise<ManualSaveResult> {
  const db = await getDb();
  let id = ulid();
  let recovering = false;
  const source = input.source ?? "local";
  const overrideId = input.sourceId?.trim() || null;
  const sourceId = overrideId || id;
  const now = new Date();
  const requestedFileCount =
    (input.filePaths?.length ?? 0) + (input.memoryFiles?.length ?? 0);

  if (overrideId) {
    const existing = db
      .select()
      .from(saves)
      .where(and(eq(saves.source, source), eq(saves.sourceId, sourceId)))
      .all()[0];
    if (existing) {
      if (
        existing.deletedAt ||
        requestedFileCount === 0 ||
        (await importedFilesComplete(
          existing,
          itemDir(existing.id),
          requestedFileCount,
        ))
      )
        return { ok: true, id: existing.id, skipped: true };
      id = existing.id;
      recovering = true;
    }
  }

  const note = input.note?.trim() || null;
  const tags = normalizeTagList(input.tags ?? []);
  const readable = [
    ...(await inspectImportPaths(input.filePaths ?? [])),
    ...(await inspectMemoryFiles(input.memoryFiles ?? [])),
  ];

  if (requestedFileCount > 0 && readable.length === 0) {
    return { ok: false, error: "no_readable_files", skipped: true };
  }

  const title =
    input.title?.trim() ||
    (readable[0]
      ? basename(readable[0].filename, `.${readable[0].format.extension}`)
      : null);

  const importedText = readable
    .filter((item) => item.format.mediaType === "text")
    .map((item) => item.body?.trim())
    .filter((body): body is string => Boolean(body))
    .join("\n\n")
    .trim();

  const hasFiles = readable.length > 0;
  const hasUrl = Boolean(input.url?.trim());
  const onlyTextFiles =
    hasFiles && readable.every((item) => item.format.mediaType === "text");
  const textBody = (importedText || note)?.trim() || null;
  const classified = classifyManualSave({
    hasFiles,
    hasUrl,
    onlyTextFiles,
    title,
    textBody,
    mediaType: input.mediaType,
    importedType: mediaTypeForImportedFiles(
      readable.map((item) => item.format),
    ),
  });
  if (!classified.ok) return { ok: false, error: classified.error };

  const { isTextSave, mediaType } = classified;

  const insertValues: NewSave = {
    id,
    source,
    sourceId,
    url: input.url?.trim() || `pond:local/${id}`,
    title,
    description: isTextSave ? textBody : null,
    notes: isTextSave ? null : note,
    mediaType,
    siteName: null,
    status: hasFiles ? "ingesting" : "complete",
    tags,
    listKinds: ["saved"],
    files: [],
    coverIndex: 0,
    ingestStartedAt: now,
    ingestCompletedAt: hasFiles ? null : now,
    savedAt: input.savedAt ?? now,
    createdAt: input.createdAt ?? now,
    publishedAt: input.publishedAt,
  };
  if (input.width != null) insertValues.width = input.width;
  if (input.height != null) insertValues.height = input.height;
  if (input.rating != null) insertValues.rating = input.rating;
  if (input.comments) insertValues.comments = input.comments;
  if (input.videoNotes) insertValues.videoNotes = input.videoNotes;
  if (input.dominantColors) insertValues.dominantColors = input.dominantColors;
  const registry = await prepareTagRegistryUpdates(tags);
  if (!recovering) {
    await executeBatch([
      ...registry,
      {
        kind: "create",
        model: "save",
        id,
        data: insertValues,
        meta: { actor: "user", actorReason: "manual:create" },
      },
    ]);
  } else if (registry.length) {
    await executeBatch(registry);
  }

  if (hasFiles) {
    const newFiles: WriteFileArgs[] = readable.map((item) => {
      const kind = storageKindForImport(item.format);
      const metadata = {
        kind,
        filename: item.filename,
        sourceUrl:
          "path" in item.source
            ? input.fileSourceUrls?.[
                input.filePaths?.indexOf(item.source.path) ?? -1
              ]
            : undefined,
        mimeType: item.format.mimeType,
        width: item.width,
        height: item.height,
      };
      return "path" in item.source
        ? { ...metadata, sourcePath: item.source.path }
        : { ...metadata, bytes: item.source.bytes };
    });

    const customThumbnail = input.thumbnailPath
      ? await inspectCustomThumbnail(input.thumbnailPath)
      : null;
    if (customThumbnail) {
      const metadata = {
        kind: THUMBNAIL_KIND,
        filename: customThumbnail.filename,
        mimeType: customThumbnail.format.mimeType,
        width: customThumbnail.width,
        height: customThumbnail.height,
      };
      newFiles.push(
        "path" in customThumbnail.source
          ? { ...metadata, sourcePath: customThumbnail.source.path }
          : { ...metadata, bytes: customThumbnail.source.bytes },
      );
    }

    const fileSize = readable.reduce((sum, item) => sum + item.size, 0);
    const completed = await persistSave(
      id,
      { status: "complete", ingestCompletedAt: new Date(), fileSize },
      {
        actorReason: "manual:import",
        newFiles,
        replaceFilesWithKind: recovering
          ? [...new Set(newFiles.map((file) => file.kind))]
          : undefined,
      },
    );
    if (
      !completed ||
      !(await importedFilesComplete(completed, itemDir(id), readable.length))
    ) {
      await persistSave(
        id,
        { status: "failed", ingestCompletedAt: null },
        { actorReason: "manual:import-incomplete" },
      );
      return { ok: false, id, error: "incomplete_import" };
    }
    const font = readable.find((item) => item.format.mediaType === "font");
    if (font && "path" in font.source) {
      const family = await extractFontFamily(font.source.path);
      if (family) {
        const files = completed.files.map((file, index) =>
          index === 0 ? { ...file, family } : file,
        );
        const patch = input.title?.trim()
          ? { files }
          : { files, title: family };
        await persistSave(id, patch, { actorReason: "manual:font-family" });
      }
    }
    await ensureSaveThumbnail(id, completed);
  } else {
    const finalRow = (await db.select().from(saves).where(eq(saves.id, id)))[0];
    if (finalRow) await writeSaveInfo(finalRow);
  }

  return { ok: true, id };
}

async function inspectImportPaths(
  paths: readonly string[],
): Promise<ReadableImport[]> {
  const out: ReadableImport[] = [];
  for (const path of paths) {
    try {
      const info = await stat(path);
      if (!info.isFile() || info.size === 0) continue;
      const detectedMime = mime.lookup(path) || null;
      const format = classifyLibraryFile(path, detectedMime);
      const item: ReadableImport = {
        filename: libraryFilename(path),
        size: info.size,
        format,
        source: { path },
      };
      if (format.mediaType === "text") {
        item.body = await readTextBody(path, info.size);
      }
      if (format.mediaType === "image") {
        const dimensions = await readImageDimensions(path);
        if (dimensions.width) item.width = dimensions.width;
        if (dimensions.height) item.height = dimensions.height;
      }
      out.push(item);
    } catch {}
  }
  return out;
}

async function inspectMemoryFiles(
  files: readonly ManualSaveMemoryFile[],
): Promise<ReadableImport[]> {
  const out: ReadableImport[] = [];
  for (const file of files) {
    if (file.bytes.byteLength === 0) continue;
    const format = classifyLibraryFile(file.filename, file.mimeType);
    const item: ReadableImport = {
      filename: libraryFilename(file.filename),
      size: file.bytes.byteLength,
      format,
      source: { bytes: file.bytes },
    };
    if (format.mediaType === "image") {
      const dimensions = await readImageDimensions(file.bytes);
      if (dimensions.width) item.width = dimensions.width;
      if (dimensions.height) item.height = dimensions.height;
    }
    out.push(item);
  }
  return out;
}

async function inspectCustomThumbnail(
  path: string,
): Promise<ReadableImport | null> {
  const items = await inspectImportPaths([path]);
  const item = items[0];
  return item?.format.mediaType === "image" ? item : null;
}

async function readTextBody(path: string, size: number): Promise<string> {
  const length = Math.min(size, MAX_TEXT_BODY_BYTES);
  const buffer = Buffer.alloc(length);
  const handle = await open(path, "r");
  try {
    await handle.read(buffer, 0, length, 0);
  } finally {
    await handle.close();
  }
  return buffer.toString("utf8");
}

interface ImageDimensions {
  width?: number;
  height?: number;
}

async function readImageDimensions(
  source: string | Buffer,
): Promise<ImageDimensions> {
  try {
    const metadata = await sharp(source, {
      failOn: "none",
      pages: 1,
    }).metadata();
    const out: ImageDimensions = {};
    if (metadata.width) out.width = metadata.width;
    if (metadata.height) out.height = metadata.height;
    return out;
  } catch {
    return {};
  }
}

export async function importedFilesComplete(
  save: Pick<Save, "status" | "files">,
  directory: string,
  expected: number,
): Promise<boolean> {
  const originals = (save.files ?? []).filter(
    (file) => !isAuxiliaryKind(file.kind),
  );
  if (save.status !== "complete" || originals.length < expected) return false;
  for (const file of originals) {
    const actual = await libraryMediaMetadata(join(directory, file.path)).catch(
      () => null,
    );
    if (!actual || actual.originalSize !== file.size) return false;
  }
  return true;
}
