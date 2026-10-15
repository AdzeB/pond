import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { environment } from "@raycast/api";
import { fetchThumbnail } from "./pond-api";

const FILE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/gif", "gif"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

/** Covers arrive at full size, so only the most recently fetched ones stay on disk. */
const CACHE_LIMIT = 500;

function directory(): string {
  return join(environment.supportPath, "thumbnails");
}

export async function cachedThumbnails(): Promise<Map<string, string>> {
  const folder = directory();
  await mkdir(folder, { recursive: true });
  const files = await Promise.all(
    (await readdir(folder)).map(async (name) => {
      const path = join(folder, name);
      return { name, path, modified: (await stat(path)).mtimeMs };
    }),
  );
  files.sort((a, b) => b.modified - a.modified);
  await Promise.all(
    files.slice(CACHE_LIMIT).map((file) => rm(file.path, { force: true })),
  );
  return new Map(
    files
      .slice(0, CACHE_LIMIT)
      .map((file) => [file.name.replace(/\.[^.]+$/, ""), file.path]),
  );
}

export async function downloadThumbnail(id: string): Promise<string | null> {
  if (!/^[\w-]+$/.test(id)) return null;
  const thumbnail = await fetchThumbnail(id);
  if (!thumbnail) return null;
  const extension = FILE_EXTENSIONS.get(thumbnail.type.replace(/;.*$/, ""));
  if (!extension) return null;
  const path = join(directory(), `${id}.${extension}`);
  await writeFile(path, thumbnail.bytes);
  return path;
}
