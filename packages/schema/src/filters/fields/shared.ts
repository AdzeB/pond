import type { SaveLike } from "./save-like";

export function toMillis(
  v: string | Date | number | null | undefined,
): number | null {
  if (v == null) return null;
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

export function durationSeconds(s: SaveLike): number | null {
  const raw = s.rawJson;
  if (!raw) return null;

  const fromCapture = raw.capture?.duration;
  if (typeof fromCapture === "number" && fromCapture > 0) return fromCapture;

  for (const m of raw.capture?.media ?? []) {
    if (typeof m.durationSec === "number" && m.durationSec > 0) {
      return m.durationSec;
    }
  }

  const ytdlpDuration = raw.ytdlp?.duration;
  if (typeof ytdlpDuration === "number" && ytdlpDuration > 0) {
    return ytdlpDuration;
  }

  return null;
}
