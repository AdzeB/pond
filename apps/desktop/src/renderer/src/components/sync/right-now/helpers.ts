import type { Op } from "@pond/schema/db";
import { getSourceLabel } from "@/lib/source-labels";

export interface ProcessingDetail {
  id: string;
  url: string;
  title: string | null;
  source: string;
  status: "ingesting" | "failed";
  progress: { done: number; total: number };
  stageOp: Op | null;
  stageTaskId: string | null;
  stageStatus: "pending" | "running" | "done" | "failed" | "blocked" | null;
  lastError: string | null;
  lastErrorName: string | null;
  lastErrorAt: string | null;
  nextRunAt: string | null;
  attempts: number;
  maxAttempts: number;
  ingestStartedAt: string | null;
}

export interface ProcessingDetailsPayload {
  rows: ProcessingDetail[];
  truncated: number;
}

export const STAGE_LABELS: Record<Op, string> = {
  harvest_metadata: "Fetching metadata",
  capture_tweet: "Capturing tweet",
  fetch_blobs: "Downloading media",
  fetch_video_ytdlp: "Downloading video",
  ensure_poster: "Generating thumbnail",
  fetch_avatar: "Fetching avatar",
  finalize: "Finalizing",
};

export const STAGE_SUBJECTS: Record<Op, string> = {
  harvest_metadata: "metadata",
  capture_tweet: "tweet",
  fetch_blobs: "media",
  fetch_video_ytdlp: "video",
  ensure_poster: "thumbnail",
  fetch_avatar: "avatar",
  finalize: "save",
};

export interface ErrorExplain {
  short: string;
  tone: "danger" | "warn" | "muted";
  hint?: string;
}

export function explainTaskError(
  errorName: string | null,
  rawError: string | null,
  source: string,
  stageOp: Op | null,
): ErrorExplain {
  const subject = stageOp ? STAGE_SUBJECTS[stageOp] : "save";
  const sourceLabel = getSourceLabel(source);
  switch (errorName) {
    case "TerminalError":
      return {
        short: `${sourceLabel} didn't return ${subject} for this URL.`,
        tone: "warn",
        hint: "The post may be deleted, private, or unsupported. Opening the URL usually confirms which.",
      };
    case "UnsupportedError":
      return {
        short: `${sourceLabel} doesn't support this URL yet.`,
        tone: "muted",
      };
    case "AuthRequiredError":
      return {
        short: `Sign in to ${sourceLabel} to keep ingesting.`,
        tone: "danger",
        hint: "Open Sync to reconnect. Blocked tasks resume automatically once you're signed in.",
      };
    case "RateLimitedError":
      return {
        short: `${sourceLabel} rate-limited this fetch.`,
        tone: "warn",
        hint: "Will retry once the rate window resets.",
      };
    case "GeoRestrictedError":
      return {
        short: `${sourceLabel} blocks this region.`,
        tone: "muted",
      };
    case "TransientError":
      return {
        short: `Network blip while fetching ${subject}.`,
        tone: "warn",
        hint: "Usually self-heals on retry.",
      };
    case "WorkerWatchdogError":
      return {
        short: `Worker took too long and was killed.`,
        tone: "warn",
        hint: "Often happens when the host is slow. Retry will start fresh.",
      };
    case "FinalizeIncompleteError":
      return {
        short: `Missing some required fields after capture.`,
        tone: "warn",
        hint: "The metadata fetch will get another swing automatically.",
      };
    default:
      return {
        short: rawError ?? "Something went wrong.",
        tone: "danger",
      };
  }
}

export function formatRelative(now: number, iso: string | null): string | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  const delta = ts - now;
  const abs = Math.abs(delta);
  const sec = Math.round(abs / 1000);
  if (sec < 45) {
    return delta >= 0 ? `in <1m` : `<1m ago`;
  }
  const min = Math.round(sec / 60);
  if (min < 60) {
    return delta >= 0 ? `in ${min}m` : `${min}m ago`;
  }
  const hr = Math.round(min / 60);
  if (hr < 36) {
    return delta >= 0 ? `in ${hr}h` : `${hr}h ago`;
  }
  const day = Math.round(hr / 24);
  return delta >= 0 ? `in ${day}d` : `${day}d ago`;
}

export function describeGate(
  reason: "cooldown" | "breaker",
  until: number,
  now: number,
  sourceLabel: string,
): { short: string; long: string } {
  const rel = formatRelative(now, new Date(until).toISOString());
  if (reason === "cooldown") {
    return {
      short: `${sourceLabel} rate-limited`,
      long: `${sourceLabel} hit a rate limit. New fetches resume ${rel ?? "shortly"}.`,
    };
  }
  return {
    short: `${sourceLabel} paused`,
    long: `${sourceLabel} hit several failures in a row, so the circuit breaker is holding new fetches until ${rel ?? "soon"} to avoid stampeding the host.`,
  };
}

export type Selection =
  | { kind: "all" }
  | { kind: "source"; source: string }
  | { kind: "failed" };

export function describeIngestingStage(
  row: ProcessingDetail,
  now: number,
): { label: string; tone?: "warn" | "muted"; hint?: string } {
  if (!row.stageOp) {
    return { label: "Queued, waiting for a worker", tone: "muted" };
  }
  const baseLabel = STAGE_LABELS[row.stageOp];
  if (row.stageStatus === "running") {
    const dwell = formatRelative(now, row.ingestStartedAt);
    return {
      label: dwell ? `${baseLabel}: running ${dwell}` : `${baseLabel}: running`,
      hint:
        row.attempts > 1
          ? `Attempt ${row.attempts} of ${row.maxAttempts}.`
          : undefined,
    };
  }
  if (row.stageStatus === "blocked") {
    return {
      label: `${baseLabel}: blocked`,
      tone: "warn",
      hint:
        row.lastError ??
        "Pipeline blocked this step. Often clears once auth or rate limits resolve.",
    };
  }
  if (row.stageStatus === "pending") {
    const rel = formatRelative(now, row.nextRunAt);
    if (row.attempts > 0) {
      return {
        label: rel
          ? `${baseLabel}: retrying ${rel}`
          : `${baseLabel}: retrying soon`,
        tone: "warn",
        hint:
          row.maxAttempts > 0
            ? `Attempt ${row.attempts + 1} of ${row.maxAttempts}.`
            : undefined,
      };
    }
    return {
      label: rel ? `${baseLabel}: starts ${rel}` : `${baseLabel}: queued`,
      tone: "muted",
    };
  }
  return { label: baseLabel };
}

export function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`.replace(/\/$/, "") || u.host;
  } catch {
    return url;
  }
}

export function describeCounts(ingesting: number, failed: number): string {
  const parts: string[] = [];
  if (ingesting > 0) parts.push(`${ingesting} processing`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (parts.length === 0) return "All caught up.";
  return parts.join(" · ");
}

export function paneTitle(selection: Selection): string {
  if (selection.kind === "all") return "Processing";
  if (selection.kind === "failed") return "Failed";
  return getSourceLabel(selection.source);
}
