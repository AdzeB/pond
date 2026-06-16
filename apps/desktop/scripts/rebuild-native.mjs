#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");

async function electronVersion() {
  const pkg = JSON.parse(
    await readFile(
      resolve(appRoot, "node_modules/electron/package.json"),
      "utf8",
    ),
  );
  return pkg.version;
}

function run(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`exit ${code}`)),
    );
    child.on("error", reject);
  });
}

async function buildGlassAddon(version) {
  // macOS-only native module (NSGlassEffectView); skip elsewhere — the JS
  // wrapper falls back to no-ops when the .node is absent.
  if (process.platform !== "darwin") {
    console.log("[pond] skipping native-glass build (not macOS)");
    return;
  }
  const glassRoot = resolve(appRoot, "../../packages/native-glass");
  console.log(`[pond] building @pond/native-glass for electron ${version}`);
  await run(
    "pnpm",
    [
      "exec",
      "node-gyp",
      "rebuild",
      `--target=${version}`,
      `--arch=${process.arch}`,
      "--dist-url=https://electronjs.org/headers",
    ],
    {
      cwd: glassRoot,
      env: { ...process.env, npm_config_runtime: "electron" },
    },
  );
}

async function main() {
  const version = await electronVersion();
  console.log(`[pond] rebuilding native modules for electron ${version}`);

  await run(
    "pnpm",
    [
      "exec",
      "electron-rebuild",
      "--version",
      version,
      "--only",
      "better-sqlite3",
      "--force",
    ],
    { cwd: appRoot },
  );

  await buildGlassAddon(version);

  console.log("[pond] native rebuild ok");
}

main().catch((err) => {
  console.error("[pond] native rebuild failed:", err);
  process.exit(1);
});
