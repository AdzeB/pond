import { describe, expect, it } from "vitest";
import { isStaticThumbnailFile } from "./media-index";

describe("media thumbnail contract", () => {
  it("accepts supported stills and legacy extensionless covers", () => {
    expect(
      isStaticThumbnailFile({
        kind: "image",
        path: "photo.jpg",
        mimeType: "image/jpeg",
      }),
    ).toBe(true);
    expect(
      isStaticThumbnailFile({ kind: "cover", path: "cover.", mimeType: "" }),
    ).toBe(true);
  });

  it("rejects vector and unsupported raster formats; GIFs use a first-frame still", () => {
    expect(
      isStaticThumbnailFile({
        kind: "image",
        path: "animation.gif",
        mimeType: "image/gif",
      }),
    ).toBe(true);
    expect(
      isStaticThumbnailFile({
        kind: "image",
        path: "graphic.svg",
        mimeType: "image/svg+xml",
      }),
    ).toBe(false);
    expect(
      isStaticThumbnailFile({
        kind: "image",
        path: "bitmap.bmp",
        mimeType: "image/bmp",
      }),
    ).toBe(false);
  });
});
