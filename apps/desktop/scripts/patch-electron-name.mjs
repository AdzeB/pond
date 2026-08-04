#!/usr/bin/env node

/**
 * Patch the vendored Electron.app so macOS dev shows "Pond" in the menu bar,
 * Dock tooltip, and ⌘-Tab. Dock reads the .app bundle filename, so CFBundleName
 * alone is not enough. pnpm re-extracts Electron on install; this re-runs from
 * postinstall.
 */

import { spawnSync } from "node:child_process";
import { copyFile, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_NAME = "Pond";
const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const electronPkg = resolve(appRoot, "node_modules/electron");
const distDir = resolve(electronPkg, "dist");
const pathTxt = resolve(electronPkg, "path.txt");
const electronApp = resolve(distDir, "Electron.app");
const pondApp = resolve(distDir, `${APP_NAME}.app`);
/** Prefer the amber dev mark; fall back to prod if generate-dev-icon hasn't run. */
const pondIcnsPath = resolve(appRoot, "build/icon.development.icns");
const pondIcnsFallback = resolve(appRoot, "build/icon.icns");
const relativeBinary = `${APP_NAME}.app/Contents/MacOS/Electron`;

async function main() {
  if (process.platform !== "darwin") return;

  const appBundle = await ensureNamedBundle();
  if (!appBundle) return;

  const contents = resolve(appBundle, "Contents");
  await patchPlist(resolve(contents, "Info.plist"));
  await patchIcon(resolve(contents, "Resources/electron.icns"));
  await writePathTxt();
  refreshLaunchServices(appBundle);
}

/** Dock tooltip uses the .app filename; rename Electron.app → Pond.app. */
async function ensureNamedBundle() {
  if (await isDir(pondApp)) {
    return pondApp;
  }
  if (!(await isDir(electronApp))) {
    return null;
  }

  try {
    await rename(electronApp, pondApp);
    console.log(`[pond] renamed Electron.app → ${APP_NAME}.app`);
    return pondApp;
  } catch (err) {
    console.warn(
      `[pond] could not rename Electron.app (quit the running app, then: node apps/desktop/scripts/patch-electron-name.mjs): ${err.message}`,
    );
    return electronApp;
  }
}

async function writePathTxt() {
  if (!(await isDir(pondApp))) return;
  try {
    const current = (await readFile(pathTxt, "utf8")).trim();
    if (current === relativeBinary) return;
    await writeFile(pathTxt, relativeBinary, "utf8");
    console.log(`[pond] path.txt → ${relativeBinary}`);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

async function patchPlist(plistPath) {
  let plist;
  try {
    plist = await readFile(plistPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return;
    throw err;
  }

  const patched = patch(
    patch(plist, "CFBundleName", APP_NAME),
    "CFBundleDisplayName",
    APP_NAME,
  );
  if (patched === plist) {
    console.log(`[pond] electron bundle already named "${APP_NAME}"`);
    return;
  }
  await writeFile(plistPath, patched, "utf8");
  console.log(`[pond] patched CFBundleName/DisplayName → "${APP_NAME}"`);
}

async function patchIcon(electronIcnsPath) {
  for (const src of [pondIcnsPath, pondIcnsFallback]) {
    try {
      await copyFile(src, electronIcnsPath);
      console.log(`[pond] patched dev Electron bundle icon → ${src}`);
      return;
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }
}

/** Flush Finder/Dock's cached display name for the renamed bundle. */
function refreshLaunchServices(appBundle) {
  const lsregister =
    "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";
  spawnSync(lsregister, ["-f", appBundle], { stdio: "ignore" });
}

function patch(plist, key, value) {
  const re = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`, "g");
  return plist.replace(re, `$1${value}$2`);
}

async function isDir(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

main().catch((err) => {
  console.error("[pond] electron name patch failed:", err);
  process.exitCode = 0;
});
