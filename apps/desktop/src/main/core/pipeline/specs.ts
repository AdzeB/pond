import { OPS, type Op, type Save, type Source } from "@pond/schema/db";

const UNIVERSAL_SPEC: readonly Op[] = OPS;

/** Per-op attempt budget, tuned to each worker's cost and recoverability. */
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
  /** Local saves carry everything at import time; no pipeline ops. */
  if (source === "local") return [];
  /** Generic web links fetch metadata + cover, plus a replayable WARC site archive. */
  if (source === "web") {
    return [
      "harvest_metadata",
      "render_text_cover",
      "fetch_blobs",
      "archive_page",
      "finalize",
    ];
  }
  /** capture_tweet is twitter-only; archive_page is web-only; text covers skip twitter (uses tweet screenshots). */
  if (source === "twitter") {
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
    /** Identity is enough to finalize; text-only elements have no og:image, so mediaUrl stays recommended. */
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
  /** Generic web links: a title is the bar; cover + description are nice-to-have. */
  web: {
    required: ["title"],
    recommended: ["description", "mediaUrl"],
  },
  /** Local imports supply their own metadata; nothing to grade. */
  local: { required: [], recommended: [] },
};

/** Returns the upstream URL when set (an embedded host yt-dlp handles); null for pinterest. */
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
