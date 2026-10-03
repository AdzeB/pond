import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saves } from "@pond/schema/db";
import type { Transaction } from "@pond/schema/tx";
import {
  type CombineImagesOptions,
  CombineImagesOptionsSchema,
} from "@shared/combine-images-contracts";
import { inArray } from "drizzle-orm";
import sharp, { type OverlayOptions } from "sharp";
import { getDb } from "../db";
import { resolveSaveFilePath } from "../ipc/helpers";
import { executeBatch } from "./executor";
import { addSavesToFolder } from "./folders";
import { createManualSave } from "./manual-import";
import { readLibraryMedia } from "./storage/library-media-storage";
import { recordBatchForUndo } from "./undo";

const COMBINABLE = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "image/webp",
]);

export function isCombinableImage(
  mimeType: string | null | undefined,
  path: string,
): boolean {
  const mime = mimeType?.trim().toLowerCase() ?? "";
  if (COMBINABLE.has(mime)) return true;
  const lower = path.toLowerCase();
  return [
    ".avif",
    ".gif",
    ".jpg",
    ".jpeg",
    ".png",
    ".tif",
    ".tiff",
    ".webp",
  ].some((extension) => lower.endsWith(extension));
}

export async function joinRasterImages(
  paths: Array<string | Buffer>,
  input: Partial<CombineImagesOptions> = {},
): Promise<Buffer> {
  if (paths.length < 2) throw new Error("Select at least two images.");
  const options = CombineImagesOptionsSchema.parse(input);
  const ordered = options.order === "reverse" ? [...paths].reverse() : paths;
  const sources = await Promise.all(
    ordered.map(async (path) => {
      const image = sharp(path, { pages: 1 }).rotate();
      const meta = await image.metadata();
      return { input: path, width: meta.width ?? 1, height: meta.height ?? 1 };
    }),
  );
  const defaultCross =
    options.direction === "horizontal"
      ? Math.max(...sources.map((source) => source.height))
      : Math.max(...sources.map((source) => source.width));
  const resized = await Promise.all(
    sources.map(async (source) => {
      const width =
        options.width ??
        (options.direction === "vertical"
          ? defaultCross
          : options.height
            ? Math.round(source.width * (options.height / source.height))
            : Math.round(source.width * (defaultCross / source.height)));
      const height =
        options.height ??
        (options.direction === "horizontal"
          ? defaultCross
          : options.width
            ? Math.round(source.height * (options.width / source.width))
            : Math.round(source.height * (defaultCross / source.width)));
      let image = sharp(source.input, { pages: 1 })
        .rotate()
        .resize({
          width,
          height,
          fit: options.width && options.height ? "contain" : "fill",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .ensureAlpha()
        .png();
      if (options.radius > 0 || options.opacity < 1) {
        const radius = Math.min(options.radius, width / 2, height / 2);
        const mask = Buffer.from(
          `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="white" fill-opacity="${options.opacity}"/></svg>`,
        );
        image = image.composite([{ input: mask, blend: "dest-in" }]);
      }
      return image.toBuffer({ resolveWithObject: true });
    }),
  );
  const contentWidth =
    options.direction === "horizontal"
      ? resized.reduce((sum, item) => sum + item.info.width, 0) +
        options.spacing * (resized.length - 1)
      : Math.max(...resized.map((item) => item.info.width));
  const contentHeight =
    options.direction === "vertical"
      ? resized.reduce((sum, item) => sum + item.info.height, 0) +
        options.spacing * (resized.length - 1)
      : Math.max(...resized.map((item) => item.info.height));
  const width = contentWidth + options.margin * 2;
  const height = contentHeight + options.margin * 2;
  const composites: OverlayOptions[] = [];
  let cursor = options.margin;
  for (const item of resized) {
    const crossSize =
      options.direction === "horizontal" ? item.info.height : item.info.width;
    const crossAvailable =
      options.direction === "horizontal" ? contentHeight : contentWidth;
    const crossOffset =
      options.alignment === "start"
        ? 0
        : options.alignment === "end"
          ? crossAvailable - crossSize
          : Math.round((crossAvailable - crossSize) / 2);
    composites.push({
      input: item.data,
      left:
        options.direction === "horizontal"
          ? cursor
          : options.margin + crossOffset,
      top:
        options.direction === "vertical"
          ? cursor
          : options.margin + crossOffset,
    });
    cursor +=
      (options.direction === "horizontal"
        ? item.info.width
        : item.info.height) + options.spacing;
  }
  const output = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: options.background,
    },
  }).composite(composites);
  switch (options.format) {
    case "jpeg":
      return output
        .flatten({ background: options.background })
        .jpeg({ quality: options.quality, mozjpeg: true })
        .toBuffer();
    case "webp":
      return output
        .webp({ quality: options.quality, lossless: options.lossless })
        .toBuffer();
    case "png":
      return output.png({ compressionLevel: 9 }).toBuffer();
  }
}

