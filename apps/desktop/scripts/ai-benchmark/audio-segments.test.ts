import { describe, expect, test } from "vitest";
import { segmentAudio } from "./audio-segments";

describe("audio segmentation", () => {
  test("segments the canonical 95-second fixture using integer samples", () => {
    expect(segmentAudio(95 * 16_000, 16_000)).toEqual([
      { start: 0, end: 480_000 },
      { start: 400_000, end: 880_000 },
      { start: 800_000, end: 1_280_000 },
      { start: 1_200_000, end: 1_520_000 },
    ]);
  });

  test("supports explicit windows and overlap while covering the tail once", () => {
    const segments = segmentAudio(23, 2, {
      windowSeconds: 5,
      overlapSeconds: 2,
    });

    expect(segments).toEqual([
      { start: 0, end: 10 },
      { start: 6, end: 16 },
      { start: 12, end: 22 },
      { start: 18, end: 23 },
    ]);
    expect(segments.every(({ start, end }) => end - start <= 10)).toBe(true);
    expect(segments.filter(({ end }) => end === 23)).toHaveLength(1);
  });

  test("rejects invalid sample counts", () => {
    expect(() => segmentAudio(-1, 16_000)).toThrow(/sample count/i);
    expect(() => segmentAudio(1.5, 16_000)).toThrow(/sample count/i);
    expect(() => segmentAudio(Number.MAX_SAFE_INTEGER + 1, 16_000)).toThrow(
      /sample count/i,
    );
    expect(segmentAudio(0, 16_000)).toEqual([]);
  });

  test("rejects invalid sample rates", () => {
    for (const sampleRate of [0, -1, 16_000.5, Number.POSITIVE_INFINITY]) {
      expect(() => segmentAudio(100, sampleRate)).toThrow(/sample rate/i);
    }
  });

  test("rejects configurations without integral, forward-moving boundaries", () => {
    for (const windowSeconds of [0, -1, 0.00001, Number.NaN]) {
      expect(() => segmentAudio(100, 16_000, { windowSeconds })).toThrow(
        /window/i,
      );
    }
    for (const overlapSeconds of [-1, 30, 31, Number.NaN]) {
      expect(() => segmentAudio(100, 16_000, { overlapSeconds })).toThrow(
        /overlap/i,
      );
    }
  });
});
