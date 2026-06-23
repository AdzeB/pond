# References

A complete catalog of every dependency, tool, runtime, model, external service,
and asset used to build **Pond** — a local-first archive for everything you save
across Twitter/X, Instagram, Pinterest, Are.na, Cosmos, TikTok, YouTube, and the
open web.

This file is grouped by **where** each reference is used (monorepo tooling, then
each workspace) and finishes with the **external** binaries, models, services, and
platforms the app depends on at runtime. Versions reflect the ranges declared in
each `package.json` at the time of writing.

---

## Repository

- **Name:** `pond` (private monorepo)
- **License:** MIT
- **Author:** Raphael Salaja
- **Repository:** <https://github.com/raphaelsalaja/pond>
- **Package manager:** [pnpm](https://pnpm.io/) `11.3.0` (workspaces)
- **Task runner:** [Turborepo](https://turborepo.com/) `^2.9.18`
- **Node.js:** `22` (`.nvmrc`); engines require `>=20.12`

### Workspace layout (`pnpm-workspace.yaml`)

```
apps/*       desktop (Electron), extension (browser), website (Next.js)
packages/*   schema, ui, icons, theme
```

---

## Monorepo tooling (root `devDependencies`)

| Package | Version | Purpose |
|---|---|---|
| [`@biomejs/biome`](https://biomejs.dev/) | `2.5.0` | Linting + formatting (`biome.json`) |
| [`@commitlint/cli`](https://commitlint.js.org/) | `^21.0.2` | Conventional commit enforcement |
| [`@commitlint/config-conventional`](https://commitlint.js.org/) | `^21.0.2` | Conventional commit ruleset |
| [`@types/node`](https://www.npmjs.com/package/@types/node) | `^25.9.3` | Node.js type definitions |
| [`husky`](https://typicode.github.io/husky/) | `^9.1.7` | Git hooks (`prepare`) |
| [`turbo`](https://turborepo.com/) | `^2.9.18` | Monorepo build orchestration |
| [`typescript`](https://www.typescriptlang.org/) | `^6.0.3` | Type system / compiler |

Shared config files: `tsconfig.base.json`, `biome.json`, `commitlint.config.js`,
`turbo.json`, `.nvmrc`.

---

## `apps/desktop` — Electron app

Local-first archive that runs in the background, owns a SQLite index + filesystem
library, and accepts saves from the browser extension over `http://127.0.0.1:41610`.

### Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| [`@base-ui/react`](https://base-ui.com/) | `^1.5.0` | Headless UI primitives |
| [`@dnd-kit/core`](https://dndkit.com/) | `^6.3.1` | Drag-and-drop core |
| [`@hono/node-server`](https://hono.dev/) | `^2.0.2` | Node adapter for the local HTTP ingest server |
| [`@huggingface/transformers`](https://huggingface.co/docs/transformers.js) | `^4.2.0` | On-device ML (Transformers.js / ONNX) |
| [`@lexical/react`](https://lexical.dev/) | `^0.45.0` | React bindings for the Lexical editor |
| [`@tanstack/pacer`](https://tanstack.com/pacer) | `^0.21.1` | Rate-limiting / debounce core |
| [`@tanstack/react-hotkeys`](https://tanstack.com/) | `^0.10.0` | Keyboard shortcuts |
| [`@tanstack/react-pacer`](https://tanstack.com/pacer) | `^0.22.1` | React bindings for Pacer |
| [`@tanstack/react-query`](https://tanstack.com/query) | `^5.100.14` | Async state / data fetching |
| [`@tanstack/react-router`](https://tanstack.com/router) | `^1.170.8` | Type-safe routing |
| [`@tanstack/react-store`](https://tanstack.com/store) | `^0.11.0` | React bindings for the store |
| [`@tanstack/store`](https://tanstack.com/store) | `^0.11.0` | Core reactive store |
| [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) | `^12.11.1` | Synchronous SQLite (native) |
| [`border-beam`](https://www.npmjs.com/package/border-beam) | `^1.2.0` | Animated border effect |
| [`drizzle-orm`](https://orm.drizzle.team/) | `^0.45.2` | SQLite ORM |
| [`electron-log`](https://github.com/megahertz/electron-log) | `^5.4.3` | Logging |
| [`electron-updater`](https://www.electron.build/auto-update) | `^6.8.3` | Auto-update |
| [`embla-carousel-react`](https://www.embla-carousel.com/) | `9.0.0-rc02` | Carousel |
| [`ffmpeg-static`](https://github.com/eugeneware/ffmpeg-static) | `^5.2.0` | Bundled static ffmpeg binary |
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
| [`mitt`](https://github.com/developit/mitt) | `^3.0.1` | Tiny event emitter |
| [`motion`](https://motion.dev/) | `^12.39.0` | Animations |
| [`p-limit`](https://github.com/sindresorhus/p-limit) | `^7.3.0` | Concurrency limiting |
| [`pretty-bytes`](https://github.com/sindresorhus/pretty-bytes) | `^7.1.0` | Human-readable sizes |
| [`pretty-ms`](https://github.com/sindresorhus/pretty-ms) | `^9.3.0` | Human-readable durations |
| [`rooks`](https://rooks.vercel.app/) | `^9.8.0` | React hooks collection |
| [`sharp`](https://sharp.pixelplumbing.com/) | `^0.34.5` | Image processing (native) |
| [`ulid`](https://github.com/ulid/javascript) | `^3.0.2` | Sortable unique IDs |
| [`which`](https://github.com/npm/node-which) | `^7.0.0` | Locate executables on PATH |
| [`zod`](https://zod.dev/) | `^4.4.3` | Runtime validation |

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
| `@types/node` | `^25.6.0` | Types |
| `@types/react` | `^19.0.1` | Types |
| `@types/react-dom` | `^19.0.2` | Types |
| `@types/which` | `^3.0.4` | Types |
| [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react) | `^6.0.1` | React fast refresh for Vite |
| [`drizzle-kit`](https://orm.drizzle.team/kit-docs/overview) | `^0.31.10` | Drizzle migrations |
| [`electron`](https://www.electronjs.org/) | `^42.4.0` | Desktop runtime |
| [`electron-builder`](https://www.electron.build/) | `^26.8.1` | Packaging / distribution |
| [`electron-vite`](https://electron-vite.org/) | `^5.0.0` | Electron + Vite dev/build |
| [`react`](https://react.dev/) | `^19.2.5` | UI library |
| [`react-dom`](https://react.dev/) | `^19.2.5` | React DOM renderer |
| [`typescript`](https://www.typescriptlang.org/) | `^6.0.3` | Compiler |
| [`vite`](https://vite.dev/) | `^8.0.11` | Bundler / dev server |
| [`vitest`](https://vitest.dev/) | `^4.1.8` | Test runner |

### Transitive native modules of note (`pnpm-workspace.yaml` build flags)

- `onnxruntime-node` — ONNX inference backend for Transformers.js.
- `re2` — pulled in transitively by `metascraper` (via `url-regex-safe`); not built.
- `protobufjs`, `core-js`, `spawn-sync`, `esbuild`, `electron-winstaller`.

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
| [`react`](https://react.dev/) | `^19.2.5` | UI library |
| [`react-dom`](https://react.dev/) | `^19.2.5` | React DOM renderer |

### Dev dependencies

| Package | Version | Purpose |
|---|---|---|
| `@types/chrome` | `^0.1.40` | Chrome extension types |
| `@types/node` | `^25.6.0` | Types |
| `@types/react` | `^19.2.14` | Types |
| `@types/react-dom` | `^19.0.2` | Types |
| [`@wxt-dev/module-react`](https://wxt.dev/) | `^1.1.6` | React module for WXT |
| [`typescript`](https://www.typescriptlang.org/) | `^6.0.3` | Compiler |
| [`wxt`](https://wxt.dev/) | `^0.20.25` | Browser extension framework |

Manifest host permissions cover: `x.com`, `twitter.com`, `instagram.com`,
`pinterest.com`, `are.na`, `cosmos.so`, `tiktok.com`, `youtube.com`, plus
`127.0.0.1` / `localhost` for the local ingest endpoint.

---

## `apps/website` — Promotional site (Next.js)

A single, static page that reuses `@pond/ui` tokens.

### Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| `@pond/icons` | `workspace:*` | Icon set |
| `@pond/theme` | `workspace:*` | Design tokens |
| `@pond/ui` | `workspace:*` | UI primitives |
| [`next`](https://nextjs.org/) | `^16.0.0` | React framework |
| [`react`](https://react.dev/) | `^19.2.0` | UI library |
| [`react-dom`](https://react.dev/) | `^19.2.0` | React DOM renderer |

### Dev dependencies

| Package | Version | Purpose |
|---|---|---|
| `@types/node` | `^25.9.1` | Types |
| `@types/react` | `^19.2.14` | Types |
| `@types/react-dom` | `^19.0.2` | Types |
| [`typescript`](https://www.typescriptlang.org/) | `^6.0.3` | Compiler |

---

## `packages/schema` — Shared schema

Drizzle + Zod types shared between the desktop app and the extension.

| Package | Version | Purpose |
|---|---|---|
| [`@react-querybuilder/core`](https://react-querybuilder.js.org/) | `^8.18.0` | Query-builder model for saved-view filters |
| [`drizzle-orm`](https://orm.drizzle.team/) | `^0.45.2` | ORM types |
| [`zod`](https://zod.dev/) | `^4.4.3` | Runtime validation |
| `@types/node` (dev) | `^25.6.0` | Types |
| `typescript` (dev) | `^6.0.3` | Compiler |

---

## `packages/ui` — Headless React primitives

Thin Base UI wrappers styled with CSS Modules; app-agnostic.

| Package | Version | Purpose |
|---|---|---|
| [`@base-ui/react`](https://base-ui.com/) | `^1.5.0` | Headless primitives |
| `@pond/icons` | `workspace:*` | Icons |
| [`@tanstack/react-router`](https://tanstack.com/router) | `^1.170.8` | Link/router types |
| [`@uiw/color-convert`](https://uiwjs.github.io/react-color/) | `^2.10.3` | Color conversion |
| [`@uiw/react-color-hue`](https://uiwjs.github.io/react-color/) | `^2.10.3` | Hue picker |
| [`@uiw/react-color-saturation`](https://uiwjs.github.io/react-color/) | `^2.10.3` | Saturation picker |
| [`clsx`](https://github.com/lukeed/clsx) | `^2.1.1` | Conditional classnames |
| [`motion`](https://motion.dev/) | `^12.39.0` | Animations |
| `react` / `react-dom` (peer) | `>=19` | UI runtime |
| `@types/react` / `@types/react-dom` (dev) | `^19.2.14` / `^19.0.2` | Types |
| `typescript` (dev) | `^6.0.3` | Compiler |

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
backend). LLM stage can be the bundled `node-llama-cpp` provider or an HTTP
provider. Model catalogs are defined in
`apps/desktop/src/renderer/src/lib/model-catalogs.ts`.

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

### LLM provider

- **Bundled:** `node-llama-cpp` (llama.cpp, local GGUF models).
- **HTTP:** user-configured endpoint/model (e.g. Ollama / OpenAI-compatible APIs)
  for the natural-language query compiler and result summarization.

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

### Iconography

- [**Nucleo**](https://nucleoapp.com/) — the entire icon language (fill, fill-duo,
  outline, social-media families) via the `nucleo-*` packages in `@pond/icons`,
  plus a few local brand marks for sources Nucleo doesn't ship.

### Brand / source marks

Source brand colors (`packages/theme/src/brand/brand.css`) reference the official
palettes of Twitter/X, Cosmos, Are.na, Facebook, Pinterest, and Dribbble.

---

_Versions are sourced from each `package.json`; refresh this document when
dependencies change._
