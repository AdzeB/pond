import type { Op } from "@pond/schema/db";

export const TASK_WATCHDOG_MS = {
  harvest_metadata: 90_000,
  capture_tweet: 120_000,
  render_text_cover: 60_000,
  fetch_blobs: 5 * 60_000,
  archive_page: 8 * 60_000,
  fetch_video_ytdlp: 10 * 60_000,
  ensure_poster: 60_000,
  fetch_avatar: 60_000,
  finalize: 30_000,
} satisfies Record<Op, number>;
