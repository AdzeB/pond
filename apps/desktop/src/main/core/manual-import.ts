import { open, stat } from "node:fs/promises";
import { basename } from "node:path";
import {
  type MediaType,
  type NewSave,
  type SaveFile,
  type Source,
  saves,
  syncActions,
} from "@pond/schema/db";
import {
  classifyLibraryFile,
  type LibraryFileFormat,
  libraryFilename,
} from "@shared/file-format";
import { and, eq } from "drizzle-orm";
import mime from "mime-types";
import sharp from "sharp";
import { ulid } from "ulid";
import { getDb } from "../db";
import { writeSaveInfo } from "../lib/library";
import { broadcastSyncAction } from "./executor";
import { persistSave } from "./persist-save";
import { normalizeTagList } from "./tags";

const MAX_TEXT_BODY_BYTES = 100_000;

export interface ManualSaveInput {
  title?: string | null;
  url?: string | null;
  note?: string | null;
  tags?: string[];
  filePaths?: string[];
  /** Optional preview supplied by an external library such as Eagle. */
  customThumbnailPath?: string | null;
  sourceId?: string | null;
  source?: Source;
  width?: number;
  height?: number;
  rating?: number | null;
  comments?: import("@pond/schema/db").ImageComment[];
  videoNotes?: import("@pond/schema/db").VideoNote[];
  dominantColors?: string[];
}

interface ManualSaveResult {
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

interface ReadableImport {
  path: string;
  filename: string;
  size: number;
  format: LibraryFileFormat;
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

export function storageKindForImport(
  format: LibraryFileFormat,
  imageIndex: number,
): SaveFile["kind"] {
  switch (format.mediaType) {
    case "image":
      if (format.previewKind === "generic") return "file";
      return imageIndex === 0 ? "cover" : "media";
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
  const db = await getDb();
  const id = ulid();
  const source = input.source ?? "local";
  const overrideId = input.sourceId?.trim() || null;
  const sourceId = overrideId || id;
  const now = new Date();

  if (overrideId) {
    const existing = db
      .select({ id: saves.id })
      .from(saves)
      .where(and(eq(saves.source, source), eq(saves.sourceId, sourceId)))
      .all()[0];
    if (existing) return { ok: true, id: existing.id, skipped: true };
  }

  const note = input.note?.trim() || null;
  const tags = normalizeTagList(input.tags ?? []);
  const readable = await inspectImportPaths(input.filePaths ?? []);

  if ((input.filePaths?.length ?? 0) > 0 && readable.length === 0) {
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
  const isTextSave =
    !hasUrl && (onlyTextFiles || (!hasFiles && Boolean(textBody)));

  if (!hasFiles && !title && !textBody && !hasUrl) {
    return { ok: false, error: "empty_input" };
  }

  const mediaType: MediaType =
    mediaTypeForImportedFiles(readable.map((item) => item.format)) ??
    (isTextSave ? "text" : "link");

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
    status: "complete",
    tags,
    listKinds: ["saved"],
    files: [],
    coverIndex: 0,
    ingestStartedAt: now,
    ingestCompletedAt: now,
    savedAt: now,
    createdAt: now,
  };
  if (input.width != null) insertValues.width = input.width;
  if (input.height != null) insertValues.height = input.height;
  if (input.rating != null) insertValues.rating = input.rating;
  if (input.comments) insertValues.comments = input.comments;
  if (input.videoNotes) insertValues.videoNotes = input.videoNotes;
  if (input.dominantColors) insertValues.dominantColors = input.dominantColors;
  db.insert(saves).values(insertValues).run();

  const insertedAction = db
    .insert(syncActions)
    .values({
      modelName: "save",
      modelId: id,
      action: "I",
      data: insertValues,
      actor: "user",
      actorReason: "manual:create",
      batchId: ulid(),
    })
    .returning()
    .all()[0];
  if (insertedAction) broadcastSyncAction(insertedAction);

  if (hasFiles) {
    let imageIndex = 0;
    const newFiles = readable.map((item) => {
      const kind = storageKindForImport(item.format, imageIndex);
      if (
        item.format.mediaType === "image" &&
        item.format.previewKind !== "generic"
      ) {
        imageIndex += 1;
      }
      return {
        kind,
        filename: item.filename,
        sourcePath: item.path,
        mimeType: item.format.mimeType,
        width: item.width,
        height: item.height,
      };
    });

    const customThumbnail = input.customThumbnailPath
      ? await inspectCustomThumbnail(input.customThumbnailPath)
      : null;
    if (customThumbnail) {
      newFiles.push({
        kind: "custom_thumbnail",
        filename: customThumbnail.filename,
        sourcePath: customThumbnail.path,
        mimeType: customThumbnail.format.mimeType,
        width: customThumbnail.width,
        height: customThumbnail.height,
      });
    }

    const fileSize = readable.reduce((sum, item) => sum + item.size, 0);
    await persistSave(
      id,
      { status: "complete", ingestCompletedAt: new Date(), fileSize },
      { actorReason: "manual:import", newFiles },
    );
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
        path,
        filename: libraryFilename(path),
        size: info.size,
        format,
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

async function readImageDimensions(
  path: string,
): Promise<{ width?: number; height?: number }> {
  try {
    const metadata = await sharp(path, {
      failOn: "none",
      pages: 1,
    }).metadata();
    const out: { width?: number; height?: number } = {};
    if (metadata.width) out.width = metadata.width;
    if (metadata.height) out.height = metadata.height;
    return out;
  } catch {
    return {};
  }
}
