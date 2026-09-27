import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = join(root, "src/shared/localization/catalogs");
const locales = ["en", "es", "de", "ru", "zh-TW", "zh-CN", "ja", "ko"];
const sourcePaths = JSON.parse(
  await readFile(
    join(root, "src/shared/localization/localized-surfaces.json"),
    "utf8",
  ),
);

const catalogs = new Map();
for (const locale of locales) {
  const path = join(catalogDir, `${locale}.json`);
  catalogs.set(locale, JSON.parse(await readFile(path, "utf8")));
}
const english = catalogs.get("en");
const existing = new Map(
  Object.entries(english).map(([key, message]) => [message, key]),
);
const sourceFiles = (
  await Promise.all(sourcePaths.map((path) => collect(join(root, path))))
).flat();
const copies = new Set();
for (const path of sourceFiles) {
  const source = await readFile(path, "utf8");
  for (const copy of extractCopy(source)) copies.add(copy);
}

for (const copy of [...copies].sort()) {
  let key = existing.get(copy);
  if (!key) {
    const hash = createHash("sha256").update(copy).digest("hex").slice(0, 12);
    key = `copy.${hash}`;
    existing.set(copy, key);
    english[key] = copy;
  }
  for (const locale of locales) {
    const catalog = catalogs.get(locale);
    if (!catalog[key]) catalog[key] = copy;
  }
}

for (const locale of locales) {
  const path = join(catalogDir, `${locale}.json`);
  const catalog = catalogs.get(locale);
  const sorted = Object.fromEntries(
    Object.entries(catalog)
      .filter(([key, message]) => locale === "en" || message !== english[key])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  await writeFile(path, `${JSON.stringify(sorted, null, 2)}\n`);
}

console.log(
  `Registered ${copies.size} copy strings from ${sourceFiles.length} files`,
);

export function extractCopy(source) {
  const copies = new Set();
  const patterns = [
    /\b(?:aria-label|confirmLabel|description|label|placeholder|title):\s*["'`]([^"'`\n]+)["'`]/g,
    /(?:Error|Notification)\(\s*["'`]([^"'`\n]+)["'`]/g,
    />\s*([A-Z][^<{>\n]*[A-Za-z.!?…])\s*</g,
    /["'`]([A-Z][A-Za-z0-9 '&+(),./:!?%–-]{1,100})["'`]/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const copy = match[1]?.trim();
      if (copy && isCopy(copy)) copies.add(copy);
    }
  }
  return copies;
}

function isCopy(copy) {
  if (/^(?:GET|POST|PUT|DELETE|PATCH)$/.test(copy)) return false;
  if (/^[A-Z][A-Z0-9_]+$/.test(copy)) return false;
  if (/^[A-Za-z]+\/[A-Za-z]/.test(copy)) return false;
  if (copy.includes("://")) return false;
  return /[A-Za-z]{2}/.test(copy);
}

async function collect(path) {
  const entryStat = await stat(path);
  if (entryStat.isFile()) return [path];
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(child)));
    else if (
      [".html", ".ts", ".tsx"].includes(extname(entry.name)) &&
      !entry.name.includes(".test.")
    )
      files.push(child);
  }
  return files.sort((left, right) =>
    relative(root, left).localeCompare(relative(root, right)),
  );
}
