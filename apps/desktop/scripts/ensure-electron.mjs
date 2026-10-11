#!/usr/bin/env node

/** Electron 42+ skips install.js under pnpm, and electron-vite needs path.txt before dev or build. */

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
