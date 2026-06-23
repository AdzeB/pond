#!/usr/bin/env node
// Scaffolds a new source: descriptor entry, extractor file, and typed registration.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const id = process.argv[2];
if (!id || !/^[a-z][a-z0-9]*$/.test(id)) {
  console.error("usage: pnpm new-source <id>   (id: lowercase a-z0-9)");
  process.exit(1);
}

const Pascal = id.charAt(0).toUpperCase() + id.slice(1);
const Label = Pascal;
const className = `${Pascal}Extractor`;

const registryPath = join(repoRoot, "packages/schema/src/sources/registry.ts");
const indexPath = join(
  repoRoot,
  "apps/desktop/src/main/core/pipeline/extractors/index.ts",
);
const extractorPath = join(
  repoRoot,
  `apps/desktop/src/main/core/pipeline/extractors/sources/${id}.ts`,
);

let registry = readFileSync(registryPath, "utf8");
if (registry.includes(`id: "${id}"`)) {
  console.error(`source "${id}" already exists in the descriptor registry.`);
  process.exit(1);
}
if (existsSync(extractorPath)) {
  console.error(`extractor file already exists: ${extractorPath}`);
  process.exit(1);
}

// 1. Append the descriptor entry.
const descriptorEntry = `  {
    id: "${id}",
    label: "${Label}",
    hosts: ["${id}.com"],
    urlPatterns: [/^https?:\\/\\/(?:www\\.)?${id}\\.com\\/([A-Za-z0-9_-]+)/i],
    // Optional: only if this source can sync a user's saved list. Omit for
    // capture-only sources. The rate governor fills the rest from safe
    // defaults (DEFAULT_RATE_PROFILE), so you rarely need a custom \`rate\`.
    // sync: { strategy: "scroll" },
  },
`;
const registryAnchor = "] as const satisfies readonly SourceDescriptor[];";
registry = registry.replace(
  registryAnchor,
  `${descriptorEntry}${registryAnchor}`,
);
writeFileSync(registryPath, registry);

// 2. Write the extractor file.
const extractor = `import { descriptorFor } from "@pond/schema/sources";
import { TerminalError } from "../errors";
import { fetchHtmlInWindow } from "../helpers";
import type {
  Capture,
  ExtractInput,
  Extractor,
  MediaCandidate,
} from "../types";
import { firstMatch } from "../url-patterns";

export class ${className} implements Extractor {
  readonly id = "${id}-item";
  readonly source = "${id}" as const;
  readonly validUrl = descriptorFor("${id}").urlPatterns;
  // TODO: the cookie domain (leading dot) whose auth cookies gate scraping.
  readonly cookieDomain = ".${id}.com";

  authCookies(name: string): boolean {
    // TODO: return true for the cookie name(s) that prove a signed-in session.
    void name;
    return false;
  }

  // Optional: parse the account handle from a profile URL's path segments.
  // handleFromPath(segments: string[]): string | null {
  //   return segments[0] ?? null;
  // }

  readonly tests = [
    // TODO: a real item URL + the id your patterns capture from it.
    { url: "https://www.${id}.com/REPLACE_ME", id: "REPLACE_ME" },
  ];

  suitable(url: URL): boolean {
    return this.validUrl.some((rx) => rx.test(url.href));
  }

  async extract(input: ExtractInput): Promise<Capture> {
    const match = firstMatch(input.url, this.validUrl);
    const id = match?.[1] ?? null;
    if (!id) throw new TerminalError("could not parse ${id} id");

    const canonical = input.url.href;
    const result = await fetchHtmlInWindow(canonical, this.source, id);
    const media: MediaCandidate[] = (result.mediaUrls ?? []).map((m) => ({
      url: m.url,
      type: m.type === "video" ? "video" : "image",
      ...(m.poster ? { posterUrl: m.poster } : {}),
    }));

    return {
      id,
      source: this.source,
      url: canonical,
      title: result.title,
      description: result.description,
      media,
    };
  }
}
`;
writeFileSync(extractorPath, extractor);

// 3. Register the extractor in the typed record.
let index = readFileSync(indexPath, "utf8");
const importLine = `import { ${className} } from "./sources/${id}";\n`;
index = index.replace(
  'import type { Extractor } from "./types";',
  `${importLine}import type { Extractor } from "./types";`,
);
const recordAnchor = "} as const satisfies Record<ExternalSource, Extractor>;";
index = index.replace(
  recordAnchor,
  `  ${id}: new ${className}(),\n${recordAnchor}`,
);
writeFileSync(indexPath, index);

console.log(`\nScaffolded source "${id}":`);
console.log(`  - descriptor   packages/schema/src/sources/registry.ts`);
console.log(
  `  - extractor    apps/desktop/src/main/core/pipeline/extractors/sources/${id}.ts`,
);
console.log(
  `  - registered   apps/desktop/src/main/core/pipeline/extractors/index.ts`,
);
console.log(`\nNext (the compiler will point at the rest):`);
console.log(`  1. Fill in the real urlPatterns + hosts in the descriptor.`);
console.log(`  2. Implement extract(), authCookies(), and the test block.`);
console.log(`  3. Add a brand icon in @pond/icons and a SOURCE_ICONS entry`);
console.log(
  `     (apps/desktop/src/renderer/src/features/sources/registry.ts).`,
);
console.log(`  4. Optional: a list harvester in core/refresh/harvest/${id}/`);
console.log(`     and extension entrypoints in apps/extension/sources/.`);
console.log(
  `     If you add list sync, set \`sync: { strategy }\` on the descriptor`,
);
console.log(
  `     (cursor | scroll | full). Pacing defaults are account-safe already.`,
);
console.log(
  `  5. Run \`pnpm test\` and \`pnpm generate\`, then fix every type error.\n`,
);
