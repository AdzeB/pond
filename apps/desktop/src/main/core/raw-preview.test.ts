import { expect, it } from "vitest";
import { extractRawPreviewJpeg } from "./raw-preview";

it("returns the trailing JPEG in a fake RAW container", () => {
  const jpeg = Buffer.from(
    `ffd8ffe000104a46494600010100000100010000${"ff".repeat(4096)}ffd9`,
    "hex",
  );
  const container = Buffer.concat([Buffer.from("CFA0"), jpeg]);
  const preview = extractRawPreviewJpeg(container);
  expect(preview?.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))).toBe(
    true,
  );
  expect(preview?.subarray(-2).equals(Buffer.from([0xff, 0xd9]))).toBe(true);
});

it("returns null when no JPEG is present", () => {
  expect(extractRawPreviewJpeg(Buffer.from("not-an-image"))).toBeNull();
});
