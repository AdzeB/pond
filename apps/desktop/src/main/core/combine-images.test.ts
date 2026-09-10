import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { expect, it } from "vitest";
import { isCombinableImage, joinRasterImages } from "./combine-images";

it("accepts only jpeg and png", () => {
  expect(isCombinableImage("image/png", "a.png")).toBe(true);
  expect(isCombinableImage("image/jpeg", "a.jpg")).toBe(true);
  expect(isCombinableImage("image/webp", "a.webp")).toBe(false);
  expect(isCombinableImage("image/gif", "a.gif")).toBe(false);
  expect(isCombinableImage("image/vnd.adobe.photoshop", "a.psd")).toBe(false);
});

it("joins images left to right at the tallest height without touching originals", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pond-combine-"));
  try {
    const left = await sharp({
      create: { width: 10, height: 20, channels: 4, background: "red" },
    })
      .png()
      .toBuffer();
    const right = await sharp({
      create: { width: 10, height: 10, channels: 4, background: "blue" },
    })
      .png()
      .toBuffer();
    const leftPath = join(dir, "left.png");
    const rightPath = join(dir, "right.png");
    await writeFile(leftPath, left);
    await writeFile(rightPath, right);
    const combined = await joinRasterImages([leftPath, rightPath]);
    const meta = await sharp(combined).metadata();
    expect([meta.width, meta.height]).toEqual([30, 20]);
    expect(await readFile(leftPath)).toEqual(left);
    expect(await readFile(rightPath)).toEqual(right);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
