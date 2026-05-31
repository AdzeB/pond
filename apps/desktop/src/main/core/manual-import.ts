import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import {
  type MediaType,
  type NewSave,
  type SaveFile,
  saves,
  syncActions,
} from "@pond/schema/db";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { getDb } from "../db";
import { writeSaveInfo } from "../lib/library";
import { broadcastSyncAction } from "./executor";
import { applySavePatch } from "./pipeline/workers/apply";

const IMAGE_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};
const VIDEO_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
};

export const IMPORTABLE_EXTENSIONS: readonly string[] = [
  ...Object.keys(IMAGE_EXT),
  ...Object.keys(VIDEO_EXT),
].map((ext) => ext.slice(1));

function classifyExt(
  ext: string,
): { mediaType: MediaType; mimeType: string } | null {
  const lower = ext.toLowerCase();
  if (IMAGE_EXT[lower])
    return { mediaType: "image", mimeType: IMAGE_EXT[lower] };
  if (VIDEO_EXT[lower])
    return { mediaType: "video", mimeType: VIDEO_EXT[lower] };
  return null;
}

function blobFilename(
  mediaType: MediaType,
  ext: string,
  index: number,
): string {
  if (mediaType === "video") {
    return index === 0 ? `video${ext}` : `video-${index}${ext}`;
  }
  return index === 0 ? `cover${ext}` : `media-${index}${ext}`;
}

export interface ManualSaveInput {
  title?: string | null;
  url?: string | null;
  note?: string | null;
  tags?: string[];
  // Absolute paths on disk the main process can read.
  filePaths?: string[];
}

export interface ManualSaveResult {
  ok: boolean;
  id?: string;
  error?: string;
}

interface ReadableFile {
  path: string;
  mediaType: MediaType;
  mimeType: string;
  bytes: Buffer;
}

// Build a complete save from local input without touching the URL pipeline.
// Local saves carry their bytes and metadata at import time, so they are
// created already `complete` and never enqueue any pipeline ops.
export async function createManualSave(
  input: ManualSaveInput,
): Promise<ManualSaveResult> {
  const db = await getDb();
  const id = ulid();
  // ulid is collision-safe, so it doubles as the unique sourceId within
  // the (source="local") namespace.
  const sourceId = id;
  const now = new Date();

  const title = input.title?.trim() || null;
  const note = input.note?.trim() || null;
  const tags = normalizeTags(input.tags ?? []);

  const readable: ReadableFile[] = [];
  for (const path of input.filePaths ?? []) {
    const cls = classifyExt(extname(path));
    if (!cls) continue;
    try {
      const info = await stat(path);
      if (!info.isFile() || info.size === 0) continue;
      readable.push({ path, ...cls, bytes: await readFile(path) });
    } catch {
      // Skip unreadable files rather than failing the whole import.
    }
  }

  if (readable.length === 0 && !title && !note && !input.url) {
    return { ok: false, error: "empty_input" };
  }

  const hasFiles = readable.length > 0;
  const mediaType: MediaType = !hasFiles
    ? "link"
    : readable.length > 1
      ? "mixed"
      : (readable[0]?.mediaType ?? "image");

  const insertValues: NewSave = {
    id,
    source: "local",
    sourceId,
    url: input.url?.trim() || `pond:local/${id}`,
    title,
    notes: note,
    mediaType,
    status: hasFiles ? "ingesting" : "complete",
    tags,
    files: [],
    coverIndex: 0,
    ingestStartedAt: now,
    ingestCompletedAt: hasFiles ? null : now,
    savedAt: now,
    createdAt: now,
  };
  db.insert(saves).values(insertValues).run();

  const insertedAction = db
    .insert(syncActions)
    .values({
      modelName: "save",
      modelId: id,
      action: "I",
      data: insertValues as unknown,
      actor: "user",
      actorReason: "manual:create",
      batchId: ulid(),
    })
    .returning()
    .all()[0];
  if (insertedAction) broadcastSyncAction(insertedAction);

  if (hasFiles) {
    const newFiles = readable.map((file, index) => ({
      kind: kindFor(file.mediaType, index),
      filename: blobFilename(
        file.mediaType,
        extname(file.path).toLowerCase(),
        index,
      ),
      bytes: file.bytes,
      mimeType: file.mimeType,
    }));
    const fileSize = readable.reduce((sum, f) => sum + f.bytes.byteLength, 0);
    await applySavePatch(
      id,
      { status: "complete", ingestCompletedAt: new Date(), fileSize },
      { actorReason: "manual:import", newFiles },
    );
  }

  const finalRow = (await db.select().from(saves).where(eq(saves.id, id)))[0];
  if (finalRow) {
    await writeSaveInfo(finalRow);
    const { applyAutoTags } = await import("./auto-tag");
    await applyAutoTags(finalRow);
  }

  return { ok: true, id };
}

function kindFor(mediaType: MediaType, index: number): SaveFile["kind"] {
  if (mediaType === "video") return "video";
  return index === 0 ? "cover" : "media";
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.replace(/^#+/, "").trim().toLowerCase();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}
