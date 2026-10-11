export interface AudioSegment {
  start: number;
  end: number;
}

export interface AudioSegmentOptions {
  windowSeconds?: number;
  overlapSeconds?: number;
}

const DEFAULT_WINDOW_SECONDS = 30;
const DEFAULT_OVERLAP_SECONDS = 5;

export function segmentAudio(
  sampleCount: number,
  sampleRate: number,
  options: AudioSegmentOptions = {},
): AudioSegment[] {
  if (!Number.isSafeInteger(sampleCount) || sampleCount < 0) {
    throw new RangeError(
      "Audio sample count must be a non-negative safe integer.",
    );
  }
  if (!Number.isSafeInteger(sampleRate) || sampleRate <= 0) {
    throw new RangeError("Audio sample rate must be a positive safe integer.");
  }
  const windowSeconds = options.windowSeconds ?? DEFAULT_WINDOW_SECONDS;
  const overlapSeconds = options.overlapSeconds ?? DEFAULT_OVERLAP_SECONDS;
  const windowSamples = windowSeconds * sampleRate;
  const overlapSamples = overlapSeconds * sampleRate;

  if (!Number.isSafeInteger(windowSamples) || windowSamples <= 0) {
    throw new RangeError(
      "Audio window must resolve to a positive whole number of samples.",
    );
  }
  if (!Number.isSafeInteger(overlapSamples) || overlapSamples < 0) {
    throw new RangeError(
      "Audio overlap must resolve to a non-negative whole number of samples.",
    );
  }
  if (overlapSamples >= windowSamples) {
    throw new RangeError("Audio overlap must be shorter than the window.");
  }
  const segments: AudioSegment[] = [];

  for (let start = 0; start < sampleCount; ) {
    const end = Math.min(start + windowSamples, sampleCount);
    segments.push({ start, end });
    if (end === sampleCount) break;
    start = end - overlapSamples;
  }

  return segments;
}
