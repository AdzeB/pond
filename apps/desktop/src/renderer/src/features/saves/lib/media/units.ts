import type { TweetCover } from "@pond/schema/db";
import {
  classifyLibraryFile,
  requiresGeneratedImagePreview,
  typeLabelForPath,
} from "@shared/file-format";
import { isVideoFile } from "@shared/media-index";
import {
  isAuxiliaryKind,
  isOriginalImageKind,
  isTextCardThumbnailPath,
  isThumbnailKind,
  LEGACY_COVER_KIND,
  LEGACY_CUSTOM_THUMBNAIL_KIND,
  THUMBNAIL_DARK_KIND,
  THUMBNAIL_KIND,
} from "@shared/save-file-names";
import {
  RENDER_TEXT_COVER_VERSION,
  TEXT_COVER_DARK_KIND,
  TEXT_COVER_KINDS,
  TEXT_COVER_LIGHT_KIND,
  textCoverVersionFromRawJson,
} from "@shared/text-card";
import { hasArchive, isArchiveFile } from "@/features/saves/lib/media/archive";
import { buildPondUrl } from "@/features/saves/lib/media/url";
import {
  arenaBlockClass,
  isTextOnlyAsideFromCover,
  textBodyForSave,
} from "@/features/saves/lib/text";
import type { Save, SaveFile } from "@/features/saves/types";
import {
  type ResolvedTheme,
  resolveCurrentTheme,
} from "@/features/settings/hooks/use-resolved-theme";
import { getPrefsSnapshot } from "@/features/settings/state/prefs";

const TWEET_SCREENSHOT_LEGACY_KIND = "tweet_screenshot";
const TWEET_SCREENSHOT_LIGHT_KIND = "tweet_screenshot_light";
const TWEET_SCREENSHOT_DARK_KIND = "tweet_screenshot_dark";

const TWEET_SCREENSHOT_KINDS: ReadonlySet<string> = new Set([
  TWEET_SCREENSHOT_LEGACY_KIND,
  TWEET_SCREENSHOT_LIGHT_KIND,
  TWEET_SCREENSHOT_DARK_KIND,
]);

const QUOTE_SCREENSHOT_KIND = /^tweet_screenshot_quote(\d+)_(light|dark)$/;

function isQuoteScreenshotKind(kind: string): boolean {
  return QUOTE_SCREENSHOT_KIND.test(kind);
}

export interface MediaUnit {
  key: string;
  url: string;
  isVideo: boolean;
  posterUrl?: string;
  posterKey?: string;
  requiresGeneratedPreview?: boolean;
}

export interface MediaPickOptions {
  theme?: ResolvedTheme;
  tweetCover?: TweetCover;
}

function isRenderableVideoFile(file: SaveFile): boolean {
  return (
    isVideoFile(file) &&
    classifyLibraryFile(file.path, file.mimeType).previewKind === "video"
  );
}

function resolveCurrentTweetCover(): TweetCover {
  return getPrefsSnapshot()?.preferences?.tweetCover ?? "media";
}

export function buildMediaUnits(
  save: Save,
  opts: MediaPickOptions = {},
): MediaUnit[] {
  const allFiles = save.files ?? [];
  const posters = allFiles.filter((f) => f.kind === "poster");
  const files = allFiles.filter(
    (f) =>
      !isAuxiliaryKind(f.kind) &&
      !isArchiveFile(f) &&
      !TWEET_SCREENSHOT_KINDS.has(f.kind) &&
      !isQuoteScreenshotKind(f.kind),
  );
  const covers = files.filter((f) => f.kind === LEGACY_COVER_KIND);
  const hasVideo = files.some(isRenderableVideoFile);
  const slides = hasVideo
    ? files.filter((f) => f.kind !== LEGACY_COVER_KIND)
    : files;

  const quoteUnits = buildQuoteScreenshotUnits(save, opts.theme);

  const videos = slides.filter(isRenderableVideoFile);
  const images = slides.filter(isImageFile);

  if (videos.length === 1 && images.length <= 1 && quoteUnits.length === 0) {
    const video = videos[0];
    if (!video) return [];
    const poster = posters[0] ?? covers[0] ?? images[0];
    const unit: MediaUnit = {
      key: video.path,
      url: buildPondUrl(save.id, video),
      isVideo: true,
    };
    if (poster) {
      unit.posterUrl = buildPondUrl(save.id, poster);
      unit.posterKey = poster.path;
    }
    return [unit];
  }

  const units: MediaUnit[] = [];
  let videoSeen = 0;
  for (const f of slides) {
    if (isRenderableVideoFile(f)) {
      const poster = posters[videoSeen] ?? posters[0] ?? covers[0];
      const unit: MediaUnit = {
        key: f.path,
        url: buildPondUrl(save.id, f),
        isVideo: true,
      };
      if (poster) {
        unit.posterUrl = buildPondUrl(save.id, poster);
        unit.posterKey = poster.path;
      }
      units.push(unit);
      videoSeen++;
    } else if (isImageFile(f)) {
      const unit: MediaUnit = {
        key: f.path,
        url: buildPondUrl(save.id, f),
        isVideo: false,
      };
      if (requiresGeneratedImagePreview(f.path)) {
        unit.requiresGeneratedPreview = true;
      }
      units.push(unit);
    }
  }
  units.push(...quoteUnits);
  if (units.length > 0) return units;

  const screenshot = pickTweetScreenshot(save, opts.theme);
  if (screenshot) {
    return [
      {
        key: screenshot.path,
        url: buildPondUrl(save.id, screenshot),
        isVideo: false,
      },
      ...quoteUnits,
    ];
  }

  const textCover = pickTextCover(save, opts.theme);
  if (textCover) {
    return [
      {
        key: textCover.path,
        url: buildPondUrl(save.id, textCover),
        isVideo: false,
      },
    ];
  }
  return units;
}

