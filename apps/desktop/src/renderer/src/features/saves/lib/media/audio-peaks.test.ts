import { expect, it } from "vitest";
import { downsamplePeaks } from "./audio-peaks";

it("buckets absolute peaks", () => {
  const samples = new Float32Array([0, 0.5, -1, 0.25, 0, 0]);
  expect(downsamplePeaks(samples, 2)).toEqual([1, 0.25]);
});

it("returns zeros for silence", () => {
  expect(downsamplePeaks(new Float32Array(8), 4)).toEqual([0, 0, 0, 0]);
});
