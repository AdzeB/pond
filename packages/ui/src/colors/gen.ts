import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAliasesCss, buildColorsCss } from "./ramps.ts";

const here = dirname(fileURLToPath(import.meta.url));
const themeDir = join(here, "..", "theme");
mkdirSync(themeDir, { recursive: true });

writeFileSync(join(here, "colors.css"), buildColorsCss());
writeFileSync(join(themeDir, "aliases.css"), buildAliasesCss());

console.log("Generated colors.css and theme/aliases.css");
