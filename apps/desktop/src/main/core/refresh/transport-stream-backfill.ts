import { type NewSave, type SaveFile, saves } from "@pond/schema/db";
import { isMpegTransportStreamHeader } from "@shared/file-format";
import { isNull } from "drizzle-orm";
import log from "electron-log/main.js";
import pLimit from "p-limit";
import { getDb } from "../../db";
import { itemFile } from "../../paths";
import { extractMediaMetadata } from "../media-metadata";
import { persistSave } from "../persist-save";
import {
  libraryMediaMetadata,
  readLibraryMediaRange,
  withDecryptedLibraryMediaPath,
} from "../storage/library-media-storage";

const FORMAT_HEADER_BYTES = 188 * 3;
const MAX_IMPORTED_TEXT_BYTES = 100_000;
const MAX_INFLIGHT = 2;
const PAGE_SIZE = 200;

function isAmbiguousTsFile(file: SaveFile): boolean {
  return (
    /\.ts$/i.test(file.path) &&
    (file.kind !== "video" || file.mimeType !== "video/mp2t")
  );
}

export function repairTransportStreamFile(
  file: SaveFile,
  header: Uint8Array,
): SaveFile | null {
  if (!isAmbiguousTsFile(file) || !isMpegTransportStreamHeader(header)) {
    return null;
  }
  return { ...file, kind: "video", mimeType: "video/mp2t" };
}

export function removeMisclassifiedTextDescription(
  description: string | null,
  body: Uint8Array,
): string | null {
  if (description == null) return null;
  return description === Buffer.from(body).toString("utf8").trim()
    ? null
    : description;
}

async function readMediaPrefix(
  path: string,
  requested: number,
): Promise<Buffer> {
  const { originalSize } = await libraryMediaMetadata(path);
  const length = Math.min(originalSize, requested);
  if (length === 0) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  for await (const chunk of readLibraryMediaRange({
    path,
    start: 0,
    endExclusive: length,
  })) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, length);
}

async function repairSave(row: typeof saves.$inferSelect): Promise<boolean> {
  const replacements = new Map<number, SaveFile>();
  let firstSource: string | null = null;
  let firstBody: Buffer | null = null;

  for (const [index, file] of row.files.entries()) {
    if (!isAmbiguousTsFile(file)) continue;
    const source = itemFile(row.id, file.path);
    const header = await readMediaPrefix(source, FORMAT_HEADER_BYTES).catch(
      () => null,
    );
    if (!header) continue;
    const repaired = repairTransportStreamFile(file, header);
    if (!repaired) continue;
    replacements.set(index, repaired);
    if (!firstSource) {
      firstSource = source;
      if (row.mediaType === "text" && row.description) {
        firstBody = await readMediaPrefix(
          source,
          MAX_IMPORTED_TEXT_BYTES,
        ).catch(() => null);
      }
    }
  }

  if (replacements.size === 0 || !firstSource) return false;

  const metadata = await withDecryptedLibraryMediaPath(
    firstSource,
    extractMediaMetadata,
  ).catch(() => ({}));
  const patch: Partial<NewSave> = {
    ...metadata,
    files: row.files.map((file, index) => replacements.get(index) ?? file),
    mediaType: "video",
    metadataVersion: 1,
  };
  if (firstBody) {
    patch.description = removeMisclassifiedTextDescription(
      row.description,
      firstBody,
    );
  }

  return (
    (await persistSave(row.id, patch, {
      actorReason: "metadata:repair-transport-stream",
    })) !== null
  );
}

export async function startTransportStreamBackfill(): Promise<{
  ok: true;
  repaired: number;
}> {
  const db = await getDb();
  const limit = pLimit(MAX_INFLIGHT);
  const jobs: Promise<void>[] = [];
  let offset = 0;
  let repaired = 0;

  for (;;) {
    const page = db
      .select()
      .from(saves)
      .where(isNull(saves.deletedAt))
      .limit(PAGE_SIZE)
      .offset(offset)
      .all();
    if (page.length === 0) break;
    offset += page.length;

    for (const row of page) {
      if (!row.files.some(isAmbiguousTsFile)) continue;
      jobs.push(
        limit(async () => {
          try {
            if (await repairSave(row)) repaired += 1;
          } catch (error) {
            log.warn("[pond transport-stream-backfill] failed", row.id, error);
          }
        }),
      );
    }
    if (page.length < PAGE_SIZE) break;
  }

  await Promise.all(jobs);
  if (jobs.length > 0) {
    log.info(
      "[pond transport-stream-backfill] repaired",
      repaired,
      "of",
      jobs.length,
    );
  }
  return { ok: true, repaired };
}
