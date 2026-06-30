import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildColorsCss, buildOverridesCss, buildTokensCss } from "./ramps.ts";

const here = dirname(fileURLToPath(import.meta.url));

writeFileSync(join(here, "palette.css"), buildColorsCss());
writeFileSync(join(here, "scale.css"), buildTokensCss());
writeFileSync(join(here, "overrides.css"), buildOverridesCss());

console.log(
  "Generated colors/palette.css, colors/scale.css and colors/overrides.css",
);
