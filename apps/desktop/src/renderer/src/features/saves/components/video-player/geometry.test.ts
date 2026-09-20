import { describe, expect, it } from "vitest";
import { videoScaleForRotation } from "./geometry";

describe("videoScaleForRotation", () => {
  it("scales a rotated landscape video to the viewer height", () => {
    expect(videoScaleForRotation(1200, 700, 16 / 9, 90)).toBeCloseTo(7 / 12);
    expect(videoScaleForRotation(1200, 700, 16 / 9, 270)).toBeCloseTo(7 / 12);
  });

  it("keeps rotated media at full scale when it already fits", () => {
    expect(videoScaleForRotation(1200, 700, 9 / 16, 90)).toBe(1);
  });

  it("does not scale unrotated media", () => {
    expect(videoScaleForRotation(700, 1200, 16 / 9, 180)).toBe(1);
  });
});
