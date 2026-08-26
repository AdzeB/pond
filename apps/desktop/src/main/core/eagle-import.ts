import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import log from "electron-log/main.js";
import { createManualSave } from "./manual-import";

interface EagleFolder {
  id?: string;
  name?: string;
  password?: string;
  children?: EagleFolder[];
}

interface EagleItemMeta {
  id?: string;
  name?: string;
  tags?: string[];
  folders?: string[];
  url?: string;
  annotation?: string;
  width?: number;
  height?: number;
  isDeleted?: boolean;
}

export interface EagleImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  failed: number;
  error?: string;
}

function buildFolderMap(
  folders: EagleFolder[],
  map: Map<string, string> = new Map(),
): Map<string, string> {
  for (const folder of folders) {
    if (!folder.id || folder.password) continue;
    if (folder.name) map.set(folder.id, folder.name);
    if (folder.children?.length) buildFolderMap(folder.children, map);
  }
  return map;
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
      log.warn("[pond eagle] failed to read json", path, err);
    }
    return null;
  }
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
    const doc = await readJson<{ folders?: EagleFolder[] }>(path);
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
  const folderMap = buildFolderMap(libraryMeta.folders);

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

    const meta = await readJson<EagleItemMeta>(join(itemDir, "metadata.json"));
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

    const folderTags = (meta.folders ?? [])
      .map((id) => folderMap.get(id))
      .filter((name): name is string => Boolean(name));
    const tags = [...(meta.tags ?? []), ...folderTags];
    const filePaths = mediaFiles.map((name) => join(itemDir, name));

    try {
      const res = await createManualSave({
        title: meta.name?.trim() || basename(mediaFiles[0] ?? meta.id),
        url: meta.url?.trim() || null,
        note: meta.annotation?.trim() || null,
        tags,
        filePaths,
        sourceId: `eagle:${meta.id}`,
        ...(typeof meta.width === "number" ? { width: meta.width } : {}),
        ...(typeof meta.height === "number" ? { height: meta.height } : {}),
      });
      if (!res.ok) {
        failed += 1;
        continue;
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
