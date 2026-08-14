#!/usr/bin/env node

/**
 * Rasterize `packages/icons/app/icon.svg` into menu-bar template PNGs.
 * @see packages/icons/app/icon.svg
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "resources");
const svgPath = resolve(here, "../../../packages/icons/app/icon.svg");

mkdirSync(outDir, { recursive: true });

/** Menu-bar extras sit in a 22pt slot; the brand SVG is full-bleed so it has to be inset to match neighboring glyphs. */
const CONTENT_SCALE = 0.62;

function templateSvg(size) {
  const source = readFileSync(svgPath, "utf8");
  return source
    .replace(/\swidth="[^"]+"/, ` width="${size}"`)
    .replace(/\sheight="[^"]+"/, ` height="${size}"`)
    .replace(/fill="#[^"]+"/, 'fill="#000000"');
}

async function write(size, filename) {
  const contentSize = Math.round(size * CONTENT_SCALE);
  const offset = Math.round((size - contentSize) / 2);
  const content = await sharp(Buffer.from(templateSvg(contentSize)))
    .resize(contentSize, contentSize)
    .ensureAlpha()
    .png()
    .toBuffer();
  const png = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: content, left: offset, top: offset }])
    .png()
    .toBuffer();
  const out = join(outDir, filename);
  writeFileSync(out, png);
  console.log(`wrote ${out} (${size}×${size}, ${png.length} bytes)`);
}

await write(22, "trayTemplate.png");
await write(44, "trayTemplate@2x.png");
