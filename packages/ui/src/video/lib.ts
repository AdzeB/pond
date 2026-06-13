export const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export const FRAME_STEP_SECONDS = 1 / 30;
export const SEEK_HOTKEY_STEP = 5;
export const VOLUME_HOTKEY_STEP = 0.1;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Seconds -> "m:ss" (or "h:mm:ss" past an hour).
export function formatTime(sec: number): string {
  const total = Number.isFinite(sec) ? Math.max(0, Math.floor(sec)) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

// End of the buffered range around the playhead, for painting the scrubber.
export function bufferedEnd(video: HTMLVideoElement): number {
  const { buffered, currentTime } = video;
  let end = 0;
  for (let i = 0; i < buffered.length; i++) {
    if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
      return buffered.end(i);
    }
    end = Math.max(end, buffered.end(i));
  }
  return end;
}
