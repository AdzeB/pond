import { OPS, type Op, type Save, type Source } from "@pond/schema/db";
import { walkCaptureMedia } from "@pond/schema/raw";

const UNIVERSAL_SPEC: readonly Op[] = OPS;

const MAX_ATTEMPTS: Record<Op, number> = {
  harvest_metadata: 5,
  capture_tweet: 4,
  render_text_cover: 3,
  fetch_blobs: 5,
  archive_page: 3,
  fetch_video_ytdlp: 3,
  ensure_poster: 4,
  fetch_avatar: 3,
  finalize: 5,
};

export function maxAttemptsFor(op: Op): number {
  return MAX_ATTEMPTS[op];
}

export function planOps(source: Source): readonly Op[] {
  if (source === "local") return [];
  if (source === "web") {
    return [
      "harvest_metadata",
      "render_text_cover",
      "fetch_blobs",
      "archive_page",
      "finalize",
    ];
  }
  if (source === "twitter" || source === "threads") {
    return UNIVERSAL_SPEC.filter(
      (op) => op !== "archive_page" && op !== "render_text_cover",
    );
  }
  return UNIVERSAL_SPEC.filter(
    (op) => op !== "capture_tweet" && op !== "archive_page",
  );
}

interface CaptureExpectation {
  required: readonly string[];
  recommended: readonly string[];
}

export const CAPTURE_EXPECTATIONS: Record<Source, CaptureExpectation> = {
  twitter: {
    required: ["author"],
    recommended: [
      "title",
      "capture.publishedAt",
      "capture.metrics.likes",
      "capture.metrics.retweets",
      "capture.metrics.replies",
      "capture.author.avatarUrl",
    ],
  },
  instagram: {
    required: ["author", "capture.publishedAt"],
    recommended: [
      "capture.metrics.likes",
      "capture.metrics.comments",
      "capture.author.avatarUrl",
    ],
  },
  tiktok: {
    required: ["author", "capture.duration"],
    recommended: [
      "capture.metrics.likes",
      "capture.metrics.comments",
      "capture.metrics.shares",
      "capture.metrics.views",
      "capture.author.avatarUrl",
    ],
  },
  youtube: {
    required: ["title", "author", "capture.duration"],
    recommended: [
      "capture.metrics.views",
      "capture.metrics.likes",
      "capture.publishedAt",
      "capture.author.avatarUrl",
    ],
  },
  pinterest: {
    required: ["mediaUrl"],
    recommended: ["capture.author.handle", "capture.author.avatarUrl"],
  },
  arena: {
    required: ["capture.id"],
    recommended: [
      "capture.author.name",
      "capture.publishedAt",
      "capture.metrics.comments",
    ],
  },
  cosmos: {
    required: ["sourceId"],
    recommended: [
      "mediaUrl",
      "description",
      "author",
      "capture.media",
      "capture.upstream.url",
      "capture.author.avatarUrl",
    ],
  },
  reddit: {
    required: ["title"],
    recommended: [
      "author",
      "mediaUrl",
      "capture.publishedAt",
      "capture.metrics.likes",
      "capture.metrics.comments",
    ],
  },
  threads: {
    required: ["author"],
    recommended: [
      "title",
      "capture.publishedAt",
      "capture.metrics.likes",
      "capture.metrics.replies",
      "capture.author.avatarUrl",
    ],
  },
  web: {
    required: ["title"],
    recommended: ["description", "mediaUrl"],
  },
  local: { required: [], recommended: [] },
};

export function resolveYtDlpTarget(save: Save): string | null {
  const raw = save.rawJson as {
    capture?: { upstream?: { url?: string } };
  } | null;
  const upstreamUrl = raw?.capture?.upstream?.url;
  if (typeof upstreamUrl === "string" && upstreamUrl.length > 0) {
    return upstreamUrl;
  }
  if (save.source === "pinterest") return null;
  return save.url;
}

export function countCaptureVideos(rawJson: unknown): number {
  if (!rawJson || typeof rawJson !== "object") return 0;
  const capture = (
    rawJson as { capture?: Parameters<typeof walkCaptureMedia>[0] }
  ).capture;
  return walkCaptureMedia(capture).filter((m) => m.type === "video").length;
}

export function expectedVideoDownloads(
  save: Pick<Save, "mediaType" | "rawJson">,
): number {
  const fromCapture = countCaptureVideos(save.rawJson);
  if (fromCapture > 0) return fromCapture;
  return save.mediaType === "video" ? 1 : 0;
}
