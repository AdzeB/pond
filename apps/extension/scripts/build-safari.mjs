#!/usr/bin/env node
/**
 * Builds the Safari target.
 *
 * WXT has no Safari output today, so this runs a normal WXT build for Safari and then
 * hands the result to Apple's `safari-web-extension-converter`, which generates the
 * Xcode project that wraps it in a Safari App Extension.
 *
 * The converter ships with Xcode (not the Command Line Tools), so this script checks
 * for it and explains what is missing rather than failing halfway through.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "dist/safari");

function fail(message) {
  console.error(`[pond safari] ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error || result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed`);
  }
}

if (process.platform !== "darwin") {
  // Safari extensions exist only on Apple platforms.
  console.log("[pond safari] skipped (Safari is macOS and iOS only)");
  process.exit(0);
}

const xcode = spawnSync("xcrun", ["--find", "xcodebuild"], {
  encoding: "utf8",
});
if (xcode.error || xcode.status !== 0) {
  fail(
    "Xcode is required for the Safari target: safari-web-extension-converter ships with it, not with the Command Line Tools.",
  );
}

// 1. WXT build for the Safari browser target.
run("pnpm", ["exec", "wxt", "build", "-b", "safari", "--mv3"], { cwd: root });

// 2. Wrap the built extension in a Safari App Extension Xcode project.
const candidates = [
  resolve(root, ".output/safari-mv3"),
  resolve(root, ".output/safari-mv2"),
];
const source = candidates.find((candidate) => existsSync(candidate));
if (!source) {
  fail("WXT did not produce a Safari build directory.");
}

mkdirSync(outDir, { recursive: true });
run("xcrun", [
  "safari-web-extension-converter",
  source,
  "--project-location",
  outDir,
  "--app-name",
  "Pond",
  "--bundle-identifier",
  "app.pond.safari",
  "--swift",
  "--macos-only",
  "--no-open",
  "--no-prompt",
]);

console.log(`[pond safari] Xcode project written to ${outDir}`);
console.log(
  "[pond safari] the SafariWebExtensionHandler lives in apps/extension/safari/",
);
