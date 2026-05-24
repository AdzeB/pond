#!/usr/bin/env node

// macOS reads the dev menu-bar title ("Electron") straight from the
// Electron binary's own Info.plist; `app.setName("Pond")` cannot
// override it. Patch the bundle in node_modules so the dev app shows
// "Pond" in the menu bar, Dock, and ⌘-Tab switcher.
//
// Idempotent. No-op on non-darwin. No-op if Electron isn't installed
// yet. Re-runs after every install since pnpm re-extracts Electron.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_NAME = "Pond";
const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const plistPath = resolve(
  appRoot,
  "node_modules/electron/dist/Electron.app/Contents/Info.plist",
);

async function main() {
  if (process.platform !== "darwin") return;

  let plist;
  try {
    plist = await readFile(plistPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return;
    throw err;
  }

  const patched = patch(plist, "CFBundleName", APP_NAME);
  const patched2 = patch(patched, "CFBundleDisplayName", APP_NAME);

  if (patched2 === plist) {
    console.log(`[pond] electron bundle already named "${APP_NAME}"`);
    return;
  }

  await writeFile(plistPath, patched2, "utf8");
  console.log(`[pond] patched dev Electron bundle name → "${APP_NAME}"`);
}

function patch(plist, key, value) {
  const re = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`, "g");
  return plist.replace(re, `$1${value}$2`);
}

main().catch((err) => {
  console.error("[pond] electron name patch failed:", err);
  process.exitCode = 0;
});
