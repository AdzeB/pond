import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildColorsCss, buildTokensCss } from "./ramps.ts";

const here = dirname(fileURLToPath(import.meta.url));

writeFileSync(join(here, "palette.css"), buildColorsCss());
writeFileSync(join(here, "scale.css"), buildTokensCss());

console.log("Generated colors/palette.css and colors/scale.css");
