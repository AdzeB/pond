import { createHash } from "node:crypto";
import { join } from "node:path";
import type { SaveFile } from "@pond/schema/db";
import {
  hasMediaThumbnail,
  isAuxiliaryKind,
  isOriginalImageKind,
  POSTER_KIND,
  primaryOriginalPath,
  THUMBNAIL_KIND,
  thumbnailFilename,
} from "@shared/save-file-names";
import sharp from "sharp";
import {
  withDecryptedLibraryMediaPath,
  writeLibraryMedia,
} from "./security/library-media-storage";

const MAX_EDGE = 1024;

export async function renderThumbnailPng(
  input: string | Buffer,
): Promise<Buffer | null> {
  try {
    return await sharp(input, { failOn: "none", pages: 1 })
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

export function thumbnailSource(
  files: readonly { kind: string; path: string }[],
): { kind: string; path: string } | undefined {
  return (
    files.find((file) => file.kind === POSTER_KIND) ??
    files.find((file) => isOriginalImageKind(file.kind)) ??
    files.find((file) => !isAuxiliaryKind(file.kind))
  );
}

export async function writeGeneratedThumbnail(
  files: readonly { kind: string; path: string }[],
  directory: string,
): Promise<SaveFile | null> {
  if (hasMediaThumbnail(files)) return null;
  const primary = thumbnailSource(files);
  if (!primary) return null;
  const source = join(directory, primary.path);
  const png = await withDecryptedLibraryMediaPath(
    source,
    renderThumbnailPng,
  ).catch(() => null);
  if (!png) return null;
  const meta = await sharp(png)
    .metadata()
    .catch(() => null);
  const original = primaryOriginalPath(files);
  const filename = original ? thumbnailFilename(original) : "thumbnail.png";
  await writeLibraryMedia(join(directory, filename), png);
  return {
    kind: THUMBNAIL_KIND,
    path: filename,
    sha256: createHash("sha256").update(png).digest("hex"),
    size: png.length,
    mimeType: "image/png",
    width: meta?.width ?? null,
    height: meta?.height ?? null,
  };
}
