#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "resources/bin");
const src = resolve(root, "native-host/pond-native-host.c");
const out = resolve(outDir, "pond-native-host");

if (process.platform !== "darwin") {
  console.log("[pond] native host skipped (darwin only)");
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });

const result = spawnSync("cc", ["-O2", "-o", out, src], { stdio: "inherit" });
if (result.error || result.status !== 0) {
  console.error(
    "[pond] native host compile failed; context-menu capture requires it",
  );
  process.exit(1);
}

console.log(`[pond] native host ok (${out})`);
