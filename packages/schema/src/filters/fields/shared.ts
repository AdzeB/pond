import type { SaveLike } from "./save-like";

export function toMillis(
  v: string | Date | number | null | undefined,
): number | null {
  if (v == null) return null;
  const ms = v instanceof Date ? v.getTime() : Number.parseFloat(String(v));
  if (Number.isFinite(ms)) return ms;
  const parsed = Date.parse(String(v));
  return Number.isFinite(parsed) ? parsed : null;
}

export function durationSeconds(s: SaveLike): number | null {
  const raw = s.rawJson;
  if (!raw) return null;

  const fromCapture = raw.capture?.duration ?? 0;
  if (fromCapture > 0) return fromCapture;

  for (const m of raw.capture?.media ?? []) {
    if ((m.durationSec ?? 0) > 0) return m.durationSec ?? null;
  }

  const ytdlpDuration = raw.ytdlp?.duration ?? 0;
  return ytdlpDuration > 0 ? ytdlpDuration : null;
}
