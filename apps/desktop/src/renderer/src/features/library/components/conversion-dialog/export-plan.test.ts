import type { ConversionCapability } from "@shared/conversion-contracts";
import { describe, expect, it } from "vitest";
import { boxForMode, canConvert, fitInside, sizeModeFor } from "./export-plan";

const capability = (adapter: ConversionCapability["adapter"]) =>
  ({
    format: adapter === "sharp" ? "webp" : "gif",
    category: adapter === "sharp" ? "image" : "animation",
    adapter,
    extension: adapter === "sharp" ? "webp" : "gif",
    mimeType: adapter === "sharp" ? "image/webp" : "image/gif",
    available: true,
    unavailableReason: null,
    supportsLossless: adapter === "sharp",
  }) satisfies ConversionCapability;

const file = (path: string, mimeType: string) => ({
  kind: "original",
  path,
  sha256: path,
  size: 1,
  mimeType,
});

describe("size modes", () => {
  it("reads the mode back from a preset's box", () => {
    expect(sizeModeFor({ width: null, height: null })).toBe("original");
    expect(sizeModeFor({ width: 900, height: null })).toBe("width");
    expect(sizeModeFor({ width: null, height: 600 })).toBe("height");
    expect(sizeModeFor({ width: 1200, height: 1200 })).toBe("long-edge");
    expect(sizeModeFor({ width: 1200, height: 800 })).toBe("box");
  });

  it("keeps the current edge when switching modes", () => {
    const current = { width: 900, height: null };
    expect(boxForMode("height", current)).toEqual({ width: null, height: 900 });
    expect(boxForMode("long-edge", current)).toEqual({
      width: 900,
      height: 900,
    });
    expect(boxForMode("original", current)).toEqual({
      width: null,
      height: null,
    });
    expect(boxForMode("width", { width: null, height: null })).toEqual({
      width: 1920,
      height: null,
    });
  });
});

describe("fitInside", () => {
  it("scales down to the tightest edge without enlarging", () => {
    expect(fitInside(1600, 1000, { width: 900, height: null })).toEqual({
      width: 900,
      height: 563,
    });
    expect(fitInside(1000, 1500, { width: 1200, height: 1200 })).toEqual({
      width: 800,
      height: 1200,
    });
    expect(fitInside(800, 600, { width: 1920, height: null })).toEqual({
      width: 800,
      height: 600,
    });
  });
});

describe("canConvert", () => {
  it("accepts images for every format and video only for FFmpeg formats", () => {
    const image = file("a.jpg", "image/jpeg");
    const video = file("a.mp4", "video/mp4");
    const pdf = file("a.pdf", "application/pdf");
    expect(canConvert(image, capability("sharp"))).toBe(true);
    expect(canConvert(video, capability("sharp"))).toBe(false);
    expect(canConvert(video, capability("ffmpeg"))).toBe(true);
    expect(canConvert(pdf, capability("ffmpeg"))).toBe(false);
  });
});