function buildQuoteScreenshotUnits(
  save: Save,
  theme: ResolvedTheme | undefined,
): MediaUnit[] {
  if (save.source !== "twitter" && save.source !== "threads") return [];
  const files = save.files ?? [];
  const resolved = theme ?? resolveCurrentTheme();

  const byDepth = new Map<number, { light?: SaveFile; dark?: SaveFile }>();
  for (const f of files) {
    const m = QUOTE_SCREENSHOT_KIND.exec(f.kind);
    if (!m) continue;
    const depth = Number.parseInt(m[1] ?? "", 10);
    if (!Number.isFinite(depth)) continue;
    const slot = byDepth.get(depth) ?? {};
    if (m[2] === "light") slot.light = f;
    else slot.dark = f;
    byDepth.set(depth, slot);
  }

  const units: MediaUnit[] = [];
  for (const depth of Array.from(byDepth.keys()).sort((a, b) => a - b)) {
    const slot = byDepth.get(depth);
    if (!slot) continue;
    const preferred = resolved === "light" ? slot.light : slot.dark;
    const file = preferred ?? slot.light ?? slot.dark;
    if (!file) continue;
    units.push({
      key: file.path,
      url: buildPondUrl(save.id, file),
      isVideo: false,
    });
  }
  return units;
}

export function pickPrimaryUnit(
  save: Save,
  opts: MediaPickOptions = {},
): MediaUnit | null {
  const mode = opts.tweetCover ?? resolveCurrentTweetCover();
  const screenshot = pickTweetScreenshot(save, opts.theme);
  if (screenshot && mode === "screenshot") {
    return {
      key: screenshot.path,
      url: buildPondUrl(save.id, screenshot),
      isVideo: false,
    };
  }

  const units = buildMediaUnits(save, opts);
  const video = units.find((u) => u.isVideo);
  if (video) return video;
  return units[0] ?? null;
}

export function pickCardUnit(
  save: Save,
  opts: MediaPickOptions = {},
): MediaUnit | null {
  const mode = opts.tweetCover ?? resolveCurrentTweetCover();
  if (mode === "screenshot") {
    const screenshot = pickTweetScreenshot(save, opts.theme);
    if (screenshot) {
      return {
        key: screenshot.path,
        url: buildPondUrl(save.id, screenshot),
        isVideo: false,
      };
    }
  }

  const thumbnail = pickThumbnailFile(save, opts.theme);
  if (thumbnail) {
    const unit: MediaUnit = {
      key: thumbnail.path,
      url: buildPondUrl(save.id, thumbnail),
      isVideo: false,
    };
    if (requiresGeneratedImagePreview(thumbnail.path)) {
      unit.requiresGeneratedPreview = true;
    }
    return unit;
  }

  const primary = pickPrimaryUnit(save, opts);
  if (primary) return primary;

  const previewable = (save.files ?? []).find((file) => {
    if (isAuxiliaryFile(file)) return false;
    const kind = classifyLibraryFile(file.path, file.mimeType).previewKind;
    return (
      kind === "audio" ||
      kind === "pdf" ||
      kind === "font" ||
      kind === "generic"
    );
  });
  return previewable
    ? {
        key: previewable.path,
        url: buildPondUrl(save.id, previewable),
        isVideo: false,
        requiresGeneratedPreview: true,
      }
    : null;
}

export function pickPrimaryFile(
  save: Save,
  opts: MediaPickOptions = {},
): SaveFile | null {
  const unit = pickPrimaryUnit(save, opts);
  if (unit) {
    const file = (save.files ?? []).find((f) => f.path === unit.key);
    if (file) return file;
  }
  return (save.files ?? []).find((file) => !isAuxiliaryFile(file)) ?? null;
}

function isAuxiliaryFile(file: SaveFile): boolean {
  return (
    isAuxiliaryKind(file.kind) ||
    isArchiveFile(file) ||
    TWEET_SCREENSHOT_KINDS.has(file.kind) ||
    isQuoteScreenshotKind(file.kind)
  );
}

