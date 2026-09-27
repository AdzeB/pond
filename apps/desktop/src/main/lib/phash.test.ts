import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { encodePhash } from "./phash";

async function gradient(reverse = false): Promise<Buffer> {
  const pixels = Buffer.alloc(64 * 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      pixels[y * 64 + x] = reverse ? 255 - x * 4 : x * 4;
    }
  }
  return sharp(pixels, {
    raw: { width: 64, height: 64, channels: 1 },
  })
    .png()
    .toBuffer();
}

describe("encodePhash", () => {
  it("returns a stable 64-bit difference hash", async () => {
    const image = await gradient();
    const copy = Buffer.from(image);

    expect(await encodePhash(image)).toBe(await encodePhash(copy));
    expect(await encodePhash(image)).toMatch(/^[a-f0-9]{16}$/);
    expect(await encodePhash(await gradient(true))).not.toBe(
      await encodePhash(image),
    );
  });
});
