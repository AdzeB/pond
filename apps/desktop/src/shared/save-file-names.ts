export const THUMBNAIL_KIND = "thumbnail";
export const THUMBNAIL_DARK_KIND = "thumbnail_dark";
export const IMAGE_KIND = "image";
export const VIDEO_KIND = "video";
export const POSTER_KIND = "poster";
export const AVATAR_KIND = "avatar";
export const SOURCE_ICON_KIND = "source_icon";

export const LEGACY_COVER_KIND = "cover";
export const LEGACY_MEDIA_KIND = "media";
export const LEGACY_CUSTOM_THUMBNAIL_KIND = "custom_thumbnail";
export const LEGACY_TEXT_COVER_LIGHT_KIND = "text_cover_light";
export const LEGACY_TEXT_COVER_DARK_KIND = "text_cover_dark";

export const THUMBNAIL_SUFFIX = "_thumbnail.png";
export const TEXT_THUMBNAIL_FILE = "thumbnail.png";
export const THUMBNAIL_DARK_FILE = "thumbnail-dark.png";

export const THUMBNAIL_KINDS: ReadonlySet<string> = new Set([
  THUMBNAIL_KIND,
  THUMBNAIL_DARK_KIND,
  LEGACY_CUSTOM_THUMBNAIL_KIND,
  LEGACY_TEXT_COVER_LIGHT_KIND,
  LEGACY_TEXT_COVER_DARK_KIND,
]);

export const AUXILIARY_KINDS: ReadonlySet<string> = new Set([
  ...THUMBNAIL_KINDS,
  AVATAR_KIND,
  SOURCE_ICON_KIND,
  POSTER_KIND,
]);

export function isThumbnailKind(kind: string): boolean {
  return THUMBNAIL_KINDS.has(kind);
}

export function isAuxiliaryKind(kind: string): boolean {
  return AUXILIARY_KINDS.has(kind);
}

export function isOriginalImageKind(kind: string): boolean {
  return (
    kind === IMAGE_KIND ||
    kind === LEGACY_COVER_KIND ||
    kind === LEGACY_MEDIA_KIND
  );
}

export function isThumbnailFilename(filename: string): boolean {
  const name = basenameOf(filename);
  const lower = name.toLowerCase();
  return (
    lower.endsWith(THUMBNAIL_SUFFIX) ||
    name === TEXT_THUMBNAIL_FILE ||
    name === THUMBNAIL_DARK_FILE
  );
}

export function isTextCardThumbnailPath(path: string): boolean {
  const name = basenameOf(path);
  return name === TEXT_THUMBNAIL_FILE || name === THUMBNAIL_DARK_FILE;
}

export function hasMediaThumbnail(
  files: ReadonlyArray<{ kind: string; path: string }>,
): boolean {
  const hasOriginal = files.some((file) => !isAuxiliaryKind(file.kind));
  return files.some(
    (file) =>
      isThumbnailKind(file.kind) &&
      (!hasOriginal || !isTextCardThumbnailPath(file.path)),
  );
}

export function thumbnailFilename(originalFilename: string): string {
  return `${basenameOf(originalFilename)}${THUMBNAIL_SUFFIX}`;
}

export function mediaFilename(index: number, ext: string): string {
  return `media-${index + 1}${ext}`;
}

export function videoFilename(index: number, ext: string): string {
  return `video-${index + 1}${ext}`;
}

export function posterFilename(index: number, ext: string): string {
  return `poster-${index + 1}${ext}`;
}

export function harvestedFilename(
  kind: "image" | "video",
  index: number,
  ext: string,
): string {
  return kind === "video"
    ? videoFilename(index, ext)
    : mediaFilename(index, ext);
}

export function assignHarvestedFilenames<T extends { filename: string }>(
  entries: Array<T | null>,
): Array<T | null> {
  let images = 0;
  let videos = 0;
  return entries.map((entry) => {
    if (!entry) return entry;
    const ext = extensionOf(entry.filename);
    if (isHarvestedVideoName(entry.filename)) {
      return { ...entry, filename: videoFilename(videos++, ext) };
    }
    return { ...entry, filename: mediaFilename(images++, ext) };
  });
}

export function inferKindFromFilename(filename: string): string {
  const name = basenameOf(filename);
  if (name === THUMBNAIL_DARK_FILE) return THUMBNAIL_DARK_KIND;
  if (isThumbnailFilename(name)) return THUMBNAIL_KIND;
  if (name.startsWith("poster")) return POSTER_KIND;
  if (name.startsWith("cover")) return LEGACY_COVER_KIND;
  if (name.startsWith("video")) return VIDEO_KIND;
  if (name.startsWith("media-")) return IMAGE_KIND;
  if (name.startsWith("avatar")) return AVATAR_KIND;
  if (name.startsWith("source-icon")) return SOURCE_ICON_KIND;
  if (name === "archive-manifest.json") return "archive_manifest";
  if (name.startsWith("archive")) return "archive";
  return "other";
}

export function primaryOriginalPath(
  files: ReadonlyArray<{ kind: string; path: string }>,
): string | null {
  const original = files.find((file) => !isAuxiliaryKind(file.kind));
  return original?.path ?? null;
}

export function pickCardFile<T extends { kind: string; path: string }>(
  files: readonly T[],
): T | null {
  const hasOriginal = files.some((file) => !isAuxiliaryKind(file.kind));
  const usableThumb = (file: T) =>
    isThumbnailKind(file.kind) &&
    (!hasOriginal || !isTextCardThumbnailPath(file.path));
  return (
    files.find((file) => file.kind === THUMBNAIL_KIND && usableThumb(file)) ??
    files.find(
      (file) => file.kind === THUMBNAIL_DARK_KIND && usableThumb(file),
    ) ??
    files.find(usableThumb) ??
    files.find((file) => file.kind === POSTER_KIND) ??
    files.find((file) => !isAuxiliaryKind(file.kind)) ??
    null
  );
}

export function thumbnailFileIndex(
  files: ReadonlyArray<{ kind: string }>,
): number {
  const index = files.findIndex((file) => file.kind === THUMBNAIL_KIND);
  if (index >= 0) return index;
  const any = files.findIndex((file) => isThumbnailKind(file.kind));
  if (any >= 0) return any;
  const original = files.findIndex((file) => !isAuxiliaryKind(file.kind));
  return original >= 0 ? original : 0;
}

function isHarvestedVideoName(filename: string): boolean {
  return basenameOf(filename).startsWith("video");
}

function basenameOf(path: string): string {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return path.slice(slash + 1);
}

function extensionOf(filename: string): string {
  const name = basenameOf(filename);
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return ".bin";
  return name.slice(dot).toLowerCase();
}
