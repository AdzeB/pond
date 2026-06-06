import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildColorsCss, buildTokensCss } from "./ramps.ts";

const here = dirname(fileURLToPath(import.meta.url));
const themeDir = join(here, "..", "theme");
mkdirSync(themeDir, { recursive: true });

writeFileSync(join(here, "colors.css"), buildColorsCss());
writeFileSync(join(themeDir, "tokens.css"), buildTokensCss());

console.log("Generated colors.css and theme/tokens.css");
