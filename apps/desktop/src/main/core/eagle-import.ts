import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import log from "electron-log/main.js";
import { z } from "zod";
import { importFolderTree, setSaveFolders } from "./folders";
import { createManualSave, type ManualSaveInput } from "./manual-import";

interface EagleFolder {
  id?: string;
  name?: string;
  password?: string;
  color?: string;
  children?: EagleFolder[];
}

const EagleFolderSchema: z.ZodType<EagleFolder> = z.lazy(() =>
  z.object({
    id: z.string().optional().catch(undefined),
    name: z.string().optional().catch(undefined),
    password: z.string().optional().catch(undefined),
    children: z.array(EagleFolderSchema).optional().catch(undefined),
  }),
);

const EagleLibrarySchema = z.object({
  folders: z.array(EagleFolderSchema).optional().catch(undefined),
});

const EagleItemMetaSchema = z.object({
  id: z.string().optional().catch(undefined),
  name: z.string().optional().catch(undefined),
  tags: z.array(z.string()).optional().catch(undefined),
  folders: z.array(z.string()).optional().catch(undefined),
  url: z.string().optional().catch(undefined),
  annotation: z.string().optional().catch(undefined),
  width: z.number().optional().catch(undefined),
  height: z.number().optional().catch(undefined),
  isDeleted: z.boolean().optional().catch(undefined),
});

export interface EagleImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  failed: number;
  error?: string;
}

export interface FlattenedEagleFolder {
  id: string;
  name: string;
  parentId: string | null;
  color?: string | null;
}

export function flattenEagleFolders(
  folders: EagleFolder[],
  parentId: string | null = null,
): FlattenedEagleFolder[] {
  const out: FlattenedEagleFolder[] = [];
  for (const folder of folders) {
    if (!folder.id || folder.password) continue;
    out.push({
      id: folder.id,
      name: folder.name?.trim() || "Untitled",
      parentId,
      color: folder.color ?? null,
    });
    if (folder.children?.length) {
      out.push(...flattenEagleFolders(folder.children, folder.id));
    }
  }
  return out;
}

async function readJson<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T | null> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (cause) {
    if (errnoCode(cause) !== "ENOENT") {
      log.warn("[pond eagle] failed to read json", path, cause);
    }
    return null;
  }
  const parsed = schema.safeParse(JSON.parse(text));
  return parsed.success ? parsed.data : null;
}

function errnoCode(cause: unknown): string | null {
  return cause instanceof Error && "code" in cause ? String(cause.code) : null;
}

async function resolveImagesDir(libraryPath: string): Promise<string | null> {
  const direct = join(libraryPath, "images");
  try {
    if ((await stat(direct)).isDirectory()) return direct;
  } catch {}

  try {
    const entries = await readdir(libraryPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.endsWith(".library")) continue;
      const nested = join(libraryPath, entry.name, "images");
      try {
        if ((await stat(nested)).isDirectory()) return nested;
      } catch {}
    }
  } catch {
    return null;
  }
  return null;
}

async function resolveLibraryMeta(
  libraryPath: string,
  imagesDir: string,
): Promise<{ folders: EagleFolder[] }> {
  for (const path of [
    join(libraryPath, "metadata.json"),
    join(imagesDir, "..", "metadata.json"),
  ]) {
    const doc = await readJson(path, EagleLibrarySchema);
    if (doc?.folders) return { folders: doc.folders };
  }
  return { folders: [] };
}

export async function importEagleLibrary(
  libraryPath: string,
): Promise<EagleImportResult> {
  const imagesDir = await resolveImagesDir(libraryPath);
  if (!imagesDir) {
    return {
      ok: false,
      imported: 0,
      skipped: 0,
      failed: 0,
      error: "not_eagle_library",
    };
  }

  const libraryMeta = await resolveLibraryMeta(libraryPath, imagesDir);
  const mapped = await importFolderTree(
    flattenEagleFolders(libraryMeta.folders),
  );

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  let entries: Dirent[];
  try {
    entries = await readdir(imagesDir, { withFileTypes: true });
  } catch (err) {
    log.warn("[pond eagle] readdir failed", imagesDir, err);
    return {
      ok: false,
      imported: 0,
      skipped: 0,
      failed: 0,
      error: "read_failed",
    };
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.endsWith(".info")) continue;
    const itemDir = join(imagesDir, entry.name);

    const meta = await readJson(
      join(itemDir, "metadata.json"),
      EagleItemMetaSchema,
    );
    if (!meta?.id) {
      failed += 1;
      continue;
    }
    if (meta.isDeleted) {
      skipped += 1;
      continue;
    }

    let files: string[];
    try {
      files = await readdir(itemDir);
    } catch {
      failed += 1;
      continue;
    }

    const mediaFiles = files.filter(
      (name) =>
        name !== "metadata.json" &&
        !/thumbnail/i.test(name) &&
        !name.startsWith("."),
    );
    if (mediaFiles.length === 0) {
      skipped += 1;
      continue;
    }

    const tags = [...(meta.tags ?? [])];
    const filePaths = mediaFiles.map((name) => join(itemDir, name));

    try {
      const input: ManualSaveInput = {
        title: meta.name?.trim() || basename(mediaFiles[0] ?? meta.id),
        url: meta.url?.trim() || null,
        note: meta.annotation?.trim() || null,
        tags,
        filePaths,
        sourceId: `eagle:${meta.id}`,
      };
      if (meta.width !== undefined) input.width = meta.width;
      if (meta.height !== undefined) input.height = meta.height;
      const res = await createManualSave(input);
      if (!res.ok) {
        failed += 1;
        continue;
      }
      const pondFolderIds = (meta.folders ?? [])
        .map((id) => mapped.get(id))
        .filter((id): id is string => Boolean(id));
      if (res.id && pondFolderIds.length > 0) {
        await setSaveFolders(res.id, pondFolderIds);
      }
      if (res.skipped) skipped += 1;
      else imported += 1;
    } catch (err) {
      log.warn("[pond eagle] item import failed", meta.id, err);
      failed += 1;
    }
  }

  return { ok: imported > 0 || skipped > 0, imported, skipped, failed };
}
