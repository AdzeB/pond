#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
/**
 * One-time generator: extract Nucleo icon SVG children into committed TSX modules.
 * Requires nucleo-ui-* packages to be installed. Run before removing them.
 */
import { renderToStaticMarkup } from "react-dom/server";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const repoRoot = join(root, "../..");

const glyphAliases = JSON.parse(
  readFileSync(join(root, "config/glyph-aliases.json"), "utf8"),
);
const importRewrites = JSON.parse(
  readFileSync(join(root, "config/import-rewrites.json"), "utf8"),
);

const PACKAGES = {
  "outline/18": "nucleo-ui-outline-18",
  "fill/18": "nucleo-ui-fill-18",
  "outline/12": "nucleo-ui-outline-12",
  "fill/12": "nucleo-ui-fill-12",
};

function baseName(exportName) {
  return exportName.replace(/(Outline|Fill|Duo)?(12|18)$/, "");
}

function resolveGlyph(exportName) {
  const base = baseName(exportName);
  return glyphAliases[base] ?? base;
}

function nucleoExportName(exportName) {
  const glyph = resolveGlyph(exportName);
  const style = exportName.includes("Outline")
    ? "Outline"
    : exportName.includes("Fill")
      ? "Fill"
      : "Outline";
  const size = exportName.endsWith("12") ? "12" : "18";
  const short = glyph.replace(/^Icon/, "");
  return `Icon${short}${style}${size}`;
}

function scanImports() {
  const pat =
    /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*"@pond\/icons\/(fill\/12|fill\/18|outline\/12|outline\/18)"/gs;
  const needed = new Map();
  const files = [];
  for (const dir of ["apps", "packages"]) {
    const base = join(repoRoot, dir);
    walk(base, files);
  }
  for (const file of files) {
    if (file.includes("/packages/icons/")) continue;
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(pat)) {
      const family = m[2];
      for (const item of m[1].split(",")) {
        let name = item.trim().split(" as ")[0].trim();
        if (!name.startsWith("Icon")) continue;
        name = importRewrites[name] ?? name;
        needed.set(`${family}:${name}`, { family, exportName: name });
      }
    }
  }
  return [...needed.values()];
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

function extractInnerMarkup(Component) {
  const html = renderToStaticMarkup(h(Component, {}));
  const match = html.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!match) throw new Error("No svg wrapper in markup");
  return match[1].trim();
}

function jsxFromInner(inner) {
  return inner
    .replace(/stroke-width=/g, "strokeWidth=")
    .replace(/stroke-linecap=/g, "strokeLinecap=")
    .replace(/stroke-linejoin=/g, "strokeLinejoin=")
    .replace(/fill-rule=/g, "fillRule=")
    .replace(/clip-rule=/g, "clipRule=")
    .replace(/fill-opacity=/g, "fillOpacity=")
    .replace(/stroke-width=\{strokeWidth\}/g, "strokeWidth={strokeWidth}")
    .replace(/class=/g, "className=");
}

async function loadComponent(pkg, exportName) {
  const mod = await import(pkg);
  const Comp = mod[exportName];
  if (!Comp) throw new Error(`Missing ${exportName} in ${pkg}`);
  return Comp;
}

async function main() {
  const icons = scanImports();
  const primaryGlyphs = new Set();
  const generated = new Map();

  for (const { family, exportName } of icons) {
    const pkg = PACKAGES[family];
    const nucleoName = nucleoExportName(exportName);
    const primary = resolveGlyph(exportName);
    primaryGlyphs.add(primary);

    const key = `${family}:${exportName}`;
    if (generated.has(key)) continue;

    const Comp = await loadComponent(pkg, nucleoName);
    const inner = extractInnerMarkup(Comp);
    const jsx = jsxFromInner(inner);
    const strokeWidth = exportName.includes("Outline") ? 1.5 : undefined;

    const body = strokeWidth
      ? `<>${jsx.replace(/strokeWidth="[^"]*"/g, "strokeWidth={strokeWidth}")}</>`
      : `<>${jsx}</>`;

    const modulePath = join(root, "generated", family, `${exportName}.tsx`);
    mkdirSync(dirname(modulePath), { recursive: true });

    const iconSize = exportName.endsWith("12") ? 12 : 18;
    const defaultArgs = strokeWidth
      ? `, { strokeWidth: 1.5, size: ${iconSize} }`
      : `, { size: ${iconSize} }`;
    const content = `// Generated from Nucleo — do not edit by hand.
import { createIcon } from "../../../lib/create-icon";

const inner = ({ strokeWidth = 1.5 }) => (${body});

export const ${exportName} = createIcon(inner${defaultArgs});
`;
    writeFileSync(modulePath, content);
    generated.set(key, modulePath);
  }

  for (const family of Object.keys(PACKAGES)) {
    const familyIcons = icons.filter((i) => i.family === family);
    const exports = [...new Set(familyIcons.map((i) => i.exportName))].sort();
    const indexPath = join(
      root,
      family.split("/")[0],
      family.split("/")[1],
      "index.ts",
    );
    const lines = exports.map(
      (name) => `export { ${name} } from "../../generated/${family}/${name}";`,
    );
    writeFileSync(indexPath, `${lines.join("\n")}\n`);
  }

  const allowlist = [...primaryGlyphs].sort();
  writeFileSync(
    join(root, "allowlist.json"),
    `${JSON.stringify(allowlist, null, 2)}\n`,
  );
  console.log(
    `Generated ${generated.size} icons, ${allowlist.length} primary glyphs`,
  );
  if (allowlist.length !== 100) {
    console.error(`Expected 100 primary glyphs, got ${allowlist.length}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
