#!/usr/bin/env node

/** Derive an amber Dock/window icon from build/icon.png for unpackaged runs. */

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = resolve(__dirname, "../build");
const sourcePng = join(buildDir, "icon.png");
const outPng = join(buildDir, "icon.development.png");
const outIcns = join(buildDir, "icon.development.icns");

const AMBER = { r: 0xe5, g: 0xa0, b: 0x0d };

async function main() {
  let data;
  let info;
  try {
    ({ data, info } = await sharp(sourcePng)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }));
  } catch (err) {
    if (err.code === "ENOENT") {
      console.warn("[pond] skip dev icon: build/icon.png missing");
      return;
    }
    throw err;
  }

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    if (lum < 80) {
      data[i] = AMBER.r;
      data[i + 1] = AMBER.g;
      data[i + 2] = AMBER.b;
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(outPng);
  console.log("[pond] wrote build/icon.development.png");

  if (process.platform === "darwin") {
    await writeIcns(outPng, outIcns);
  }
}

async function writeIcns(pngPath, icnsPath) {
  const parent = await mkdtemp(join(tmpdir(), "pond-dev-icon-"));
  const iconset = join(parent, "icon.development.iconset");
  try {
    await mkdir(iconset, { recursive: true });
    for (const size of [16, 32, 128, 256, 512]) {
      const base = join(iconset, `icon_${size}x${size}.png`);
      const retina = join(iconset, `icon_${size}x${size}@2x.png`);
      resize(pngPath, size, base);
      resize(pngPath, size * 2, retina);
    }
    const result = spawnSync(
      "iconutil",
      ["-c", "icns", iconset, "-o", icnsPath],
      { stdio: "inherit" },
    );
    if (result.status !== 0) {
      console.warn("[pond] iconutil failed; Dock patch will use PNG only");
      return;
    }
    console.log("[pond] wrote build/icon.development.icns");
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

function resize(src, size, dest) {
  const result = spawnSync(
    "sips",
    ["-z", String(size), String(size), src, "--out", dest],
    { stdio: "ignore" },
  );
  if (result.status !== 0) {
    throw new Error(`sips failed resizing to ${size}px`);
  }
}

main().catch((err) => {
  console.error("[pond] generate-dev-icon failed:", err);
  process.exitCode = 0;
});
