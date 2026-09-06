import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { decodeHeicOnMac } from "./heic";

const fixture = fileURLToPath(
  new URL("../../../test/fixtures/portrait.heic", import.meta.url),
);

describe.skipIf(process.platform !== "darwin")("macOS HEIC decoding", () => {
  it("decodes photo pixels instead of a file icon and preserves portrait proportions", async () => {
    const decoded = await decodeHeicOnMac(fixture, 64);
    const { data, info } = await sharp(decoded)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(32);
    expect(info.height).toBe(64);
    expect(data[0]).toBeGreaterThan(180);
    expect(data[1]).toBeLessThan(70);
    expect(data[2]).toBeLessThan(80);
  });

  it("rejects unreadable sources instead of returning an icon", async () => {
    await expect(decodeHeicOnMac(`${fixture}.missing`, 64)).rejects.toThrow();
  });
});
