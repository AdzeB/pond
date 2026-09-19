#!/usr/bin/env node

// Electron 42+ no longer runs install.js on pnpm install. electron-vite
// expects path.txt to exist and won't trigger the lazy download itself.
// Resolve the package once so the binary is present before dev/build.

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const require = createRequire(resolve(appRoot, "package.json"));

async function main() {
  const electronPath = require("electron");
  console.log(`[pond] electron binary ok (${electronPath})`);
}

main().catch((err) => {
  console.error("[pond] electron binary install failed:", err);
  process.exitCode = 1;
});
