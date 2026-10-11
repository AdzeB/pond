import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isCombinableImage } from "@shared/combine-images-layout";
import sharp from "sharp";
import { expect, it } from "vitest";
import { joinRasterImages } from "./combine-images";

it("accepts raster formats supported by the composition pipeline", () => {
  expect(isCombinableImage("image/png", "a.png")).toBe(true);
  expect(isCombinableImage("image/jpeg", "a.jpg")).toBe(true);
  expect(isCombinableImage("image/webp", "a.webp")).toBe(true);
  expect(isCombinableImage("image/gif", "a.gif")).toBe(true);
  expect(isCombinableImage("image/vnd.adobe.photoshop", "a.psd")).toBe(false);
});

it("supports vertical reverse composition, dimensions, spacing, margins, and webp output", async () => {
  const first = await sharp({
    create: { width: 10, height: 20, channels: 4, background: "red" },
  })
    .png()
    .toBuffer();
  const second = await sharp({
    create: { width: 20, height: 10, channels: 4, background: "blue" },
  })
    .png()
    .toBuffer();
  const combined = await joinRasterImages([first, second], {
    direction: "vertical",
    order: "reverse",
    alignment: "end",
    width: 20,
    height: 20,
    spacing: 3,
    margin: 2,
    radius: 2,
    background: "#ffffff",
    opacity: 0.75,
    format: "webp",
    quality: 80,
  });
  const meta = await sharp(combined).metadata();
  expect([meta.width, meta.height, meta.format]).toEqual([20, 31, "webp"]);
});

it("rounds the canvas corners into transparency for PNG", async () => {
  const tile = await sharp({
    create: { width: 20, height: 20, channels: 4, background: "red" },
  })
    .png()
    .toBuffer();
  const combined = await joinRasterImages([tile, tile], {
    canvasRadius: 10,
    format: "png",
  });
  const { data, info } = await sharp(combined)
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect([info.width, info.height]).toEqual([40, 20]);
  expect(data[3]).toBe(0);
  expect(data[(10 * info.width + 20) * 4 + 3]).toBe(255);
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
