import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { SaveFile } from "@pond/schema/db";
import {
  type LayoutFile,
  needsSaveFileLayoutBackfill,
  planSaveFileLayout,
} from "@shared/save-file-layout";
import { thumbnailFileIndex } from "@shared/save-file-names";
import pLimit from "p-limit";
import {
  INFO_FILE,
  INFO_SCHEMA,
  infoFilesFromSave,
  StoredInfoDocSchema,
} from "../lib/library-format";
import { writeGeneratedThumbnail } from "./save-thumbnail-file";

export interface LayoutDiskResult<T extends LayoutFile> {
  files: T[];
  changed: boolean;
  coverIndex: number;
}

const MEDIA_SLOT = /^media-(\d+)(\.[^.]+)$/i;
const SHIFT_TMP = ".pond-shift";

export async function applySaveFileLayoutOnDisk<T extends LayoutFile>(
  dir: string,
  files: T[],
  schema?: number,
): Promise<LayoutDiskResult<T>> {
  const repaired = await repairShiftedMedia(dir, files);
  const present = repaired.files.filter((file) =>
    existsSync(join(dir, basename(file.path))),
  );
  const working = present.length > 0 ? present : repaired.files;
  const coverIndex = thumbnailFileIndex(working);
  if (!needsSaveFileLayoutBackfill(working, schema) && !repaired.changed) {
    return { files, changed: false, coverIndex };
  }

  const plan = planSaveFileLayout(working);
  for (const step of plan.renames) {
    const from = join(dir, step.from);
    const to = join(dir, step.to);
    if (!existsSync(from)) continue;
    try {
      await rename(from, to);
    } catch {}
  }

  let nextFiles = plan.files;
  if (plan.needsGeneratedThumbnail) {
    const generated = await writeGeneratedThumbnail(nextFiles, dir);
    if (generated) nextFiles = [...nextFiles, generated as unknown as T];
  }

  const nextCover = thumbnailFileIndex(nextFiles);
  await rewriteInfo(dir, nextFiles as unknown as SaveFile[], nextCover);
  return { files: nextFiles, changed: true, coverIndex: nextCover };
}

async function repairShiftedMedia<T extends LayoutFile>(
  dir: string,
  files: T[],
): Promise<{ files: T[]; changed: boolean }> {
  const first = files.find((file) => {
    const match = MEDIA_SLOT.exec(basename(file.path));
    return match?.[1] === "1";
  });
  if (!first || existsSync(join(dir, basename(first.path)))) {
    return { files, changed: false };
  }

  const firstMatch = MEDIA_SLOT.exec(basename(first.path));
  const ext = firstMatch?.[2];
  if (!ext) return { files, changed: false };
  const secondName = `media-2${ext}`;
  const secondPath = join(dir, secondName);
  if (!existsSync(secondPath)) return { files, changed: false };
  if (first.sha256) {
    const actual = createHash("sha256")
      .update(await readFile(secondPath))
      .digest("hex");
    if (actual !== first.sha256) return { files, changed: false };
  }

  const indexes = files
    .map((file) => MEDIA_SLOT.exec(basename(file.path)))
    .filter((match): match is RegExpExecArray => match != null)
    .filter((match) => match[2] === ext)
    .map((match) => Number(match[1]));
  const max = Math.max(...indexes);
  if (!Number.isFinite(max) || max < 2) return { files, changed: false };

  for (let index = 2; index <= max; index += 1) {
    const from = join(dir, `media-${index}${ext}`);
    if (existsSync(from)) {
      await rename(from, `${from}${SHIFT_TMP}`);
    }
  }
  for (let index = 2; index <= max; index += 1) {
    const tmp = join(dir, `media-${index}${ext}${SHIFT_TMP}`);
    if (existsSync(tmp)) {
      await rename(tmp, join(dir, `media-${index - 1}${ext}`));
    }
  }

  return {
    files: files.filter((file) => {
      const match = MEDIA_SLOT.exec(basename(file.path));
      if (!match || match[2] !== ext) return true;
      return Number(match[1]) !== max;
    }),
    changed: true,
  };
}

export interface LayoutBackfillStats {
  visited: number;
  migrated: number;
  skipped: number;
  failed: number;
}

export async function backfillSaveFileLayoutsAtRoot(
  root: string,
  opts?: {
    concurrency?: number;
    onProgress?: (stats: LayoutBackfillStats, id: string) => void;
  },
): Promise<LayoutBackfillStats> {
  const itemsDir = join(root, "items");
  const entries = await readdir(itemsDir);
  const ids = entries
    .filter((entry) => entry.endsWith(".info"))
    .map((entry) => entry.slice(0, -".info".length));
  const limit = pLimit(opts?.concurrency ?? 2);
  const stats: LayoutBackfillStats = {
    visited: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
  };

  await Promise.all(
    ids.map((id) =>
      limit(async () => {
        stats.visited += 1;
        try {
          const dir = join(itemsDir, `${id}.info`);
          const parsed = StoredInfoDocSchema.safeParse(
            JSON.parse(await readFile(join(dir, INFO_FILE), "utf8")),
          );
          if (!parsed.success) {
            stats.failed += 1;
            return;
          }
          const result = await applySaveFileLayoutOnDisk(
            dir,
            parsed.data.files,
            parsed.data.schema,
          );
          if (result.changed) stats.migrated += 1;
          else stats.skipped += 1;
          opts?.onProgress?.(stats, id);
        } catch {
          stats.failed += 1;
        }
      }),
    ),
  );

  return stats;
}

async function rewriteInfo(
  dir: string,
  files: SaveFile[],
  coverIndex: number,
): Promise<void> {
  const infoPath = join(dir, INFO_FILE);
  if (!existsSync(infoPath)) return;
  const parsed = StoredInfoDocSchema.safeParse(
    JSON.parse(await readFile(infoPath, "utf8")),
  );
  if (!parsed.success) return;
  const next = {
    ...parsed.data,
    schema: INFO_SCHEMA,
    coverIndex,
    files: infoFilesFromSave(files),
  };
  await writeFile(infoPath, JSON.stringify(next, null, 2));
}
