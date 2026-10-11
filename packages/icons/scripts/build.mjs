/** Generates index.ts and manifest.ts from the SVG sources in svg/. */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  emit,
  exportName,
  fileName,
  packageRoot,
  repoRoot,
  STYLES,
} from "./lib.mjs";

const check = process.argv.includes("--check");
const command = "pnpm --filter @pond/icons generate";

const ROOT = /^<svg\b[^>]*\bviewBox="0 0 18 18"[^>]*>([\s\S]*)<\/svg>\s*$/;
const ELEMENT = /<(path|circle|rect)\s([^>]*?)\/>/g;
const ATTRIBUTE = /([\w-]+)="([^"]*)"/g;

const camel = (name) => name.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const pascal = (file) =>
  file
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");

function parse(path) {
  const svg = readFileSync(path, "utf8");
  const body = ROOT.exec(svg)?.[1];
  if (body === undefined) throw new Error(`${path}: expected an 18×18 <svg>.`);
  const nodes = [...body.matchAll(ELEMENT)].map(([, tag, attrs]) => [
    tag,
    Object.fromEntries(
      [...attrs.matchAll(ATTRIBUTE)].map(([, k, v]) => [camel(k), v]),
    ),
  ]);
  const rest = body.replace(ELEMENT, "").trim();
  if (rest) throw new Error(`${path}: unsupported markup ${rest.slice(0, 40)}`);
  return nodes;
}

function glyphs() {
  const found = new Map();
  for (const style of STYLES) {
    const dir = resolve(packageRoot, "svg", style);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).sort()) {
      if (!file.endsWith(".svg")) continue;
      const glyph = pascal(file.slice(0, -4));
      if (fileName(glyph) !== file.slice(0, -4)) {
        throw new Error(
          `svg/${style}/${file}: rename to ${fileName(glyph)}.svg`,
        );
      }
      if (!found.has(glyph)) found.set(glyph, new Map());
      found.get(glyph).set(style, parse(resolve(dir, file)));
    }
  }
  return new Map([...found].sort(([a], [b]) => (a < b ? -1 : 1)));
}

const IMPORT = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*"@pond\/icons"/g;

function imported() {
  const files = execFileSync(
    "git",
    ["ls-files", "-co", "--exclude-standard", "apps", "packages"],
    { cwd: repoRoot, encoding: "utf8" },
  )
    .split("\n")
    .filter(
      (file) =>
        /\.(ts|tsx|mts)$/.test(file) &&
        !file.startsWith("packages/icons/") &&
        existsSync(resolve(repoRoot, file)),
    );
  const names = new Set();
  for (const file of files) {
    const text = readFileSync(resolve(repoRoot, file), "utf8");
    for (const [, specifiers] of text.matchAll(IMPORT)) {
      for (const specifier of specifiers.split(",")) {
        const name = specifier
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)[0];
        if (name) names.add(name);
      }
    }
  }
  return names;
}

const all = glyphs();
const exports = [];
const manifest = [];
for (const [glyph, styles] of all) {
  const present = STYLES.filter((style) => styles.has(style));
  manifest.push(`${glyph}: ${JSON.stringify(present)},`);
  for (const style of present) {
    exports.push(
      `export const ${exportName(glyph, style)} = /* @__PURE__ */ createIcon(${JSON.stringify(glyph)}, ${JSON.stringify(style)}, ${JSON.stringify(styles.get(style))});`,
    );
  }
}

emit(
  [
    [
      resolve(packageRoot, "index.ts"),
      `import { createIcon } from "./create-icon";\n\n${exports.join("\n")}\n`,
    ],
    [
      resolve(packageRoot, "manifest.ts"),
      `import type { IconManifest } from "./types";\n\n/** Every glyph in svg/. Regenerate with \`${command}\`. */\nexport const manifest: IconManifest = {${manifest.join("\n")}};\n`,
    ],
  ],
  { check, command },
);

const used = imported();
const unused = [...all].flatMap(([glyph, styles]) =>
  [...styles.keys()]
    .map((style) => exportName(glyph, style))
    .filter((name) => !used.has(name)),
);
console.log(
  `${check ? "Verified" : "Wrote"} index.ts (${exports.length} icons, ${all.size} glyphs)`,
);
if (unused.length > 0) {
  console.log(`Not imported outside @pond/icons: ${unused.join(", ")}`);
}
