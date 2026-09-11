import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { expect, it } from "vitest";
import { cropImage } from "./crop-image";

it("produces a cropped derivative without changing the original bytes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pond-crop-test-"));
  try {
    const original = await sharp({
      create: { width: 100, height: 80, channels: 4, background: "red" },
    })
      .png()
      .toBuffer();
    const path = join(dir, "original.png");
    await writeFile(path, original);
    const result = await cropImage(path, { x: 0.2, y: 0.25, w: 0.5, h: 0.5 });
    const meta = await sharp(result).metadata();
    expect([meta.width, meta.height]).toEqual([50, 40]);
    expect(await readFile(path)).toEqual(original);
    await expect(
      cropImage(path, { x: 0.8, y: 0, w: 0.5, h: 1 }),
    ).rejects.toThrow("inside");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it("exports the inspected GIF frame rather than silently using its first frame", async () => {
  const pixels = Buffer.from([
    ...Array.from({ length: 4 }, () => [255, 0, 0]).flat(),
    ...Array.from({ length: 4 }, () => [0, 0, 255]).flat(),
  ]);
  const gif = await sharp(pixels, {
    raw: { width: 2, height: 4, channels: 3, pageHeight: 2 },
  })
    .gif({ delay: [100, 200] })
    .toBuffer();
  expect((await sharp(gif, { animated: true }).metadata()).pages).toBe(2);
  const result = await cropImage(gif, { x: 0, y: 0, w: 1, h: 1 }, 1);
  const output = await sharp(result).removeAlpha().raw().toBuffer();
  expect([...output.subarray(0, 3)]).toEqual([0, 0, 255]);
});