function pickThumbnailFile(
  save: Save,
  theme: ResolvedTheme | undefined,
): SaveFile | null {
  const files = save.files ?? [];
  const hasOriginal = files.some((file) => !isAuxiliaryFile(file));
  const usable = (file: SaveFile) =>
    isThumbnailKind(file.kind) &&
    (!hasOriginal || !isTextCardThumbnailPath(file.path));
  const resolved = theme ?? resolveCurrentTheme();
  const preferred = resolved === "dark" ? THUMBNAIL_DARK_KIND : THUMBNAIL_KIND;
  const other = resolved === "dark" ? THUMBNAIL_KIND : THUMBNAIL_DARK_KIND;
  return (
    files.find((file) => file.kind === preferred && usable(file)) ??
    files.find((file) => file.kind === other && usable(file)) ??
    files.find((file) => file.kind === LEGACY_CUSTOM_THUMBNAIL_KIND) ??
    (hasOriginal ? null : pickTextCover(save, theme))
  );
}

function pickTweetScreenshot(
  save: Save,
  theme: ResolvedTheme | undefined,
): SaveFile | null {
  if (save.source !== "twitter" && save.source !== "threads") return null;
  const files = save.files ?? [];
  const resolved = theme ?? resolveCurrentTheme();
  const preferredKind =
    resolved === "light"
      ? TWEET_SCREENSHOT_LIGHT_KIND
      : TWEET_SCREENSHOT_DARK_KIND;
  const otherKind =
    resolved === "light"
      ? TWEET_SCREENSHOT_DARK_KIND
      : TWEET_SCREENSHOT_LIGHT_KIND;
  return (
    files.find((f) => f.kind === preferredKind) ??
    files.find((f) => f.kind === otherKind) ??
    files.find((f) => f.kind === TWEET_SCREENSHOT_LEGACY_KIND) ??
    null
  );
}

function pickTextCover(
  save: Save,
  theme: ResolvedTheme | undefined,
): SaveFile | null {
  const files = save.files ?? [];
  const resolved = theme ?? resolveCurrentTheme();
  const preferredKind =
    resolved === "light" ? TEXT_COVER_LIGHT_KIND : TEXT_COVER_DARK_KIND;
  const otherKind =
    resolved === "light" ? TEXT_COVER_DARK_KIND : TEXT_COVER_LIGHT_KIND;
  return (
    files.find((f) => f.kind === preferredKind) ??
    files.find((f) => f.kind === otherKind) ??
    null
  );
}

export function needsTextCover(save: Save): boolean {
  if (save.source === "twitter" || save.source === "threads") return false;
  if (hasArchive(save)) return false;
  if (!textBodyForSave(save)) return false;
  if (!isTextOnlyAsideFromCover(save)) return false;
  const hasThumb = (save.files ?? []).some((file) =>
    isThumbnailKind(file.kind),
  );
  if (!hasThumb) return true;
  return textCoverVersionFromRawJson(save.rawJson) < RENDER_TEXT_COVER_VERSION;
}

export function isImageFile(file: SaveFile): boolean {
  if (isOriginalImageKind(file.kind) || file.kind === LEGACY_COVER_KIND)
    return true;
  const previewKind = classifyLibraryFile(file.path, file.mimeType).previewKind;
  return previewKind === "direct-image" || previewKind === "native-image";
}

type TypeKind =
  | "image"
  | "video"
  | "audio"
  | "font"
  | "link"
  | "text"
  | "doc"
  | "other";

export function deriveTypeKind(file: SaveFile | null, save: Save): TypeKind {
  if (save.source === "web") return "link";
  if (file && TEXT_COVER_KINDS.has(file.kind)) return "text";

  if (file) {
    const format = classifyLibraryFile(file.path, file.mimeType);
    if (format.mediaType === "image") return "image";
    if (format.mediaType === "video") return "video";
    if (format.mediaType === "audio") return "audio";
    if (format.mediaType === "font") return "font";
    if (format.mediaType === "document") return "doc";
    if (format.mediaType === "text") return "text";
    if (isOriginalImageKind(file.kind)) return "image";
  }

  const media = save.mediaType?.toLowerCase();
  if (media === "text") return "text";
  if (media === "image") return "image";
  if (media === "video") return "video";
  if (media === "audio") return "audio";
  if (media === "document") return "doc";
  if (media === "font") return "font";
  if (media === "file") return "other";
  if (media === "link") return "link";

  return save.url ? "link" : "other";
}

export function deriveTypeLabel(
  file: SaveFile | null,
  save: Save,
): string | null {
  if (save.source === "web") return "Web";
  if (file && TEXT_COVER_KINDS.has(file.kind)) return "Text";
  if (arenaBlockClass(save) === "text") return "Text";
  if (
    !file &&
    !hasArchive(save) &&
    textBodyForSave(save).length > 0 &&
    isTextOnlyAsideFromCover(save)
  ) {
    return "Text";
  }
  const extensionLabel = file ? typeLabelForPath(file.path) : null;
  if (extensionLabel) return extensionLabel;
  const subtype = file?.mimeType?.split("/")[1]?.split(";")[0];
  if (subtype) return subtype.toUpperCase();
  const media = save.mediaType?.toLowerCase();
  if (media === "text") return "Text";
  if (media === "video") return "Video";
  if (media === "image") return "Image";
  if (media === "link") return "Website";
  if (save.mediaType) return save.mediaType.toUpperCase();
  return save.url ? "Link" : null;
}
