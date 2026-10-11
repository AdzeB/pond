import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const localizationDir = join(root, "src/shared/localization");
const catalogDir = join(localizationDir, "catalogs");
const locales = ["en", "es", "de", "ru", "zh-TW", "zh-CN", "ja", "ko"];

const CatalogSchema = z.record(z.string(), z.string().catch(""));
const StringListSchema = z.array(z.string());
const readJson = async (path, schema) =>
  schema.parse(JSON.parse(await readFile(path, "utf8")));
const english = await readJson(join(catalogDir, "en.json"), CatalogSchema);
const required = await readJson(
  join(localizationDir, "required-foundation.json"),
  StringListSchema,
);
const localizedSurfaces = await readJson(
  join(localizationDir, "localized-surfaces.json"),
  StringListSchema,
);
const englishKeys = new Set(Object.keys(english));
const englishMessages = new Set(Object.values(english));
const requiredKeys = new Set(required);
const errors = [];

if (requiredKeys.size !== required.length) {
  errors.push("required-foundation.json contains duplicate keys");
}

for (const key of requiredKeys) {
  if (!englishKeys.has(key)) {
    errors.push(`required foundation key missing from English: ${key}`);
  }
}

for (const locale of locales) {
  const catalog = await readJson(
    join(catalogDir, `${locale}.json`),
    CatalogSchema,
  );
  for (const key of Object.keys(catalog)) {
    if (!englishKeys.has(key)) {
      errors.push(`${locale} contains unknown key: ${key}`);
    }
    if (catalog[key].trim().length === 0) {
      errors.push(`${locale} contains an empty translation: ${key}`);
    }
  }
  for (const key of englishKeys) {
    if (!catalog[key]) {
      if (locale === "en" || requiredKeys.has(key)) {
        errors.push(`${locale} is missing required catalog key: ${key}`);
      }
      continue;
    }
    const sourcePlaceholders = placeholders(english[key]);
    const translatedPlaceholders = placeholders(catalog[key]);
    if (sourcePlaceholders !== translatedPlaceholders) {
      errors.push(
        `${locale} has different placeholders for ${key}: expected ${sourcePlaceholders || "none"}, found ${translatedPlaceholders || "none"}`,
      );
    }
  }
}

const sourceFiles = await collectSourceFiles(join(root, "src"));
const usedKeys = new Set();
const patterns = [
  /\btranslate\(\s*["']([^"']+)["']/g,
  /<LocalizedText\b[^>]*\bmessage=["']([^"']+)["']/g,
  /\btitle:\s*["']((?:feedback|lock|main|settings)\.[^"']+)["']/g,
];

for (const path of sourceFiles) {
  const source = await readFile(path, "utf8");
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      usedKeys.add(match[1]);
    }
  }
}

for (const key of usedKeys) {
  if (!englishKeys.has(key)) {
    errors.push(`source uses key missing from English: ${key}`);
  }
}

const surfaceCopies = new Set();
for (const relativePath of localizedSurfaces) {
  const paths = await collectPath(join(root, relativePath));
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    for (const copy of extractCopy(source)) {
      surfaceCopies.add(copy);
      if (!englishMessages.has(copy)) {
        errors.push(
          `${path.slice(root.length + 1)} contains unregistered copy: ${copy}`,
        );
      }
    }
  }
}

for (const [key, message] of Object.entries(english)) {
  if (key.startsWith("copy.") && !surfaceCopies.has(message)) {
    errors.push(
      `English contains unused copy ${key}: ${message}. Run pnpm generate:localization.`,
    );
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(
    `Localization check passed: ${usedKeys.size} used, ${requiredKeys.size} required, ${englishKeys.size} English keys`,
  );
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)));
    } else if (
      [".html", ".ts", ".tsx"].includes(extname(entry.name)) &&
      !entry.name.includes(".test.")
    ) {
      files.push(path);
    }
  }
  return files;
}

async function collectPath(path) {
  const entry = await stat(path);
  return entry.isDirectory() ? collectSourceFiles(path) : [path];
}

function extractCopy(source) {
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

function placeholders(message) {
  return [...message.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)]
    .map((match) => match[1])
    .sort()
    .join(",");
}