export async function combineImages(input: {
  ids: string[];
  folderId?: string | null;
  options?: Partial<CombineImagesOptions>;
}): Promise<{
  ok: boolean;
  id?: string;
  path?: string;
  skipped?: number;
  error?: string;
}> {
  const unique = [...new Set(input.ids.filter(Boolean))];
  if (unique.length < 2) {
    return {
      ok: false,
      error: "Select at least two images.",
    };
  }
  const db = await getDb();
  const rows = db.select().from(saves).where(inArray(saves.id, unique)).all();
  const byId = new Map(rows.map((row) => [row.id, row]));
  const imageInputs: Array<string | Buffer> = [];
  const combinedIds: string[] = [];
  let skipped = 0;
  for (const id of unique) {
    const row = byId.get(id);
    const file = row?.files?.[0];
    if (!row || !isCombinableImage(file?.mimeType, file?.path ?? "")) {
      skipped += 1;
      continue;
    }
    const target = await resolveSaveFilePath(id, 0);
    if (!target.ok) {
      skipped += 1;
      continue;
    }
    imageInputs.push(await readLibraryMedia(target.path));
    combinedIds.push(id);
  }
  if (imageInputs.length < 2) {
    return {
      ok: false,
      skipped,
      error: "Select at least two images.",
    };
  }
  const directory = await mkdtemp(join(tmpdir(), "pond-combine-"));
  try {
    const options = CombineImagesOptionsSchema.parse(input.options ?? {});
    if (options.output === "export" && !options.outputPath)
      return { ok: false, skipped, error: "Choose an export location." };
    const bytes = await joinRasterImages(imageInputs, options);
    const extension = options.format === "jpeg" ? "jpg" : options.format;
    const path =
      options.output === "export"
        ? (options.outputPath ?? "")
        : join(directory, `combined.${extension}`);
    await writeFile(path, bytes);
    if (options.output === "export") {
      await trashCombinedOriginals(combinedIds, options.deleteOriginals);
      return { ok: true, path, skipped };
    }
    const created = await createManualSave({
      title: "Combined Images",
      filePaths: [path],
    });
    if (!created.ok || !created.id) {
      return {
        ok: false,
        skipped,
        error: created.error || "Couldn’t combine these images.",
      };
    }
    if (input.folderId) {
      await addSavesToFolder(input.folderId, [created.id]);
    }
    await trashCombinedOriginals(combinedIds, options.deleteOriginals);
    return { ok: true, id: created.id, skipped };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function trashCombinedOriginals(
  ids: string[],
  enabled: boolean,
): Promise<void> {
  if (!enabled) return;
  const transactions: Transaction[] = ids.map((id) => ({
    kind: "trash",
    model: "save",
    id,
    meta: { actor: "user", actorReason: "combine-images-delete-originals" },
  }));
  await executeBatch(transactions);
  recordBatchForUndo(transactions);
}
