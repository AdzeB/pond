#!/usr/bin/env node

/**
 * Rasterize `packages/icons/app/icon.svg` into Chrome action PNGs.
 * @see packages/icons/app/icon.svg
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "icons");
const svgPath = resolve(here, "../../../packages/icons/app/icon.svg");
const require = createRequire(resolve(here, "../../desktop/package.json"));
const sharp = require("sharp");

mkdirSync(outDir, { recursive: true });

function templateSvg(size) {
  const source = readFileSync(svgPath, "utf8");
  return source
    .replace(/\swidth="[^"]+"/, ` width="${size}"`)
    .replace(/\sheight="[^"]+"/, ` height="${size}"`)
    .replace(/fill="#[^"]+"/, 'fill="#000000"');
}

async function write(size) {
  const png = await sharp(Buffer.from(templateSvg(size)))
    .resize(size, size)
    .ensureAlpha()
    .png()
    .toBuffer();
  const out = join(outDir, `${size}.png`);
  writeFileSync(out, png);
  console.log(`wrote ${out} (${size}×${size}, ${png.length} bytes)`);
}

for (const size of [16, 32, 48, 128]) await write(size);
