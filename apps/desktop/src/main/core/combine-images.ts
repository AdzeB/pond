import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saves } from "@pond/schema/db";
import { inArray } from "drizzle-orm";
import sharp from "sharp";
import { getDb } from "../db";
import { resolveSaveFilePath } from "../ipc/helpers";
import { addSavesToFolder } from "./folders";
import { createManualSave } from "./manual-import";

const COMBINABLE = new Set(["image/jpeg", "image/jpg", "image/png"]);

export function isCombinableImage(
  mimeType: string | null | undefined,
  path: string,
): boolean {
  const mime = mimeType?.trim().toLowerCase() ?? "";
  if (COMBINABLE.has(mime)) return true;
  const lower = path.toLowerCase();
  return (
    lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")
  );
}

export async function joinRasterImages(paths: string[]): Promise<Buffer> {
  if (paths.length < 2) {
    throw new Error("Select at least two JPG or PNG images.");
  }
  const sources = await Promise.all(
    paths.map(async (path) => {
      const image = sharp(path).rotate();
      const meta = await image.metadata();
      return { path, width: meta.width ?? 1, height: meta.height ?? 1 };
    }),
  );
  const height = Math.max(...sources.map((source) => source.height));
  const resized = await Promise.all(
    sources.map(async (source) => {
      const width = Math.round(source.width * (height / source.height));
      return sharp(source.path)
        .rotate()
        .resize({ width, height })
        .ensureAlpha()
        .png()
        .toBuffer({ resolveWithObject: true });
    }),
  );
  const width = resized.reduce((sum, item) => sum + item.info.width, 0);
  const composites = [];
  let left = 0;
  for (const item of resized) {
    composites.push({ input: item.data, left, top: 0 });
    left += item.info.width;
  }
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

export async function combineImages(input: {
  ids: string[];
  folderId?: string | null;
}): Promise<{
  ok: boolean;
  id?: string;
  skipped?: number;
  error?: string;
}> {
  const unique = [...new Set(input.ids.filter(Boolean))];
  if (unique.length < 2) {
    return {
      ok: false,
      error: "Select at least two JPG or PNG images.",
    };
  }
  const db = await getDb();
  const rows = db.select().from(saves).where(inArray(saves.id, unique)).all();
  const byId = new Map(rows.map((row) => [row.id, row]));
  const paths: string[] = [];
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
    paths.push(target.path);
  }
  if (paths.length < 2) {
    return {
      ok: false,
      skipped,
      error: "Select at least two JPG or PNG images.",
    };
  }
  const directory = await mkdtemp(join(tmpdir(), "pond-combine-"));
  try {
    const bytes = await joinRasterImages(paths);
    const path = join(directory, "combined.png");
    await writeFile(path, bytes);
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
    return { ok: true, id: created.id, skipped };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
