import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const repo = resolve(root, "../../../..");
const files = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.name.endsWith(".css") || /^index\.tsx?$/.test(entry.name)) {
      files.push({
        path: relative(repo, path),
        content: await readFile(path, "utf8"),
      });
    }
  }
}
await collect(resolve(repo, "packages/ui/src"));
await collect(resolve(repo, "packages/theme/src"));
files.push({
  path: "apps/desktop/src/renderer/src/styles.css",
  content: await readFile(
    resolve(repo, "apps/desktop/src/renderer/src/styles.css"),
    "utf8",
  ),
});
for (const path of [
  "packages/schema/src/prefs.types.ts",
  "packages/schema/src/color.ts",
  "apps/desktop/src/renderer/src/effects/theme-applier.tsx",
]) {
  files.push({ path, content: await readFile(resolve(repo, path), "utf8") });
}
await mkdir(resolve(root, "public/evidence"), { recursive: true });
await writeFile(
  resolve(root, "public/evidence/pond-sources.json"),
  `${JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      source:
        "Current local working tree; includes user-requested component style updates",
      files,
    },
    null,
    2,
  )}\n`,
);
console.log(`Extracted ${files.length} Pond source files.`);
