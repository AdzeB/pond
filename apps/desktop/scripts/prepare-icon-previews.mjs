#!/usr/bin/env node

/**
 * Bundling the 1024px tints instead costs the renderer ~18 MB and ~50 MB of decoded bitmaps for a 44px grid.
 */

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tintsRoot = resolve(__dirname, "../../../packages/icons/brand/tints");
const outDir = resolve(
  __dirname,
  "../src/renderer/src/generated/app-icon-previews",
);

const PREVIEW_SIZE = 128;

async function sourceFor(dir) {
  const path = join(dir, "default.png");
  try {
    return { path, mtime: (await stat(path)).mtimeMs };
  } catch {
    return null;
  }
}

async function isFresh(out, sourceMtime) {
  try {
    return (await stat(out)).mtimeMs >= sourceMtime;
  } catch {
    return false;
  }
}

async function main() {
  let entries;
  try {
    entries = await readdir(tintsRoot, { withFileTypes: true });
  } catch {
    console.warn(
      "[pond] skip icon previews: packages/icons/brand/tints missing",
    );
    return;
  }

  await mkdir(outDir, { recursive: true });
  let written = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const source = await sourceFor(join(tintsRoot, entry.name));
    if (!source) continue;
    const out = join(outDir, `${entry.name}.png`);
    if (await isFresh(out, source.mtime)) continue;
    const png = await sharp(await readFile(source.path))
      .resize(PREVIEW_SIZE, PREVIEW_SIZE)
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeFile(out, png);
    written += 1;
  }

  console.log(
    `[pond] icon previews ready (${written} written, ${PREVIEW_SIZE}px)`,
  );
}

await main();
