#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rebuild } from "@electron/rebuild";

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

async function main() {
  const version = await electronVersion();
  console.log(`[pond] rebuilding native modules for electron ${version}`);

  await rebuild({
    buildPath: appRoot,
    electronVersion: version,
    onlyModules: ["better-sqlite3-multiple-ciphers"],
    force: true,
  });

  console.log("[pond] native rebuild ok");
}

main().catch((err) => {
  console.error("[pond] native rebuild failed:", err);
  process.exit(1);
});
