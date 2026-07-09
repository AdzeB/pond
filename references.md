# References

A complete catalog of every dependency, tool, runtime, model, external service,
and asset used to build **Pond** — a local-first archive for everything you save
across Twitter/X, Instagram, Pinterest, Are.na, Cosmos, TikTok, YouTube, and the
open web.

This file is grouped by **where** each reference is used (monorepo tooling, then
each workspace), continues with the **external** binaries, models, services, and
platforms the app depends on at runtime, and closes with the **design
inspiration** that shaped the product. Versions reflect the ranges declared in
each `package.json` at the time of writing.

---

## Repository

- **Name:** `pond` (private monorepo)
- **License:** MIT
- **Author:** Raphael Salaja
- **Repository:** <https://github.com/raphaelsalaja/pond>
- **Package manager:** [pnpm](https://pnpm.io/) `11.3.0` (workspaces + `catalog:` protocol for shared versions)
- **Task runner:** [Turborepo](https://turborepo.com/) `^2.10.0`
- **Node.js:** `22` (`.nvmrc`); engines require `>=20.12`

### Workspace layout (`pnpm-workspace.yaml`)

```
apps/*       desktop (Electron), extension (browser), website (Next.js)
packages/*   schema, ui, icons, theme
```

Shared versions live in the pnpm `catalog:`: `react` / `react-dom` `^19.2.5`,
`typescript` `^6.0.3`, `@types/node` `^26.0.1`, `@types/react` `^19.2.14`,
`@types/react-dom` `^19.0.2`.

---

## Monorepo tooling (root `devDependencies`)

| Package | Version | Purpose |
|---|---|---|
| [`@biomejs/biome`](https://biomejs.dev/) | `2.5.1` | Linting + formatting (`biome.json`) |
| [`@commitlint/cli`](https://commitlint.js.org/) | `^21.1.0` | Conventional commit enforcement |
| [`@commitlint/config-conventional`](https://commitlint.js.org/) | `^21.1.0` | Conventional commit ruleset |
| [`@types/node`](https://www.npmjs.com/package/@types/node) | `catalog:` | Node.js type definitions |
| [`husky`](https://typicode.github.io/husky/) | `^9.1.7` | Git hooks (`prepare`) |
| [`knip`](https://knip.dev/) | `^6.24.0` | Unused file/dependency/export detection |
| [`turbo`](https://turborepo.com/) | `^2.10.0` | Monorepo build orchestration |
| [`typescript`](https://www.typescriptlang.org/) | `catalog:` | Type system / compiler |

Shared config files: `tsconfig.base.json`, `biome.json`, `commitlint.config.js`,
`turbo.json`, `knip.json`, `.nvmrc`.

---

## `apps/desktop` — Electron app

Local-first archive that runs in the background, owns a SQLite index + filesystem
library, and accepts saves from the browser extension over `http://127.0.0.1:41610`.

### Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| [`@ai-sdk/anthropic`](https://ai-sdk.dev/) | `^4.0.1` | Anthropic provider for the AI SDK |
| [`@ai-sdk/google`](https://ai-sdk.dev/) | `^4.0.2` | Google provider for the AI SDK |
| [`@ai-sdk/openai`](https://ai-sdk.dev/) | `^4.0.2` | OpenAI provider for the AI SDK |
| [`@ai-sdk/openai-compatible`](https://ai-sdk.dev/) | `^3.0.1` | OpenAI-compatible endpoints (Ollama, etc.) |
| [`@blossom-carousel/react`](https://www.blossom-carousel.com/) | `^1.3.0` | Media carousel |
| [`@hono/node-server`](https://hono.dev/) | `^2.0.2` | Node adapter for the local HTTP ingest server |
| [`@huggingface/transformers`](https://huggingface.co/docs/transformers.js) | `^4.2.0` | On-device ML (Transformers.js / ONNX) |
| [`@leeoniya/ufuzzy`](https://github.com/leeoniya/uFuzzy) | `^1.0.19` | Fuzzy matching for search |
| [`@lexical/react`](https://lexical.dev/) | `^0.45.0` | React bindings for the Lexical editor |
| [`@lexical/text`](https://lexical.dev/) | `^0.45.0` | Lexical text utilities |
| [`@orama/orama`](https://orama.com/) | `^3.1.18` | In-memory full-text search index |
| [`@tanstack/pacer`](https://tanstack.com/pacer) | `^0.21.1` | Rate-limiting / debounce core |
| [`@tanstack/react-query`](https://tanstack.com/query) | `^5.100.14` | Async state / data fetching |
| [`@tanstack/react-router`](https://tanstack.com/router) | `^1.170.8` | Type-safe routing |
| [`@tanstack/react-store`](https://tanstack.com/store) | `^0.11.0` | React bindings for the store |
| [`@tanstack/store`](https://tanstack.com/store) | `^0.11.0` | Core reactive store |
| [`@visx/curve`](https://airbnb.io/visx/) | `^4.0.0` | Chart curve interpolators (analytics) |
| [`@visx/shape`](https://airbnb.io/visx/) | `^4.0.0` | Chart shape primitives (analytics) |
| [`ai`](https://ai-sdk.dev/) | `^7.0.4` | Vercel AI SDK core (LLM orchestration) |
| [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) | `^12.11.1` | Synchronous SQLite (native) |
| [`border-beam`](https://www.npmjs.com/package/border-beam) | `^1.2.0` | Animated border effect |
| [`chrono-node`](https://github.com/wanasit/chrono) | `^2.9.1` | Natural-language date parsing (search) |
| [`date-fns`](https://date-fns.org/) | `^4.4.0` | Date utilities |
| [`drizzle-orm`](https://orm.drizzle.team/) | `^0.45.2` | SQLite ORM |
| [`electron-log`](https://github.com/megahertz/electron-log) | `^5.4.3` | Logging |
| [`electron-updater`](https://www.electron.build/auto-update) | `^6.8.3` | Auto-update |
| [`ffmpeg-static`](https://github.com/eugeneware/ffmpeg-static) | `^5.2.0` | Bundled static ffmpeg binary |
| [`fuse.js`](https://www.fusejs.io/) | `^7.4.2` | Fuzzy search |
| [`gpt-tokenizer`](https://github.com/niieani/gpt-tokenizer) | `^3.4.0` | Token counting for prompt budgets |
| [`hnswlib-wasm`](https://github.com/ShravanSunder/hnswlib-wasm) | `^0.8.2` | Approximate-nearest-neighbour vector index |
| [`hono`](https://hono.dev/) | `^4.12.18` | HTTP server framework (ingest) |
| [`jsonrepair`](https://github.com/josdejong/jsonrepair) | `^3.14.1` | Repair malformed LLM JSON output |
| [`lexical`](https://lexical.dev/) | `^0.45.0` | Rich-text editor core |
| [`metascraper`](https://metascraper.js.org/) | `^5.50.6` | Article metadata extraction |
| `metascraper-author` | `^5.50.6` | Author rule |
| `metascraper-date` | `^5.50.6` | Date rule |
| `metascraper-description` | `^5.50.6` | Description rule |
| `metascraper-image` | `^5.50.6` | Image rule |
| `metascraper-logo-favicon` | `^5.50.6` | Logo/favicon rule |
| `metascraper-publisher` | `^5.50.6` | Publisher rule |
| `metascraper-title` | `^5.50.6` | Title rule |
| `metascraper-url` | `^5.50.6` | URL rule |
| [`mime-types`](https://github.com/jshttp/mime-types) | `^3.0.2` | MIME lookups |
| [`motion`](https://motion.dev/) | `^12.39.0` | Animations |
| [`p-limit`](https://github.com/sindresorhus/p-limit) | `^7.3.0` | Concurrency limiting |
| [`pretty-bytes`](https://github.com/sindresorhus/pretty-bytes) | `^7.1.0` | Human-readable sizes |
| [`pretty-ms`](https://github.com/sindresorhus/pretty-ms) | `^9.3.0` | Human-readable durations |
| [`rooks`](https://rooks.vercel.app/) | `^9.8.0` | React hooks collection |
| [`sharp`](https://sharp.pixelplumbing.com/) | `^0.34.5` | Image processing (native) |
| [`ulid`](https://github.com/ulid/javascript) | `^3.0.2` | Sortable unique IDs |
| [`which`](https://github.com/npm/node-which) | `^7.0.0` | Locate executables on PATH |
| [`zod`](https://zod.dev/) | `^4.4.3` | Runtime validation |

Plus the workspace packages `@pond/icons`, `@pond/schema`, `@pond/theme`, `@pond/ui`.

### Optional dependency

| Package | Version | Purpose |
|---|---|---|
| [`node-llama-cpp`](https://node-llama-cpp.withcat.ai/) | `^3.0.0` | Bundled on-device LLM provider (llama.cpp) |

### Dev dependencies

| Package | Version | Purpose |
|---|---|---|
| [`@electron/rebuild`](https://github.com/electron/rebuild) | `^4.0.4` | Rebuild native modules for Electron ABI |
| [`@tanstack/router-plugin`](https://tanstack.com/router) | `^1.168.11` | Route tree codegen |
| `@types/better-sqlite3` | `^7.6.12` | Types |
| `@types/mime-types` | `^3.0.1` | Types |
| `@types/node` / `@types/react` / `@types/react-dom` | `catalog:` | Types |
| `@types/which` | `^3.0.4` | Types |
| [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react) | `^6.0.1` | React fast refresh for Vite |
| [`drizzle-kit`](https://orm.drizzle.team/kit-docs/overview) | `^0.31.10` | Drizzle migrations |
| [`electron`](https://www.electronjs.org/) | `^42.4.0` | Desktop runtime |
| [`electron-builder`](https://www.electron.build/) | `^26.8.1` | Packaging / distribution |
| [`electron-vite`](https://electron-vite.org/) | `^5.0.0` | Electron + Vite dev/build |
| [`react`](https://react.dev/) / [`react-dom`](https://react.dev/) | `catalog:` | UI library / renderer |
| [`typescript`](https://www.typescriptlang.org/) | `catalog:` | Compiler |
| [`vite`](https://vite.dev/) | `^8.0.11` | Bundler / dev server |
| [`vitest`](https://vitest.dev/) | `^4.1.8` | Test runner |

### Transitive native modules of note (`pnpm-workspace.yaml` build flags)

- `better-sqlite3`, `node-llama-cpp`, `re2` — pnpm builds disabled; the first two
  are rebuilt for the Electron ABI (or resolve prebuilds), `re2` falls back to
  `RegExp`.
- `onnxruntime-node` — ONNX inference backend for Transformers.js.
- `sharp`, `protobufjs`, `esbuild`, `electron-winstaller`, `spawn-sync` — allowed builds.

---

## `apps/extension` — Browser extension (WXT)

Captures saves from supported platforms into the local Pond library.

### Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| `@pond/schema` | `workspace:*` | Shared types/schema |
| `@pond/theme` | `workspace:*` | Design tokens |
| `@pond/ui` | `workspace:*` | UI primitives |
| [`@webext-core/messaging`](https://webext-core.aklinker1.io/) | `^3.0.2` | Type-safe extension messaging |
| [`react`](https://react.dev/) / [`react-dom`](https://react.dev/) | `catalog:` | UI library / renderer |

### Dev dependencies

| Package | Version | Purpose |
|---|---|---|
| `@types/chrome` | `^0.1.40` | Chrome extension types |
| `@types/node` / `@types/react` / `@types/react-dom` | `catalog:` | Types |
| [`@wxt-dev/module-react`](https://wxt.dev/) | `^1.1.6` | React module for WXT |
| [`typescript`](https://www.typescriptlang.org/) | `catalog:` | Compiler |
| [`wxt`](https://wxt.dev/) | `^0.20.25` | Browser extension framework |

Manifest host permissions cover: `x.com`, `twitter.com`, `instagram.com`,
`pinterest.com`, `are.na`, `cosmos.so`, `tiktok.com`, `youtube.com`, plus
`127.0.0.1` / `localhost` for the local ingest endpoint.

---

## `apps/website` — Promotional site (Next.js)

A single, static page that reuses `@pond/ui` tokens.

| Package | Version | Purpose |
|---|---|---|
| `@pond/icons` / `@pond/theme` / `@pond/ui` | `workspace:*` | Icons / tokens / primitives |
| [`next`](https://nextjs.org/) | `^16.0.0` | React framework |
| [`react`](https://react.dev/) / [`react-dom`](https://react.dev/) | `catalog:` | UI library / renderer |
| `@types/*` / `typescript` (dev) | `catalog:` | Types / compiler |

---

## `packages/schema` — Shared schema

Drizzle + Zod types shared between the desktop app and the extension.

| Package | Version | Purpose |
|---|---|---|
| [`@react-querybuilder/core`](https://react-querybuilder.js.org/) | `^8.18.0` | Query-builder model for saved-view filters |
| [`drizzle-orm`](https://orm.drizzle.team/) | `^0.45.2` | ORM types |
| [`zod`](https://zod.dev/) | `^4.4.3` | Runtime validation |
| `@types/node` / `typescript` (dev) | `catalog:` | Types / compiler |

---

## `packages/ui` — Headless React primitives

Thin Base UI wrappers styled with CSS Modules; app-agnostic.

| Package | Version | Purpose |
|---|---|---|
| [`@base-ui/react`](https://base-ui.com/) | `^1.5.0` | Headless primitives |
| `@pond/icons` | `workspace:*` | Icons |
| [`@tanstack/react-router`](https://tanstack.com/router) | `^1.170.8` | Link/router types |
| [`@tanstack/react-store`](https://tanstack.com/store) / [`@tanstack/store`](https://tanstack.com/store) | `^0.11.0` | Reactive store |
| [`@tanstack/react-table`](https://tanstack.com/table) | `^8.21.3` | Headless table |
| [`@tanstack/react-virtual`](https://tanstack.com/virtual) | `^3.14.5` | List virtualization |
| [`clsx`](https://github.com/lukeed/clsx) | `^2.1.1` | Conditional classnames |
| [`motion`](https://motion.dev/) | `^12.39.0` | Animations |
| [`react-aria`](https://react-spectrum.adobe.com/react-aria/) | `^3.50.0` | Accessibility primitives |
| [`react-stately`](https://react-spectrum.adobe.com/react-stately/) | `^3.48.0` | State hooks for react-aria |
| `react` / `react-dom` (peer) | `>=19` | UI runtime |
| `@types/react` / `@types/react-dom` / `typescript` (dev) | `catalog:` | Types / compiler |

---

## `packages/icons` — Icon barrel

Re-exports the Nucleo React packages by family plus local brand marks.

| Package | Version | Purpose |
|---|---|---|
| [`nucleo-social-media`](https://nucleoapp.com/) | `^1.0.2` | Social/brand icon family |
| `nucleo-ui-fill-12` / `nucleo-ui-fill-18` | `^1.4.0` | Fill families |
| `nucleo-ui-fill-duo-18` | `^1.4.0` | Duotone family |
| `nucleo-ui-outline-12` / `nucleo-ui-outline-18` | `^1.4.0` | Outline families |

## `packages/theme` — Design tokens

The runtime `--ds-*` theming engine (colors, motion, radius, shadow, typography,
brand) as plain CSS custom properties. Zero dependencies.

---

## External binaries (spawned at runtime / bundled)

| Tool | How it's used | Source |
|---|---|---|
| [**yt-dlp**](https://github.com/yt-dlp/yt-dlp) | Video downloads (TikTok / IG Reels / YouTube). Fetched at runtime into `userData`, **not** bundled. | yt-dlp releases |
| [**ffmpeg**](https://ffmpeg.org/) | Muxes adaptive streams for downloads. Bundled via `ffmpeg-static` and flattened to `bin/ffmpeg` in packaged builds. | `ffmpeg-static` |
| [**Electron BrowserWindow**](https://www.electronjs.org/docs/latest/api/browser-window) | Headless "scrape window" pool used by the refresh/harvest pipeline. | Electron |
| **SQLite** (via `better-sqlite3`) | Local index database. | better-sqlite3 |

---

## On-device AI models

Inference runs locally via Transformers.js (`@huggingface/transformers`, ONNX
backend). Model catalogs are defined in
`apps/desktop/src/renderer/src/lib/enrichment/model-catalogs.ts`; the cloud/LLM
catalog is generated into `packages/schema/src/ai-catalog.generated.ts`.

### Text embeddings (semantic search) — default `Xenova/all-MiniLM-L6-v2`

- Sentence Transformers: `all-MiniLM-L6-v2`, `all-MiniLM-L12-v2`,
  `all-mpnet-base-v2`, `paraphrase-multilingual-MiniLM-L12-v2`
- BAAI · BGE: `bge-small-en-v1.5`, `bge-base-en-v1.5`
- Alibaba · GTE: `gte-small`, `gte-base`
- intfloat · E5: `multilingual-e5-small`, `multilingual-e5-base`

### Caption / OCR — default `onnx-community/Florence-2-base-ft`

- Microsoft · Florence-2: `Florence-2-base-ft`, `Florence-2-base`,
  `Florence-2-large-ft`, `Florence-2-large`

### Visual similarity (CLIP) — default `Xenova/clip-vit-base-patch32`

- OpenAI · CLIP: `clip-vit-base-patch32`, `clip-vit-base-patch16`,
  `clip-vit-large-patch14`

### Transcription (Whisper) — default `Xenova/whisper-tiny`

- OpenAI · Whisper: `whisper-tiny`, `whisper-tiny.en`, `whisper-base`,
  `whisper-base.en`, `whisper-small`, `whisper-small.en`

### LLM providers

- **Bundled:** `node-llama-cpp` (llama.cpp, local GGUF models).
- **Cloud:** Anthropic, Google, and OpenAI via the
  [Vercel AI SDK](https://ai-sdk.dev/) (`ai` + `@ai-sdk/*` providers).
- **HTTP:** any OpenAI-compatible endpoint (e.g. Ollama) via
  `@ai-sdk/openai-compatible`, used by the natural-language query compiler and
  result summarization.

---

## External platforms (captured / harvested)

These are not dependencies but are integral to what the app does. Pond captures
and refreshes saves from:

- Twitter / X (incl. GraphQL harvesting)
- Instagram
- Pinterest
- Are.na
- Cosmos
- TikTok
- YouTube
- Reddit
- Threads
- Any web article (via `metascraper`)

Model Hub used for AI weights: [Hugging Face](https://huggingface.co/).

---

## Platform integrations & OS APIs

- **Electron `safeStorage`** — encrypts the ingest token (macOS Keychain,
  Windows DPAPI, libsecret on Linux), persisted to `secrets.json`.
- **macOS LaunchServices / UTType** — registers `.pond` as a package bundle.
- **Apple notarization & code signing** — via env vars `APPLE_ID`,
  `APPLE_ID_PASSWORD`, `APPLE_TEAM_ID`, `CSC_LINK`, `CSC_KEY_PASSWORD`.
- **Distribution targets** — macOS DMG (arm64 + x64), Windows NSIS (x64 + arm64),
  Linux AppImage + deb.

---

## Typography & iconography

- [**Inter**](https://rsms.me/inter/) — primary typeface.
- [**JetBrains Mono**](https://www.jetbrains.com/lp/mono/) — monospace.
- [**Nucleo**](https://nucleoapp.com/) — the entire icon language (fill,
  fill-duo, outline, social-media families) via the `nucleo-*` packages in
  `@pond/icons`, plus a few local brand marks for sources Nucleo doesn't ship.

### Brand / source marks

Source brand colors (`packages/theme/src/brand/brand.css`) reference the official
palettes of Twitter/X, Cosmos, Are.na, Facebook, Pinterest, and Dribbble.

---

## Design inspiration & reference material

Products, articles, and codebases studied while designing Pond.

### Products

- [**Linear**](https://linear.app/) — filter chips, saved views,
  [Insights](https://linear.app/docs/insights) and
  [Dashboards](https://linear.app/docs/dashboards) informed the analytics page;
  [filtering docs](https://linear.app/docs/filters) informed the query model.
- [**Family**](https://family.co/) &
  [**ConnectKit**](https://family.co/docs/connectkit/theme-builder) — the dock's
  morphing pill/tray interaction and modal page transitions.
- [**Eagle**](https://eagle.cool/) — local-first media library; its
  [tag](https://en.eagle.cool/support/article/tags) and search articles informed
  the library and filter UX.
- [**Cosmos**](https://www.cosmos.so/) and [**Are.na**](https://www.are.na/) —
  both capture sources and grid/collection layout references.
- [**Seline**](https://seline.com/) and [**Visitors**](https://visitors.now/) —
  quiet, minimal analytics dashboards.
- [**Bklit**](https://bklit.com/docs/components) — chart component composition
  (area/line, heatmap, ring, radar, sunburst).
- [**Raycast**](https://manual.raycast.com/settings) — settings layout.
- [**Mobbin**](https://mobbin.com/) — screen research across apps.

### Articles & design writing

- [benji.org — Family Values](https://benji.org/family-values)
- [bob.fyi — Theming](https://bob.fyi/posts/theming) and
  [OKLCH colors](https://bob.fyi/oklch-colors)
- [Polar — Orbit, an LLM-safe design system](https://polar.sh/blog/orbit-llm-safe-design-system)
- [performance.dev — How is Linear so fast?](https://performance.dev/how-is-linear-so-fast-a-technical-breakdown)
- [Motion — A View Transitions API for the rest of us](https://motion.dev/magazine/a-view-transitions-api-for-the-rest-of-us)
- [barvian.me — React exit animations](https://barvian.me/react-exit-animations)
- [Vercel — Geist colors](https://vercel.com/geist/colors)

### Code references

- [family/connectkit](https://github.com/family/connectkit) — modal/tray
  component architecture.
- [yihui-hu/pidgin](https://github.com/yihui-hu/pidgin) — local-first archive
  prior art.
- [prinsss/twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter)
  — X GraphQL capture approach.
- [wzhudev/reverse-linear-sync-engine](https://github.com/wzhudev/reverse-linear-sync-engine)
  — Linear's sync engine, reverse-engineered.
- [Meridius-Labs/electron-liquid-glass](https://github.com/Meridius-Labs/electron-liquid-glass)
  — macOS liquid-glass window effects.

---

_Versions are sourced from each `package.json`; refresh this document when
dependencies change._
