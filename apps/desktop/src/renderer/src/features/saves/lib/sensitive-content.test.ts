import { describe, expect, it } from "vitest";
import { shouldBlurSensitiveThumbnail } from "./sensitive-content";

describe("sensitive thumbnail policy", () => {
  it("only blurs likely-sensitive results when enabled", () => {
    expect(shouldBlurSensitiveThumbnail(true, 0.8)).toBe(true);
    expect(shouldBlurSensitiveThumbnail(true, 0.79)).toBe(false);
    expect(shouldBlurSensitiveThumbnail(false, 0.99)).toBe(false);
    expect(shouldBlurSensitiveThumbnail(true, null)).toBe(false);
  });
});
