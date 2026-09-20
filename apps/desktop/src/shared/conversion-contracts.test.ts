import { expect, it } from "vitest";
import {
  ConversionPresetSchema,
  ImageCompressionRequestSchema,
  RasterCompositionOptionsSchema,
} from "./conversion-contracts";

it("keeps presets from the original four-format contract compatible", () => {
  expect(
    ConversionPresetSchema.parse({
      id: "legacy",
      name: "Legacy Web Image",
      format: "webp",
    }),
  ).toMatchObject({
    format: "webp",
    quality: 85,
    lossless: false,
    start: 0,
    duration: 5,
    fps: 12,
  });
});

it("validates bounded batch compression inputs", () => {
  expect(
    ImageCompressionRequestSchema.parse({
      ids: ["a", "a", "b"],
      mode: "quality",
      quality: 70,
    }),
  ).toMatchObject({ fileIndex: 0, mode: "quality", quality: 70 });
  expect(
    ImageCompressionRequestSchema.safeParse({
      ids: ["a"],
      mode: "quality",
      quality: 0,
    }).success,
  ).toBe(false);
});

it("shares raster output defaults with image composition", () => {
  expect(RasterCompositionOptionsSchema.parse({})).toEqual({
    format: "png",
    quality: 85,
    lossless: false,
  });
});
