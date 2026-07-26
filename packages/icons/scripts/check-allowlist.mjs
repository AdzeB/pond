#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "../..");
const allowlist = new Set(
  JSON.parse(readFileSync(join(root, "allowlist.json"), "utf8")),
);
const importRewrites = JSON.parse(
  readFileSync(join(root, "config/import-rewrites.json"), "utf8"),
);
const aliases = JSON.parse(
  readFileSync(join(root, "config/glyph-aliases.json"), "utf8"),
);

const pat =
  /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*"@pond\/icons\/(fill\/12|fill\/18|outline\/12|outline\/18)"/gs;

function baseName(exportName) {
  return exportName.replace(/(Outline|Fill|Duo)?(12|18)$/, "");
}

function resolveGlyph(exportName) {
  const rewritten = importRewrites[exportName] ?? exportName;
  const base = baseName(rewritten);
  return aliases[base] ?? base;
}

function walk(dir, out) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (
      ent.name === "node_modules" ||
      ent.name === "out" ||
      ent.name === "dist"
    )
      continue;
    if (ent.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(ent.name)) out.push(p);
  }
}

const files = [];
for (const dir of ["apps", "packages"]) walk(join(repoRoot, dir), files);

const used = new Set();
for (const file of files) {
  if (file.includes("/packages/icons/")) continue;
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(pat)) {
    for (const item of m[1].split(",")) {
      const name = item.trim().split(" as ")[0].trim();
      if (name.startsWith("Icon")) used.add(resolveGlyph(name));
    }
  }
}

const unresolved = [...used].filter((g) => !allowlist.has(g));
if (unresolved.length) {
  console.error("Glyphs used in app but missing from allowlist:", unresolved);
  process.exit(1);
}

if (allowlist.size !== 100) {
  console.error(
    `allowlist.json must contain exactly 100 glyphs, got ${allowlist.size}`,
  );
  process.exit(1);
}

console.log(
  `allowlist ok (${allowlist.size} glyphs, ${used.size} used in app)`,
);
