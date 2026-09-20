import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { transformImageBytes } from "./image-transform";

describe("image file transforms", () => {
  it("crops and rotates supported image bytes", async () => {
    const source = await sharp({
      create: {
        width: 8,
        height: 4,
        channels: 4,
        background: { r: 40, g: 80, b: 120, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const transformed = await transformImageBytes(source, {
      crop: { x: 0, y: 0, w: 0.5, h: 1 },
      rotate: 90,
      flipX: true,
    });

    expect(transformed.info.width).toBe(4);
    expect(transformed.info.height).toBe(4);
    expect((await sharp(transformed.bytes).metadata()).format).toBe("png");
  });

  it("keeps output dimensions for a mirrored image", async () => {
    const metadata = await sharp({
      create: {
        width: 32,
        height: 16,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();
    const transformed = await transformImageBytes(metadata, { flipY: true });
    expect(transformed.info.width).toBe(32);
    expect(transformed.info.height).toBe(16);
  });
});
