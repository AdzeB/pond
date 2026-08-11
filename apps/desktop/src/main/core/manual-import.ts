import { open, readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import {
  type MediaType,
  type NewSave,
  type SaveFile,
  type Source,
  saves,
  syncActions,
} from "@pond/schema/db";
import { majorityMediaType } from "@pond/schema/media-type";
import { and, eq } from "drizzle-orm";
import { ulid } from "ulid";
import { getDb } from "../db";
import { writeSaveInfo } from "../lib/library";
import { broadcastSyncAction } from "./executor";
import { persistSave } from "./persist-save";
import { normalizeTagList } from "./tags";

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
const TEXT_EXT = new Set([".txt", ".md", ".markdown"]);

/** Cap imported text bodies so a huge markdown dump cannot blow memory or covers. */
const MAX_TEXT_BODY_BYTES = 100_000;

type Classified =
  | { kind: "image" | "video"; mediaType: "image" | "video"; mimeType: string }
  | { kind: "text" };

function classifyExt(ext: string): Classified | null {
  const lower = ext.toLowerCase();
  if (IMAGE_EXT[lower]) {
    return {
      kind: "image",
      mediaType: "image",
      mimeType: IMAGE_EXT[lower],
    };
  }
  if (VIDEO_EXT[lower]) {
    return {
      kind: "video",
      mediaType: "video",
      mimeType: VIDEO_EXT[lower],
    };
  }
  if (TEXT_EXT.has(lower)) {
    return { kind: "text" };
  }
  return null;
}

function blobFilename(
  mediaType: "image" | "video",
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
  /** Absolute paths on disk the main process can read. */
  filePaths?: string[];
  /** Override the local sourceId (e.g. eagle:<id> for idempotent re-import). */
  sourceId?: string | null;
  source?: Source;
  width?: number;
  height?: number;
}

interface ManualSaveResult {
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

interface ReadableMedia {
  path: string;
  mediaType: "image" | "video";
  mimeType: string;
  bytes: Buffer;
}

interface ReadableText {
  path: string;
  body: string;
}

/** Builds a complete local save without the URL pipeline; no ops are enqueued. */
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
    if (existing) {
      return { ok: true, id: existing.id, skipped: true };
    }
  }

  const note = input.note?.trim() || null;
  const tags = normalizeTagList(input.tags ?? []);

  const readableMedia: ReadableMedia[] = [];
  const readableText: ReadableText[] = [];
  let skippedUnsupported = 0;
  for (const path of input.filePaths ?? []) {
    const cls = classifyExt(extname(path));
    if (!cls) {
      skippedUnsupported += 1;
      continue;
    }
    try {
      const info = await stat(path);
      if (!info.isFile() || info.size === 0) continue;
      if (cls.kind === "text") {
        const length = Math.min(info.size, MAX_TEXT_BODY_BYTES);
        const buf = Buffer.alloc(length);
        const fh = await open(path, "r");
        try {
          await fh.read(buf, 0, length, 0);
        } finally {
          await fh.close();
        }
        readableText.push({
          path,
          body: buf.toString("utf8"),
        });
      } else {
        readableMedia.push({
          path,
          mediaType: cls.mediaType,
          mimeType: cls.mimeType,
          bytes: await readFile(path),
        });
      }
    } catch {
      /** Skip unreadable files rather than failing the whole import. */
    }
  }

  if (
    (input.filePaths?.length ?? 0) > 0 &&
    readableMedia.length === 0 &&
    readableText.length === 0 &&
    skippedUnsupported > 0
  ) {
    return { ok: false, error: "unsupported_type", skipped: true };
  }

  const title =
    input.title?.trim() ||
    (readableMedia[0]
      ? basename(readableMedia[0].path, extname(readableMedia[0].path))
      : null) ||
    (readableText[0]
      ? basename(readableText[0].path, extname(readableText[0].path))
      : null);

  const textBody =
    (readableText.length > 0
      ? readableText
          .map((t) => t.body.trim())
          .filter(Boolean)
          .join("\n\n")
      : note
    )?.trim() || null;

  if (readableMedia.length === 0 && !title && !textBody && !input.url) {
    return { ok: false, error: "empty_input" };
  }

  const hasMedia = readableMedia.length > 0;
  const hasUrl = Boolean(input.url?.trim());
  /** URL bookmarks stay links even when a note is attached; prose-only entries are text. */
  const isTextSave = !hasMedia && !hasUrl && Boolean(textBody);
  const mediaType: MediaType = hasMedia
    ? (majorityMediaType(readableMedia.map((f) => f.mediaType)) ?? "image")
    : isTextSave
      ? "text"
      : "link";

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
    /** Local files are copied in-process; never park them in the ingest queue. */
    status: "complete",
    tags,
    files: [],
    coverIndex: 0,
    ...(input.width != null ? { width: input.width } : {}),
    ...(input.height != null ? { height: input.height } : {}),
    ingestStartedAt: now,
    ingestCompletedAt: now,
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

  if (hasMedia) {
    const newFiles = readableMedia.map((file, index) => ({
      kind: kindFor(file.mediaType, index),
      filename: blobFilename(
        file.mediaType,
        extname(file.path).toLowerCase() || ".bin",
        index,
      ),
      bytes: file.bytes,
      mimeType: file.mimeType,
    }));
    const fileSize = readableMedia.reduce(
      (sum, f) => sum + f.bytes.byteLength,
      0,
    );
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

function kindFor(
  mediaType: "image" | "video",
  index: number,
): SaveFile["kind"] {
  if (mediaType === "video") return "video";
  return index === 0 ? "cover" : "media";
}
