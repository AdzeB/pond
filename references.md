# References

A complete catalog of every dependency, tool, runtime, model, external service,
and asset used to build **Pond** — a local-first archive for everything you save
across Twitter/X, Instagram, Pinterest, Are.na, Cosmos, TikTok, YouTube, Reddit,
Threads, and the open web.

This file is grouped by **where** each reference is used (monorepo tooling, then
each workspace), continues with the **external** binaries, models, services, and
platforms the app depends on at runtime, and closes with the **companies,
people, and research sources** that shaped the product. Versions
reflect the ranges declared in each `package.json` at the time of writing.

---

## Repository

- **Name:** `pond` (private monorepo)
- **License:** MIT
- **Repository:** <https://github.com/raphaelsalaja/pond>
- **Package manager:** [pnpm](https://pnpm.io/) `11.3.0` (workspaces + `catalog:` protocol for shared versions)
- **Task runner:** [Turborepo](https://turborepo.com/) `^2.10.4`
- **Node.js:** `22` (`.nvmrc`); engines require `>=20.12`

### Workspace layout (`pnpm-workspace.yaml`)

```
apps/*       desktop (Electron), extension (browser), website (Next.js)
packages/*   schema, ui, icons, theme
```

Shared versions live in the pnpm `catalog:`: `react` / `react-dom` `^19.2.8`,
`typescript` `^7.0.2`, `@types/node` `^26.2.0`, `@types/react` `^19.2.18`,
`@types/react-dom` `^19.2.4`.

---

## Monorepo tooling (root `devDependencies`)

| Package | Version | Purpose |
|---|---|---|
| [`@biomejs/biome`](https://biomejs.dev/) | `2.5.3` | Linting + formatting (`biome.json`) |
| [`@commitlint/cli`](https://commitlint.js.org/) | `^21.2.1` | Conventional commit enforcement |
| [`@commitlint/config-conventional`](https://commitlint.js.org/) | `^21.2.0` | Conventional commit ruleset |
| [`@types/node`](https://www.npmjs.com/package/@types/node) | `catalog:` | Node.js type definitions |
| [`husky`](https://typicode.github.io/husky/) | `^9.1.7` | Git hooks (`prepare`) |
| [`knip`](https://knip.dev/) | `^6.25.0` | Unused file/dependency/export detection |
| [`turbo`](https://turborepo.com/) | `^2.10.4` | Monorepo build orchestration |
| [`typescript`](https://www.typescriptlang.org/) | `catalog:` | Type system / compiler |

Shared config files: `tsconfig.base.json`, `biome.json`, `commitlint.config.js`,
`turbo.json`, `knip.json`, `.nvmrc`.

---

## `apps/desktop` — Electron app

Local-first archive that runs in the background, owns a SQLite index + filesystem
library, and accepts saves from the browser extension over Chrome native messaging.

### Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| [`@base-ui/react`](https://base-ui.com/) | `^1.6.0` | Headless primitives used directly in a few surfaces |
| [`@blossom-carousel/react`](https://www.blossom-carousel.com/) | `^1.3.0` | Media carousel |
| [`@dnd-kit/abstract`](https://dndkit.com/) / [`dom`](https://dndkit.com/) / [`helpers`](https://dndkit.com/) / [`react`](https://dndkit.com/) | `^0.5.0` | Toolbar tab reorder |
| [`@hono/node-server`](https://hono.dev/) | `^2.0.2` | Node adapter for the local HTTP ingest server |
| [`@huggingface/transformers`](https://huggingface.co/docs/transformers.js) | `^4.2.0` | On-device ML (Transformers.js / ONNX) |
| [`@lexical/react`](https://lexical.dev/) | `^0.45.0` | React bindings for the Lexical editor |
| [`@tanstack/pacer`](https://tanstack.com/pacer) | `^0.21.1` | Rate-limiting / debounce core |
| [`@tanstack/react-hotkeys`](https://tanstack.com/hotkeys) | `0.10.0` | Keyboard shortcuts |
| [`@tanstack/react-query`](https://tanstack.com/query) | `^5.100.14` | Async state / data fetching |
| [`@tanstack/react-router`](https://tanstack.com/router) | `^1.170.8` | Type-safe routing |
| [`@tanstack/react-store`](https://tanstack.com/store) | `^0.11.0` | React bindings for the store |
| [`@tanstack/react-virtual`](https://tanstack.com/virtual) | `^3.14.9` | Grid / list virtualization |
| [`@tanstack/store`](https://tanstack.com/store) | `^0.11.0` | Core reactive store |
| [`@web-kits/audio`](https://github.com/raphaelsalaja/audio) | `^0.1.0` | Interface sounds |
| [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) | `^12.11.1` | Synchronous SQLite (native) |
| [`blurhash`](https://blurha.sh/) | `^2.0.5` | Compact cover placeholders |
| [`calligraph`](https://calligraph.raphaelsalaja.com/) | `^1.4.1` | Animated type in the dock |
| [`chrono-node`](https://github.com/wanasit/chrono) | `^2.9.1` | Natural-language date parsing (search) |
| [`date-fns`](https://date-fns.org/) | `^4.4.0` | Date utilities |
| [`drizzle-orm`](https://orm.drizzle.team/) | `^0.45.2` | SQLite ORM |
| [`electron-log`](https://github.com/megahertz/electron-log) | `^5.4.3` | Logging |
| [`electron-updater`](https://www.electron.build/auto-update) | `^6.8.3` | Auto-update |
| [`ffmpeg-static`](https://github.com/eugeneware/ffmpeg-static) | `^5.2.0` | Bundled static ffmpeg binary |
| [`fuse.js`](https://www.fusejs.io/) | `^7.4.2` | Fuzzy search |
| [`gpt-tokenizer`](https://github.com/niieani/gpt-tokenizer) | `^3.4.0` | Token counting for compile-prompt budgets |
| [`hono`](https://hono.dev/) | `^4.12.18` | HTTP server framework (ingest) |
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
| [`warcio`](https://github.com/webrecorder/warcio.js) | `^2.4.10` | WARC recording for archived pages |
| [`which`](https://github.com/npm/node-which) | `^7.0.0` | Locate executables on PATH |
| [`zod`](https://zod.dev/) | `^4.4.3` | Runtime validation |
| [`@tanstack/ai`](https://tanstack.com/ai) | `^0.52.0` | Agent `chat()` loop in main |
| [`@tanstack/ai-react`](https://tanstack.com/ai) | `^0.22.4` | Renderer chat hooks |
| [`@tanstack/ai-openai`](https://tanstack.com/ai) | `^0.22.3` | OpenAI and OpenAI-compatible adapters |
| [`@tanstack/ai-anthropic`](https://tanstack.com/ai) | `^0.18.3` | Anthropic adapter |
| [`@tanstack/ai-gemini`](https://tanstack.com/ai) | `^0.26.4` | Gemini adapter |
| [`@tanstack/ai-ollama`](https://tanstack.com/ai) | `^0.10.3` | Ollama adapter |
| [`@modelcontextprotocol/sdk`](https://modelcontextprotocol.io/) | `^1.30.0` | Pond as a local MCP server |

Plus the workspace packages `@pond/icons`, `@pond/schema`, `@pond/theme`, `@pond/ui`.

Enrichments run on-device. Agent uses a key you paste (OpenAI, Anthropic, Gemini, or OpenAI-compatible) stored in `safeStorage`, or Minnow when no key is set. Pond does not host a model gateway. Pond also speaks MCP over stdio so Cursor and Claude can search this library.

### Optional dependency

| Package | Version | Purpose |
|---|---|---|
| [`node-llama-cpp`](https://node-llama-cpp.withcat.ai/) | `^3.0.0` | Bundled on-device LLM (llama.cpp). The GGUF downloads on first use. |

### Dev dependencies

| Package | Version | Purpose |
|---|---|---|
| [`@electron/rebuild`](https://github.com/electron/rebuild) | `^4.0.4` | Rebuild native modules for Electron ABI |
| [`@tanstack/router-cli`](https://tanstack.com/router) | `1.167.10` | Route tree codegen (`tsr generate`) |
| [`@tanstack/router-plugin`](https://tanstack.com/router) | `^1.168.11` | Vite plugin for the route tree |
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
| [`replaywebpage`](https://replayweb.page/) | `^2.4.6` | WARC viewer assets copied into `resources/replay/` |
| [`typescript`](https://www.typescriptlang.org/) | `catalog:` | Compiler |
| [`vite`](https://vite.dev/) | `^8.0.11` | Bundler / dev server |
| [`vitest`](https://vitest.dev/) | `^4.1.8` | Test runner |

### Transitive native modules of note (`pnpm-workspace.yaml` build flags)

- `better-sqlite3`, `node-llama-cpp`, `re2` — pnpm builds disabled; the first two
  are rebuilt for the Electron ABI (or resolve prebuilds), `re2` falls back to
  `RegExp`.
- `onnxruntime-node` — ONNX inference backend for Transformers.js.
- `sharp`, `protobufjs`, `esbuild`, `electron`, `electron-winstaller`, `ffmpeg-static`, `spawn-sync` — `allowBuilds: true`.

---

## `apps/extension` — Browser extension (WXT)

Captures saves from supported platforms into the local Pond library.

### Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| `@pond/icons` / `@pond/schema` / `@pond/theme` / `@pond/ui` | `workspace:*` | Icons / types / tokens / primitives |
| [`@webext-core/messaging`](https://webext-core.aklinker1.io/) | `^3.0.2` | Type-safe extension messaging |
| [`border-beam`](https://beam.jakubantalik.com/) | `^1.3.0` | Animated border on the in-page toolbar |
| [`react`](https://react.dev/) / [`react-dom`](https://react.dev/) | `catalog:` | UI library / renderer |

### Dev dependencies

| Package | Version | Purpose |
|---|---|---|
| `@types/chrome` | `^0.1.40` | Chrome extension types |
| `@types/node` / `@types/react` / `@types/react-dom` | `catalog:` | Types |
| [`@wxt-dev/module-react`](https://wxt.dev/) | `^1.1.6` | React module for WXT |
| [`sharp`](https://sharp.pixelplumbing.com/) | `^0.34.5` | Icon generation |
| [`typescript`](https://www.typescriptlang.org/) | `catalog:` | Compiler |
| [`wxt`](https://wxt.dev/) | `^0.20.25` | Browser extension framework |

Manifest host permissions cover: `x.com`, `twitter.com`, `instagram.com`,
`pinterest.com`, `are.na`, `cosmos.so`, `tiktok.com`, `youtube.com`, plus
`<all_urls>` for generic articles. The extension talks to Pond through native
messaging (`so.pond.host`); a loopback HTTP API on `127.0.0.1:41610` remains
for debugging.

---

## `apps/website` — Promotional site (Next.js)

A single, static page that reuses `@pond/ui` tokens.

| Package | Version | Purpose |
|---|---|---|
| `@pond/icons` / `@pond/theme` / `@pond/ui` | `workspace:*` | Icons / tokens / primitives |
| [`clsx`](https://github.com/lukeed/clsx) | `^2.1.1` | Conditional classnames |
| [`next`](https://nextjs.org/) | `^16.3.1` | React framework |
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
| [`@base-ui/react`](https://base-ui.com/) | `^1.6.0` | Headless primitives |
| `@pond/icons` | `workspace:*` | Icons |
| [`@tanstack/react-router`](https://tanstack.com/router) | `^1.170.8` | Link/router types |
| [`@tanstack/react-store`](https://tanstack.com/store) / [`@tanstack/store`](https://tanstack.com/store) | `^0.11.0` | Reactive store |
| [`@tanstack/react-table`](https://tanstack.com/table) | `^8.21.3` | Headless table |
| [`@tanstack/react-virtual`](https://tanstack.com/virtual) | `^3.14.5` | List virtualization |
| [`clsx`](https://github.com/lukeed/clsx) | `^2.1.1` | Conditional classnames |
| [`motion`](https://motion.dev/) | `^12.39.0` | Animations |
| [`react-aria`](https://react-spectrum.adobe.com/react-aria/) | `^3.50.0` | Accessibility primitives |
| [`react-stately`](https://react-spectrum.adobe.com/react-stately/) | `^3.48.0` | State hooks for react-aria |
| `react` / `react-dom` (peer) | `catalog:` | UI runtime |
| `@types/react` / `@types/react-dom` / `typescript` (dev) | `catalog:` | Types / compiler |

---

## `packages/icons` — Icon barrel

Vendors **100** Nucleo UI glyphs (fill + outline families) as committed React
modules under `generated/`, per Nucleo's open-source terms. Social and brand
marks live in `social-media/custom/` and are outside the 100-icon budget. See
[`packages/icons/COPYRIGHT-NOTICE.md`](packages/icons/COPYRIGHT-NOTICE.md).

| Asset | Purpose |
|---|---|
| `generated/*` | Vendored Nucleo UI icons (`allowlist.json` enforces the cap) |
| `social-media/custom/*` | Hand-authored source brand marks (unlimited) |
| `brand/` | Pond mark (`icon.svg`) plus Icon Composer colorways in `tints/` |

Dev-only (icon regeneration): `react`, `react-dom` (for `scripts/generate-icons.mjs`).

## `packages/theme` — Design tokens

The runtime `--ds-*` theming engine (colors, motion, radius, shadow, typography,
brand, empty) as plain CSS custom properties. Zero dependencies. Color generation
lives in `src/colors/gen.ts`.

---

## External binaries (spawned at runtime / bundled)

| Tool | How it's used | Source |
|---|---|---|
| [**yt-dlp**](https://github.com/yt-dlp/yt-dlp) | Video downloads (TikTok / IG Reels / YouTube). Fetched at runtime into `userData`, **not** bundled. | yt-dlp releases |
| [**ffmpeg**](https://ffmpeg.org/) | Muxes adaptive streams for downloads. Bundled via `ffmpeg-static` and flattened to `bin/ffmpeg` in packaged builds. | `ffmpeg-static` |
| [**Electron BrowserWindow**](https://www.electronjs.org/docs/latest/api/browser-window) | Headless "scrape window" pool used by the refresh/harvest pipeline. | Electron |
| **SQLite** (via `better-sqlite3`) | Local index database. | better-sqlite3 |
| [**ReplayWeb.page**](https://replayweb.page/) | In-app viewer for archived pages (WARC). Assets copied from `replaywebpage`. | Webrecorder |

---

## On-device AI models

Inference runs locally via Transformers.js (`@huggingface/transformers`, ONNX
backend). Model catalogs are defined in
`apps/desktop/src/renderer/src/lib/enrichment/model-catalogs.ts`. Natural-language
search compiles on-device with the bundled Minnow GGUF. Weights come from
[Hugging Face](https://huggingface.co/).

### Minnow (natural-language compiler)

[Llama 3.2 1B Instruct](https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct),
Q4_K_M GGUF by [bartowski](https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF).
Downloaded on first use to `userData/models/`. Runs through `node-llama-cpp`.

### Text embeddings (semantic search) — default `Xenova/all-MiniLM-L6-v2`

- Sentence Transformers: `all-MiniLM-L6-v2`, `all-MiniLM-L12-v2`,
  `all-mpnet-base-v2`, `paraphrase-multilingual-MiniLM-L12-v2`
- BAAI · BGE: `bge-small-en-v1.5`, `bge-base-en-v1.5`
- Alibaba · GTE: `gte-small`, `gte-base`
- intfloat · E5: `multilingual-e5-small`, `multilingual-e5-base`

### Text in images — default `onnx-community/Florence-2-base-ft`

- Microsoft · Florence-2: `Florence-2-base-ft`, `Florence-2-large-ft`

### Visual similarity — default `Xenova/clip-vit-base-patch32`

- OpenAI · CLIP: `clip-vit-base-patch32`, `clip-vit-base-patch16`,
  `clip-vit-large-patch14`

### Transcription — default `Xenova/whisper-tiny`

- OpenAI · Whisper: `whisper-tiny`, `whisper-tiny.en`, `whisper-base`,
  `whisper-base.en`, `whisper-small`, `whisper-small.en`

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

---

## Platform integrations & OS APIs

- **Electron `safeStorage`** — encrypts the ingest token (macOS Keychain,
  Windows DPAPI, libsecret on Linux), persisted to `secrets.json`.
- **macOS LaunchServices / UTType** — registers `.pond` as a package bundle.
- **[Apple Icon Composer](https://developer.apple.com/icon-composer)** — Dock
  icon colorways under `packages/icons/brand/tints/`.
- **Apple notarization & code signing** — via env vars `APPLE_ID`,
  `APPLE_ID_PASSWORD`, `APPLE_TEAM_ID`, `CSC_LINK`, `CSC_KEY_PASSWORD`.
- **Distribution targets** — macOS DMG (arm64 + x64), Windows NSIS (x64 + arm64),
  Linux AppImage + deb.

---

## Typography & iconography

- [**Inter**](https://rsms.me/inter/) — UI typeface (variable, bundled).
- [**JetBrains Mono**](https://www.jetbrains.com/lp/mono/) — monospace in the
  desktop app, extension, and website.
- [**IBM Plex Mono**](https://www.ibm.com/plex/) — fallback `--ds-font-mono` in
  `@pond/theme` before apps override it.
- **Chirp** — Twitter/X typeface, bundled for tweet cards only.
- [**Nucleo**](https://nucleoapp.com/) — up to 100 UI glyphs vendored into
  `@pond/icons` under the open-source license (see `COPYRIGHT-NOTICE.md`).
- **Custom brand marks** — Are.na, Cosmos, X, Instagram, TikTok, YouTube,
  Pinterest, Threads, GitHub, Apple, and others in `social-media/custom/`
  (outside the Nucleo cap). Are.na's marks also referenced
  [aredotna/icons](https://github.com/aredotna/icons).

### Brand / source marks

Source brand colors (`packages/theme/src/brand/brand.css`) reference the official
palettes of Twitter/X, Cosmos, Are.na, Facebook, Pinterest, and Dribbble.

---

## Design inspiration & reference material

Companies, people, files, and codebases Pond learned from.

### Companies

- [**Linear**](https://linear.app/) — filter chips, saved views,
  [Insights](https://linear.app/docs/insights) and
  [Dashboards](https://linear.app/docs/dashboards) informed the analytics page;
  [filtering docs](https://linear.app/docs/filters) informed the query model.
  [The Linear Method](https://linear.app/method),
  [changelog](https://linear.app/changelog),
  [Now](https://linear.app/now),
  [labels](https://linear.app/docs/labels),
  [dashboards best practices](https://linear.app/now/dashboards-best-practices), and
  [how we built triage intelligence](https://linear.app/now/how-we-built-triage-intelligence)
  informed product writing and analytics.
- [**Family**](https://family.co/) and
  [**ConnectKit**](https://family.co/docs/connectkit/theme-builder) — the dock's
  morphing pill/tray interaction and modal page transitions. Family's iOS app
  on [Mobbin](https://mobbin.com/apps/family-ios-91274a89-9f29-40f9-9b83-c7dae12d40b6/46088ce2-9ad5-4019-9ccc-6f8a050e9638/screens)
  was a primary dock/flow reference. [Family Values](https://benji.org/family-values)
  is the essay behind that interaction model.
- [**Vercel**](https://vercel.com/) — [Geist](https://vercel.com/geist/colors),
  [empty states](https://vercel.com/geist/empty-state),
  [writing guidelines](https://github.com/vercel-labs/writing-guidelines), and
  [web interface guidelines](https://github.com/vercel-labs/web-interface-guidelines).
- [**Apple**](https://developer.apple.com/design/human-interface-guidelines/) —
  HIG, [Icon Composer](https://developer.apple.com/icon-composer), and liquid-glass
  window chrome.
- [**Eagle**](https://eagle.cool/) — local-first media library.
  [Tags](https://en.eagle.cool/support/article/tags),
  [organizing tags](https://en.eagle.cool/support/article/organizing-tags),
  [detail mode](https://eagle.cool/support/article/detail-mode), and
  [desktop search](https://eagle.cool/support/desktop/search).
- [**Cosmos**](https://www.cosmos.so/) and [**Are.na**](https://www.are.na/) —
  capture sources and grid/collection layout. Cosmos collections used as layout
  references include [Linus Rogge](https://www.cosmos.so/linusrogge),
  [Maximilian Stallboerger](https://www.cosmos.so/stallboerger), and
  [Amelie Schltr](https://www.cosmos.so/amelieschltr).
- [**Raycast**](https://www.raycast.com/) — settings layout
  ([manual](https://manual.raycast.com/settings)).
- [**Seline**](https://seline.com/) and [**Visitors**](https://visitors.now/) —
  quiet, minimal analytics dashboards.
- [**Campsite**](https://github.com/campsite/campsite) — settings atoms and
  composed page structure.
- [**Immich**](https://immich.app/) and [**PhotoPrism**](https://www.photoprism.app/) —
  library grid packing, placeholders, and ingest-time dimensions.
- [**ArchiveBox**](https://github.com/ArchiveBox/ArchiveBox) — local-first web archive
  prior art.
- [**Bklit**](https://bklit.com/docs/components) — chart component composition.
- [**Round**](https://www.round.ai/) and [**Aave**](https://aave.com/design/building-glass-for-the-web) —
  glass treatments for the tray and window chrome.
- [**Polar**](https://polar.sh/) — [Orbit](https://polar.sh/blog/orbit-llm-safe-design-system),
  an LLM-safe design system.
- [**Nucleo**](https://nucleoapp.com/) — UI glyph library.
- [**Base UI**](https://base-ui.com/) (MUI) — primitives `@pond/ui` wraps.
- [**Electron**](https://www.electronjs.org/) — desktop shell.
- [**JetBrains**](https://www.jetbrains.com/) — JetBrains Mono.
- [**bob.fyi**](https://bob.fyi/) — [Theming](https://bob.fyi/posts/theming),
  [OKLCH colors](https://bob.fyi/oklch-colors),
  [clip-path curve](https://bob.fyi/posts/clip-path-curve), and the
  [playground](https://bob.fyi/playground). Pond's `--ds-*` engine follows that model.
- [**Amie**](https://amie.so/) — calendar UI, density, and motion.
- [**Shiori**](https://www.shiori.sh/) — bookmark/archive product reference.
- [**Norma**](https://nor.ma/) — marketing-site composition (full-bleed hero, glass nav).
- [**Glass**](https://glassapp.dev/) — liquid-glass treatments.
- [**OpenStatus**](https://data-table.openstatus.dev/) — data-table filters
  (also [openstatusHQ/data-table-filters](https://github.com/openstatusHQ/data-table-filters)).
- [**Kumo UI**](https://kumo-ui.com/) and [**Beautiful UI**](https://www.beautifului.dev/) —
  component galleries.
- [**Nelson**](https://nelson.co/?section=icons) — icon craft.
- [**Wordmarks**](https://wrdmrks.com/) — wordmark / extract tools.
- [**Lance Draws**](https://lancedraws.com/) — illustration and mark work.
- [**Stacher**](https://stacher.io/) — local yt-dlp Mac app, peer for video download UX.
- [**Helium**](https://github.com/imputnet/helium) — private browser chrome (tab-strip behavior, not a library).
- [**Distill**](https://distill.id/) and [**Interfere**](https://interfere.com/) —
  product-site references.
- [**Logging Sucks**](https://loggingsucks.com/) — logging/status copy.
- [**Lisse**](https://github.com/JaceThings/Lisse) — local library prior art.

### Figma

- [Pond](https://www.figma.com/design/NLxAw3YtDXoprS7o5rAMGg/Pond) — product file.
- [Pond (working)](https://www.figma.com/design/aSPLHoyiRN54kPedlW4Ix2/Pond) —
  later screens (library, settings).
- [Browser Mockups by Shiryoku](https://www.figma.com/design/q6vqVdIg4xqjFxzv6t1OPV/Browser-Mockups-%E2%80%94-by-Shiryoku--Community-) —
  website / extension mock chrome.
- [Base UI Starter Kit](https://www.figma.com/community/file/1635549277397866186/base-ui-starter-kit-wip) —
  community kit for Base UI primitives.

### Mobbin

[Mobbin](https://mobbin.com/) was the screen-research library. Flows and apps
sent as references:

- [Family iOS screens](https://mobbin.com/apps/family-ios-91274a89-9f29-40f9-9b83-c7dae12d40b6/46088ce2-9ad5-4019-9ccc-6f8a050e9638/screens) and
  [flows](https://mobbin.com/apps/family-ios-91274a89-9f29-40f9-9b83-c7dae12d40b6/46088ce2-9ad5-4019-9ccc-6f8a050e9638/flows)
- [Family web](https://mobbin.com/apps/family-web-b048d513-cf88-4cc4-adec-bf211685cda0/bf4a3959-5ae2-4dc6-8a94-dd82ac1c379c/screens)
- [Visitors](https://mobbin.com/sites/visitors-be4f217e-a272-45b0-a8b3-bcdc496e8cfe/ec294852-3439-457c-92ed-6829fbd4e1da/preview)
- Flows [06e62a8e](https://mobbin.com/flows/06e62a8e-b613-4921-8a07-fc22238ae7f4) and
  [4373fd95](https://mobbin.com/flows/4373fd95-c2f6-4361-9c2d-34ce151bcee9)

Scratch boards live locally in `.mobbin/` (gitignored).

### Writing

- [Vercel writing guidelines](https://github.com/vercel-labs/writing-guidelines)
- [Linear Method](https://linear.app/method) and
  [changelog](https://linear.app/changelog)
- [Vercel Geist empty state](https://vercel.com/geist/empty-state)
- [Family Values](https://benji.org/family-values)

### Articles & design writing

- [bob.fyi — Theming](https://bob.fyi/posts/theming),
  [OKLCH colors](https://bob.fyi/oklch-colors), and
  [clip-path curve](https://bob.fyi/posts/clip-path-curve)
- [Jim Nielsen — Big Sur-ification of macOS icons](https://blog.jim-nielsen.com/2024/big-sur-ification-of-macos-icons/)
- [Motion — A View Transitions API for the rest of us](https://motion.dev/magazine/a-view-transitions-api-for-the-rest-of-us)
- [animations.dev](https://animations.dev/) and [transitions.dev](https://transitions.dev/)
- [Björn Ottosson — Oklab](https://bottosson.github.io/posts/oklab/)
- [Polar — Orbit, an LLM-safe design system](https://polar.sh/blog/orbit-llm-safe-design-system)
- [performance.dev — How is Linear so fast?](https://performance.dev/how-is-linear-so-fast-a-technical-breakdown)
- [barvian.me — React exit animations](https://barvian.me/react-exit-animations)
- [Vercel — Geist colors](https://vercel.com/geist/colors)
- [Wu Zhu — I reversed Linear's sync engine](https://dev.to/wzhudev/i-reversed-linears-sync-engine-to-see-how-it-works-3cj)

### People

| Person | X | Why they show up |
|---|---|---|
| [John Phamous](https://x.com/JohnPhamous) | [@JohnPhamous](https://x.com/JohnPhamous) | Empty states: one anatomy (icon, title, description, action), a real next step, never a dead-end search. See [search is not a dead end](https://x.com/JohnPhamous/status/2028534571466432740), [half empty state](https://x.com/JohnPhamous/status/2028896962448376105), [2070261175292682650](https://x.com/JohnPhamous/status/2070261175292682650), and [2059322499570290812](https://x.com/JohnPhamous/status/2059322499570290812). Geist EmptyState follows the same bar. |
| [bob.fyi](https://bob.fyi/) | — | Theming and OKLCH. See [Theming](https://bob.fyi/posts/theming), [OKLCH colors](https://bob.fyi/oklch-colors), [clip-path curve](https://bob.fyi/posts/clip-path-curve), and the [playground](https://bob.fyi/playground). Pond's `--ds-*` engine follows that model. Figma: [@yobob](https://www.figma.com/@yobob). |
| [Rasmus Andersson](https://rsms.me/) | [@rsms](https://x.com/rsms) | Inter. |
| [Björn Ottosson](https://bottosson.github.io/) | [@bjornornorn](https://x.com/bjornornorn) | Oklab / OKLCH, used by the theme engine. |
| [Jakub Antalik](https://beam.jakubantalik.com/) | [@jakubantalik](https://x.com/jakubantalik) | `border-beam` on the extension toolbar. |
| [Jim Nielsen](https://blog.jim-nielsen.com/2024/big-sur-ification-of-macos-icons/) | [@jimniels](https://x.com/jimniels) | macOS icon language (Big Sur-ification). |
| [Dennis Brotzky](https://x.com/brotzky) | [@brotzky](https://x.com/brotzky) | UI references: [2046244639582372313](https://x.com/brotzky/status/2046244639582372313), [1884287348206137778](https://x.com/brotzky/status/1884287348206137778). |
| [shadcn](https://ui.shadcn.com/) | [@shadcn](https://x.com/shadcn) | Component / registry craft. [Tweet](https://x.com/shadcn/status/2070561306038653247). |
| [Dominik Ferber](https://www.dferber.de/) | [@dferber90](https://x.com/dferber90) | Sent as a UI reference. [Tweet](https://x.com/dferber90/status/2073027573219549678). |
| [notrab](https://www.notrab.dev/) | [@notrab](https://x.com/notrab) | Sent as a UI reference. [Tweet](https://x.com/notrab/status/2061119216594329817). |
| [Yihui Hu](https://github.com/yihui-hu/pidgin) | [@_yihui](https://x.com/_yihui) | Pidgin, local-first archive prior art. |
| [Jace Attard](https://ja.mt/) | [@JaceThings](https://x.com/JaceThings) | [Lisse](https://github.com/JaceThings/Lisse), local library prior art. |
| [prinsss](https://github.com/prinsss/twitter-web-exporter) | — | X GraphQL bookmark capture. |
| [Wu Zhu](https://github.com/wzhudev/reverse-linear-sync-engine) | — | Linear sync-engine reverse-engineering. |
| [Max Barvian](https://barvian.me/react-exit-animations) | [@MBarvian](https://x.com/MBarvian) | React exit animations. |
| [bartowski](https://huggingface.co/bartowski) | — | Minnow GGUF quantization. |
| [Shiryoku](https://www.figma.com/design/q6vqVdIg4xqjFxzv6t1OPV/Browser-Mockups-%E2%80%94-by-Shiryoku--Community-) | [@mx_shiryoku](https://x.com/mx_shiryoku) | Browser mockup Figma community file. |
| [Paco Coursey](https://github.com/pacocoursey/cmdk) | [@pacocoursey](https://x.com/pacocoursey) | Command palette composition studied for search (`cmdk`). |
| [Bora Baloglu](https://github.com/borabaloglu/cmdk-base) | [@borabalogluu](https://x.com/borabalogluu) | Command palette composition studied for search (`cmdk-base`). |

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
- [bklit/bklit-ui](https://github.com/bklit/bklit-ui) — chart primitives.
- [webrecorder/warcio.js](https://github.com/webrecorder/warcio.js) and
  [ReplayWeb.page](https://replayweb.page/) — page archive format and viewer.
- [openstatusHQ/data-table-filters](https://github.com/openstatusHQ/data-table-filters)
  and [data-table.openstatus.dev](https://data-table.openstatus.dev/) — filter tables.
- [PallavAg/liquid-glass-web-react](https://github.com/PallavAg/liquid-glass-web-react)
  — web liquid-glass experiments, alongside
  [electron-liquid-glass](https://github.com/Meridius-Labs/electron-liquid-glass)
  and [Electron PR 50415](https://github.com/electron/electron/pull/50415).
- [willwearing/chromium-tabs](https://github.com/willwearing/chromium-tabs) —
  tab-strip behavior.
- [blossom-carousel](https://www.blossom-carousel.com/docs/migration-guides/embla) —
  carousel (Embla migration).
- [dnd kit](https://dndkit.com/) — toolbar reorder.
- [Video.js](https://videojs.org/) — video player reference.

---

_Versions are sourced from each `package.json`; refresh this document when
dependencies change._
