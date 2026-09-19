import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildColorsCss, buildTokensCss } from "./ramps.ts";

const here = dirname(fileURLToPath(import.meta.url));

const outputs = [
  [join(here, "palette.css"), buildColorsCss()],
  [join(here, "scale.css"), buildTokensCss()],
] as const;

if (process.argv.includes("--check")) {
  for (const [path, source] of outputs) {
    if (readFileSync(path, "utf8") !== source) {
      throw new Error("Generated color tokens are stale. Run pnpm generate.");
    }
  }
  console.log("Verified colors/palette.css and colors/scale.css");
} else {
  for (const [path, source] of outputs) writeFileSync(path, source);
  console.log("Generated colors/palette.css and colors/scale.css");
}
