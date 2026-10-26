#!/usr/bin/env node
/**
 * Compiles the Safari App Extension into `resources/`, so electron-builder bundles it
 * inside Pond.app and the extension ships from the same binary as the desktop app.
 *
 * Safari cannot launch an external native-messaging host, so the host has to live inside
 * the app bundle as a `SafariWebExtensionHandler`. That means the extension is part of
 * Pond, not a separate download, and the two can never drift apart.
 *
 * Run before `electron-builder`: electron-builder signs whatever is in resources/ and,
 * on macOS, places a `.appex` under Contents/PlugIns.
 *
 * Skipped outside macOS, and skipped without Xcode, because
 * `safari-web-extension-converter` ships with the full IDE.
 */

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = resolve(desktopRoot, "../extension");
const workDir = resolve(desktopRoot, ".safari-build");
const outDir = resolve(desktopRoot, "resources/SafariExtension");

/**
 * The app's bundle identifier, read from electron-builder.yml rather than hardcoded.
 *
 * A Safari App Extension must carry a `CFBundleIdentifier` prefixed by its host app's, so
 * a stale copy here produces an app that packs fine and then fails to sign. Reading
 * `appId` keeps the two in step when it changes.
 */
function appBundleId() {
  const yml = readFileSync(
    resolve(desktopRoot, "electron-builder.yml"),
    "utf8",
  );
  const match = yml.match(/^appId:\s*(\S+)\s*$/m);
  if (!match) fail("electron-builder.yml has no top-level appId");
  return match[1];
}

function skip(reason) {
  console.log(`[pond safari] skipped: ${reason}`);
  process.exit(0);
}

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

if (process.platform !== "darwin") skip("Safari is macOS and iOS only");

const xcode = spawnSync("xcrun", ["--find", "xcodebuild"], {
  encoding: "utf8",
});
if (xcode.error || xcode.status !== 0) skip("Xcode is not installed");

// 1. Extension bundle for Safari.
run("pnpm", ["exec", "wxt", "build", "-b", "safari", "--mv3"], {
  cwd: extensionRoot,
});

// 2. Wrap it in a Safari App Extension project. The converter needs a clean directory.
rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });
run("xcrun", [
  "safari-web-extension-converter",
  resolve(extensionRoot, ".output/safari-mv3"),
  "--project-location",
  workDir,
  "--app-name",
  "Pond",
  "--bundle-identifier",
  appBundleId(),
  "--swift",
  "--macos-only",
  "--no-open",
  "--no-prompt",
]);

const projectRoot = join(workDir, "Pond");
const extensionSource = join(
  projectRoot,
  "Pond Extension/SafariWebExtensionHandler.swift",
);
if (!existsSync(extensionSource))
  fail("the converter did not produce an extension target");

// 3. Replace the converter's echo stub with the real handler that talks to Pond.
cpSync(
  resolve(extensionRoot, "safari/SafariWebExtensionHandler.swift"),
  extensionSource,
);

// 3b. Give the host and the extension matching identifiers. The converter derives the
// extension's from `--bundle-identifier` but the app's from `--app-name`, so the two can
// disagree; Xcode then refuses to embed the appex ("bundle identifier is not prefixed
// with the parent app's"). Both are set from appId here, since this project only exists
// to build the appex and is thrown away afterwards.
const identifier = appBundleId();
const projectFile = join(projectRoot, "Pond.xcodeproj/project.pbxproj");
const project = readFileSync(projectFile, "utf8").replace(
  /PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g,
  (current) =>
    `PRODUCT_BUNDLE_IDENTIFIER = ${current.includes("Extension") ? `${identifier}.SafariExtension` : identifier};`,
);
writeFileSync(projectFile, project);

// 4. Build the extension target, then keep the .appex. The deployment target is pinned
// because the converter derives it from the installed Xcode (10.14 on Xcode 26, 12.0 on
// 27), and an older SDK rejects newer APIs that compile fine locally.
run("xcodebuild", [
  "-project",
  join(projectRoot, "Pond.xcodeproj"),
  "-scheme",
  "Pond",
  "-configuration",
  "Release",
  "-derivedDataPath",
  join(workDir, "build"),
  "MACOSX_DEPLOYMENT_TARGET=14.0",
  "build",
]);

const builtAppex = join(
  workDir,
  "build/Build/Products/Release/Pond.app/Contents/PlugIns/Pond Extension.appex",
);
if (!existsSync(builtAppex)) fail("the .appex was not produced");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(dirname(outDir), { recursive: true });
cpSync(builtAppex, join(outDir, "Pond Extension.appex"), { recursive: true });

console.log(`[pond safari] extension bundled at ${outDir}`);
console.log(
  "[pond safari] electron-builder places it under Contents/PlugIns and signs it.",
);
