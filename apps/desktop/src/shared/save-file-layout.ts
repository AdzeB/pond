import {
  hasMediaThumbnail,
  IMAGE_KIND,
  isAuxiliaryKind,
  isOriginalImageKind,
  isThumbnailFilename,
  LEGACY_COVER_KIND,
  LEGACY_CUSTOM_THUMBNAIL_KIND,
  LEGACY_MEDIA_KIND,
  LEGACY_TEXT_COVER_DARK_KIND,
  LEGACY_TEXT_COVER_LIGHT_KIND,
  mediaFilename,
  posterFilename,
  TEXT_THUMBNAIL_FILE,
  THUMBNAIL_DARK_FILE,
  THUMBNAIL_DARK_KIND,
  THUMBNAIL_KIND,
  thumbnailFilename,
  videoFilename,
} from "./save-file-names";

export interface LayoutFile {
  kind: string;
  path: string;
  sha256?: string;
}

export interface LayoutRename {
  from: string;
  to: string;
}

export interface SaveFileLayoutPlan<T extends LayoutFile> {
  files: T[];
  renames: LayoutRename[];
  needsGeneratedThumbnail: boolean;
}

const MEDIA_SLOT = /^media-(\d+)(\.[^.]+)$/i;
const BARE_VIDEO = /^video(\.[^.]+)$/i;
const NUMBERED_VIDEO = /^video-(\d+)\./i;
const BARE_POSTER = /^poster(\.[^.]+)$/i;
const NUMBERED_POSTER = /^poster-(\d+)\./i;
const BARE_COVER = /^cover(\.[^.]+)$/i;

export function needsSaveFileLayoutMigration(
  files: ReadonlyArray<LayoutFile>,
  schema?: number,
): boolean {
  if (schema != null && schema < 4) return true;
  return files.some((file) => {
    const name = basenameOf(file.path);
    return (
      file.kind === LEGACY_COVER_KIND ||
      file.kind === LEGACY_MEDIA_KIND ||
      file.kind === LEGACY_CUSTOM_THUMBNAIL_KIND ||
      file.kind === LEGACY_TEXT_COVER_LIGHT_KIND ||
      file.kind === LEGACY_TEXT_COVER_DARK_KIND ||
      BARE_COVER.test(name) ||
      BARE_VIDEO.test(name) ||
      BARE_POSTER.test(name)
    );
  });
}

export function needsSaveFileLayoutBackfill(
  files: ReadonlyArray<LayoutFile>,
  schema?: number,
): boolean {
  return (
    needsSaveFileLayoutMigration(files, schema) ||
    planSaveFileLayout(files).needsGeneratedThumbnail
  );
}

export function planSaveFileLayout<T extends LayoutFile>(
  files: readonly T[],
): SaveFileLayoutPlan<T> {
  const renames: LayoutRename[] = [];
  const next = files.map((file) => ({ ...file }));

  shiftCoverToMedia(next, renames);
  numberBareSlot(next, renames, BARE_VIDEO, NUMBERED_VIDEO, videoFilename);
  numberBareSlot(next, renames, BARE_POSTER, NUMBERED_POSTER, posterFilename);

  for (const file of next) {
    if (file.kind === LEGACY_COVER_KIND || file.kind === LEGACY_MEDIA_KIND) {
      file.kind = IMAGE_KIND;
    }
    if (file.kind === LEGACY_TEXT_COVER_LIGHT_KIND) {
      applyRename(file, renames, TEXT_THUMBNAIL_FILE);
      file.kind = THUMBNAIL_KIND;
    }
    if (file.kind === LEGACY_TEXT_COVER_DARK_KIND) {
      applyRename(file, renames, THUMBNAIL_DARK_FILE);
      file.kind = THUMBNAIL_DARK_KIND;
    }
  }

  const primary = next.find((file) => !isAuxiliaryKind(file.kind));
  for (const file of next) {
    if (file.kind !== LEGACY_CUSTOM_THUMBNAIL_KIND) continue;
    if (!isThumbnailFilename(file.path)) {
      applyRename(
        file,
        renames,
        primary ? thumbnailFilename(primary.path) : TEXT_THUMBNAIL_FILE,
      );
    }
    file.kind = THUMBNAIL_KIND;
  }

  const hasOriginal = next.some(
    (file) => isOriginalImageKind(file.kind) || !isAuxiliaryKind(file.kind),
  );

  return {
    files: next,
    renames: uniqueRenames(renames),
    needsGeneratedThumbnail: !hasMediaThumbnail(next) && hasOriginal,
  };
}

function shiftCoverToMedia<T extends LayoutFile>(
  files: T[],
  renames: LayoutRename[],
): void {
  const cover = files.find((file) => BARE_COVER.test(basenameOf(file.path)));
  if (!cover) return;

  const slots = files
    .map((file) => {
      const match = MEDIA_SLOT.exec(basenameOf(file.path));
      if (!match) return null;
      return { file, index: Number(match[1]), ext: match[2] ?? "" };
    })
    .filter((slot): slot is NonNullable<typeof slot> => slot != null)
    .sort((a, b) => b.index - a.index);

  for (const slot of slots) {
    applyRename(slot.file, renames, mediaFilename(slot.index, slot.ext));
  }

  applyRename(cover, renames, mediaFilename(0, extensionOf(cover.path)));
}

function numberBareSlot<T extends LayoutFile>(
  files: T[],
  renames: LayoutRename[],
  bare: RegExp,
  numbered: RegExp,
  nameFor: (index: number, ext: string) => string,
): void {
  const bareFile = files.find((file) => bare.test(basenameOf(file.path)));
  if (!bareFile) return;
  let max = 0;
  for (const file of files) {
    const numberedMatch = numbered.exec(basenameOf(file.path));
    if (numberedMatch) max = Math.max(max, Number(numberedMatch[1]));
  }
  const match = bare.exec(basenameOf(bareFile.path));
  applyRename(
    bareFile,
    renames,
    nameFor(max, match?.[1] ?? extensionOf(bareFile.path)),
  );
}

function applyRename<T extends LayoutFile>(
  file: T,
  renames: LayoutRename[],
  to: string,
): void {
  const from = basenameOf(file.path);
  if (from === to) return;
  renames.push({ from, to });
  file.path = to;
}

function uniqueRenames(renames: LayoutRename[]): LayoutRename[] {
  const seen = new Set<string>();
  const out: LayoutRename[] = [];
  for (const rename of renames) {
    const key = `${rename.from}\0${rename.to}`;
    if (seen.has(key) || rename.from === rename.to) continue;
    seen.add(key);
    out.push(rename);
  }
  return out;
}

function basenameOf(path: string): string {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return path.slice(slash + 1);
}

function extensionOf(path: string): string {
  const name = basenameOf(path);
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return ".bin";
  return name.slice(dot).toLowerCase();
}
