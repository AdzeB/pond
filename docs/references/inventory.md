# Dependency and asset inventory

Runtime, tooling, package-version, platform, model, and asset information. Versions and implementation descriptions are a snapshot; package manifests and implementation remain authoritative. Update affected entries alongside changes. Bibliographic citations identify the upstream source; release dates and exact source revisions are unknown unless recorded here.

See the [bibliography](../../references.md) and [influence index](influences.md).

## Repository

- **Name:** `pond` (private monorepo)
- **License:** MIT
- **Repository:** <https://github.com/raphaelsalaja/pond>
- **Package manager:** pnpm ([pnpm, n.d.](../../references.md#pnpm-io)) `11.27.0` (workspaces + `catalog:` protocol for shared versions)
- **Task runner:** Turborepo ([Vercel, n.d.-e](../../references.md#turborepo-com)) `^2.10.13`
- **Node.js:** `24` (`.nvmrc`); root engines require `24.x`

### Workspace layout (`pnpm-workspace.yaml`)

```
apps/*       desktop, browser extension, Raycast extension, website
packages/*   cli, local API, schema, UI, icons, theme
```

Shared versions live in the pnpm `catalog:`: `react` / `react-dom` `^19.3.0`,
`typescript` `^7.0.2`, `@types/node` `^24.13.5`, and `@types/react` /
`@types/react-dom` `^19.3.0`. Workspace overrides pin the installed React
packages to `19.3.0`.

---

## Monorepo tooling (root `devDependencies`)

| Package | Version | Purpose |
|---|---|---|
| `@biomejs/biome` ([Biome, n.d.](../../references.md#biomejs-dev)) | `2.5.13` | Linting + formatting (`biome.json`) |
| `@commitlint/cli` ([commitlint, n.d.](../../references.md#commitlint-js-org)) | `^21.2.2` | Conventional commit enforcement |
| `@commitlint/config-conventional` ([commitlint, n.d.](../../references.md#commitlint-js-org)) | `^21.2.2` | Conventional commit ruleset |
| `@oxlint/plugins` | `1.83.0` | Oxlint JavaScript plugin support |
| `@types/node` ([“@types/node”, n.d.](../../references.md#npmjs-com-package-types-node)) | `catalog:` | Node.js type definitions |
| `husky` ([“husky”, n.d.](../../references.md#typicode-github-io-husky)) | `^9.1.7` | Git hooks (`prepare`) |
| `knip` ([Knip, n.d.](../../references.md#knip-dev)) | `^6.35.1` | Unused file/dependency/export detection |
| `oxc-parser` | `0.150.0` | Parser used by repository lint tooling |
| `oxlint` | `1.83.0` | Type-aware repository linting |
| `turbo` ([Vercel, n.d.-e](../../references.md#turborepo-com)) | `^2.10.13` | Monorepo build orchestration |
| `typescript` ([Microsoft, n.d.](../../references.md#typescriptlang-org)) | `catalog:` | Type system / compiler |

Shared config files: `tsconfig.base.json`, `biome.json`, `commitlint.config.js`,
`turbo.json`, `knip.json`, `.nvmrc`.

---

## `apps/desktop` — Electron app

Local-first archive that runs in the background, owns a SQLite index + filesystem
library, and accepts saves from the browser extension over Chrome native messaging.

### Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| `@hono/node-server` ([Hono, n.d.](../../references.md#hono-dev)) | `^2.1.1` | Node adapter for the local HTTP ingest server |
| `@huggingface/transformers` ([Hugging Face, n.d.-b](../../references.md#huggingface-co-docs-transformers-js)) | `^4.3.0` | On-device ML (Transformers.js / ONNX) |
| `@lexical/*` ([Meta, n.d.-a](../../references.md#lexical-dev)) | `0.50.0` | Editor features and React bindings |
| `@tanstack/hotkeys` ([TanStack, n.d.-b](../../references.md#tanstack-com-hotkeys)) | `0.8.0` | Keyboard shortcut core |
| `@tanstack/pacer` ([TanStack, n.d.-c](../../references.md#tanstack-com-pacer)) | `^0.22.0` | Rate-limiting / debounce core |
| `@tanstack/react-hotkeys` ([TanStack, n.d.-b](../../references.md#tanstack-com-hotkeys)) | `0.10.0` | Keyboard shortcuts |
| `@tanstack/react-query` ([TanStack, n.d.-d](../../references.md#tanstack-com-query)) | `^5.102.8` | Async state / data fetching |
| `@tanstack/react-router` ([TanStack, n.d.-e](../../references.md#tanstack-com-router)) | `^1.170.36` | Type-safe routing |
| `@tanstack/react-store` ([TanStack, n.d.-f](../../references.md#tanstack-com-store)) | `^0.11.1` | React bindings for the store |
| `@tanstack/react-virtual` ([TanStack, n.d.-h](../../references.md#tanstack-com-virtual)) | `^3.14.13` | Grid / list virtualization |
| `@tanstack/store` ([TanStack, n.d.-f](../../references.md#tanstack-com-store)) | `^0.11.1` | Core reactive store |
| `@web-kits/audio` ([raphaelsalaja, n.d.](../../references.md#github-com-raphaelsalaja-audio)) | `^0.2.0` | Interface sounds |
| `better-sqlite3` ([WiseLibs, n.d.](../../references.md#github-com-wiselibs-better-sqlite3)) | `^13.0.3` | Synchronous SQLite (native) |
| `blurhash` ([BlurHash, n.d.](../../references.md#blurha-sh)) | `^2.0.5` | Compact cover placeholders |
| `chrono-node` ([wanasit, n.d.](../../references.md#github-com-wanasit-chrono)) | `^2.10.1` | Natural-language date parsing (search) |
| `clsx` ([lukeed, n.d.](../../references.md#github-com-lukeed-clsx)) | `^2.1.1` | Conditional class names |
| `date-fns` ([date-fns, n.d.](../../references.md#date-fns-org)) | `^4.4.0` | Date utilities |
| `drizzle-orm` ([Drizzle Team, n.d.-b](../../references.md#orm-drizzle-team)) | `^0.45.2` | SQLite ORM |
| `electron-log` ([megahertz, n.d.](../../references.md#github-com-megahertz-electron-log)) | `^5.4.4` | Logging |
| `electron-updater` ([electron-builder, n.d.-a](../../references.md#electron-build-auto-update)) | `^6.8.9` | Auto-update |
| `epubjs` | `^0.3.93` | EPUB parsing and rendering |
| `ffmpeg-static` ([eugeneware, n.d.](../../references.md#github-com-eugeneware-ffmpeg-static)) | `^5.3.0` | Bundled static ffmpeg binary |
| `fuse.js` ([Fuse.js, n.d.](../../references.md#fusejs-io)) | `^7.5.0` | Fuzzy search |
| `gpt-tokenizer` ([niieani, n.d.](../../references.md#github-com-niieani-gpt-tokenizer)) | `^4.0.0` | Token counting for compile-prompt budgets |
| `hono` ([Hono, n.d.](../../references.md#hono-dev)) | `^4.13.8` | HTTP server framework (ingest) |
| `jszip` | `^3.10.2` | ZIP archive handling |
| `lexical` ([Meta, n.d.-a](../../references.md#lexical-dev)) | `0.50.0` | Rich-text editor core |
| `mermaid` | `^12.0.0` | Mermaid diagram rendering |
| `metascraper` ([metascraper, n.d.](../../references.md#metascraper-js-org)) | `^5.56.2` | Article metadata extraction |
| `metascraper-author` | `^5.56.2` | Author rule |
| `metascraper-date` | `^5.56.2` | Date rule |
| `metascraper-description` | `^5.56.2` | Description rule |
| `metascraper-image` | `^5.56.2` | Image rule |
| `metascraper-logo-favicon` | `^5.56.2` | Logo/favicon rule |
| `metascraper-publisher` | `^5.56.2` | Publisher rule |
| `metascraper-title` | `^5.56.2` | Title rule |
| `metascraper-url` | `^5.56.2` | URL rule |
| `mime-types` ([jshttp, n.d.](../../references.md#github-com-jshttp-mime-types)) | `^3.0.2` | MIME lookups |
| `motion` ([Motion, n.d.-a](../../references.md#motion-dev)) | `^13.3.0` | Animations |
| `onnxruntime-web` ([ONNX Runtime, n.d.-b](../../references.md#onnxruntime-webgpu)) | `1.31.0-dev.20260914-8d85527a0` | WebGPU and threaded WASM inference for sensitive-content classification |
| `p-limit` ([sindresorhus, n.d.-a](../../references.md#github-com-sindresorhus-p-limit)) | `^7.3.2` | Concurrency limiting |
| `pdfjs-dist` | `^6.3.289` | PDF parsing and rendering |
| `pretty-bytes` ([sindresorhus, n.d.-b](../../references.md#github-com-sindresorhus-pretty-bytes)) | `^7.1.3` | Human-readable sizes |
| `pretty-ms` ([sindresorhus, n.d.-c](../../references.md#github-com-sindresorhus-pretty-ms)) | `^9.3.1` | Human-readable durations |
| `react-markdown` | `^10.1.0` | Markdown rendering |
| `remark-gfm` | `^4.0.1` | GitHub Flavored Markdown support |
| `rooks` ([Rooks, n.d.](../../references.md#rooks-vercel-app)) | `^9.9.0` | React hooks collection |
| `sharp` ([sharp, n.d.](../../references.md#sharp-pixelplumbing-com)) | `^0.35.4` | Image processing (native) |
| `sqlite-vec` | `^0.1.9` | SQLite vector search extension |
| `three` | `^0.186.0` | 3D rendering |
| `ulid` ([ulid, n.d.](../../references.md#github-com-ulid-javascript)) | `^3.0.2` | Sortable unique IDs |
| `warcio` ([Webrecorder, n.d.-b](../../references.md#github-com-webrecorder-warcio-js)) | `^2.4.12` | WARC recording for archived pages |
| `which` ([npm, n.d.](../../references.md#github-com-npm-node-which)) | `^7.0.0` | Locate executables on PATH |
| `zod` ([Zod, n.d.](../../references.md#zod-dev)) | `^4.6.5` | Runtime validation |
| `ai` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^7.0.102` | `ToolLoopAgent`, UIMessage streams, and `generateText` in main |
| `@ai-sdk/react` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^4.0.105` | Renderer `useChat` |
| `@ai-sdk/openai` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^4.0.67` | OpenAI BYOK client |
| `@ai-sdk/anthropic` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^4.0.54` | Anthropic BYOK client |
| `@ai-sdk/google` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^4.0.72` | Google BYOK client |
| `@ai-sdk/azure` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^4.0.71` | Azure OpenAI BYOK client |
| `@ai-sdk/xai` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^5.0.0` | xAI BYOK client |
| `@ai-sdk/mistral` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^4.0.44` | Mistral BYOK client |
| `@ai-sdk/groq` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^4.0.42` | Groq BYOK client |
| `@ai-sdk/cohere` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^4.0.42` | Cohere BYOK client |
| `@ai-sdk/togetherai` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^3.0.50` | Together BYOK client |
| `@ai-sdk/fireworks` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^3.0.52` | Fireworks BYOK client |
| `@ai-sdk/deepinfra` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^3.0.49` | DeepInfra BYOK client |
| `@ai-sdk/cerebras` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^3.0.49` | Cerebras BYOK client |
| `@ai-sdk/perplexity` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^4.0.44` | Perplexity BYOK client |
| `@ai-sdk/baseten` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^2.1.27` | Baseten BYOK client |
| `@ai-sdk/deepseek` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^3.0.45` | DeepSeek BYOK client |
| `@ai-sdk/openai-compatible` ([Vercel, n.d.-a](../../references.md#ai-sdk-dev)) | `^3.0.49` | Ollama and LM Studio |
| `@modelcontextprotocol/sdk` ([Model Context Protocol, n.d.-b](../../references.md#modelcontextprotocol-io)) | `^1.30.0` | Pond as a local MCP server |

Plus the workspace packages `@pond/icons`, `@pond/schema`, `@pond/theme`, `@pond/ui`.

Enrichments run on-device. Agent uses a key you paste for an official AI SDK chat provider, stored in `safeStorage`, or a local host you run such as Ollama or LM Studio. Pond does not host a model gateway. Official key pages for Anthropic ([Anthropic, n.d.-b](../../references.md#anthropic-get-api-key)), Gemini ([Google, n.d.-b](../../references.md#google-gemini-api-keys)), and OpenAI ([OpenAI, n.d.-c](../../references.md#openai-api-keys)) document those provider keys. Cloud model metadata is fetched without credentials from the public Vercel AI Gateway catalog (`GET https://ai-gateway.vercel.sh/v1/models`; [Vercel, n.d.-i](../../references.md#vercel-gateway-rest-api)). Gateway models-and-providers documentation ([Vercel, 2026](../../references.md#vercel-gateway-models)) describes that catalog. The catalog supplies names and metadata, while inference continues directly through the configured provider. Pond also speaks MCP over stdio so Cursor and Claude can search this library. Provider logo tiles in `apps/desktop/src/renderer/src/assets/logos/providers` are vendored from `@lobehub/icons-static-avatar` 1.14.0 ([LobeHub, n.d.](../../references.md#github-com-lobehub-lobe-icons)).

Reverse-image search marks in
`apps/desktop/src/renderer/src/assets/logos/reverse-search` identify the
services that receive a search. The Google Lens logo is copied from
[Google (2023)](../../references.md#google-lens-icon). Bing, SauceNAO, TinEye,
and Yandex marks are PNG conversions of each service's official favicon
([Bing, n.d.](../../references.md#bing-favicon);
[SauceNAO, n.d.](../../references.md#saucenao-favicon);
[TinEye, n.d.](../../references.md#tineye-favicon);
[Yandex, n.d.](../../references.md#yandex-favicon)). Google Lens identifies its
logo as public-domain geometry subject to trademark restrictions. Usage terms
for the four official favicons are not recorded; their trademarks remain with
their owners.

### On-device models

- **Sensitive content:** Marqo `nsfw-image-detection-384`
  ([Marqo, 2025b](../../references.md#marqo-nsfw-image-detection-384)), Apache-2.0.
  Pond downloads `onnx/model.onnx` from revision
  `b2d8f0c3abe6e05062288460ecf58e42ea690e84`
  ([Marqo, 2025a](../../references.md#marqo-nsfw-image-detection-384-onnx)).
  The artifact is 22,527,617 bytes with SHA-256
  `7b81155313d894bba3a3b9bace059a6da2a0c509d10cea43fcb0b3c5a4edd26d`.
  Input is batched RGB `384×384`, center-cropped and normalized to `[-1, 1]`;
  output logits are ordered `[NSFW, SFW]`. Pond classifies local images and
  sampled video frames on-device and stores the maximum NSFW confidence.

### Dev dependencies

| Package | Version | Purpose |
|---|---|---|
| `@electron/rebuild` ([Electron, n.d.-d](../../references.md#github-com-electron-rebuild)) | `^4.2.0` | Rebuild native modules for Electron ABI |
| `@tanstack/router-cli` ([TanStack, n.d.-e](../../references.md#tanstack-com-router)) | `1.167.36` | Route tree codegen (`tsr generate`) |
| `@tanstack/router-plugin` ([TanStack, n.d.-e](../../references.md#tanstack-com-router)) | `^1.168.38` | Vite plugin for the route tree |
| `@types/better-sqlite3` | `^9.6.0` | Types |
| `@types/mime-types` | `^3.0.1` | Types |
| `@types/node` / `@types/react` / `@types/react-dom` | `catalog:` | Types |
| `@types/three` | `^0.186.0` | Three.js types |
| `@types/which` | `^3.0.4` | Types |
| `@vitejs/plugin-react` ([vitejs, n.d.](../../references.md#github-com-vitejs-vite-plugin-react)) | `^6.1.1` | React fast refresh for Vite |
| `drizzle-kit` ([Drizzle Team, n.d.-a](../../references.md#orm-drizzle-team-kit-docs-overview)) | `^0.31.10` | Drizzle migrations |
| `electron` ([Electron, n.d.-c](../../references.md#electronjs-org)) | `^44.4.0` | Desktop runtime |
| `electron-builder` ([electron-builder, n.d.-b](../../references.md#electron-build)) | `^26.15.3` | Packaging / distribution |
| `electron-vite` ([electron-vite, n.d.](../../references.md#electron-vite-org)) | `^5.0.0` | Electron + Vite dev/build |
| `jsdom` ([jsdom, n.d.](../../references.md#github-com-jsdom-jsdom)) | `^30.0.1` | DOM environment for renderer tests |
| `react` ([Meta, n.d.-b](../../references.md#react-dev)) / `react-dom` ([Meta, n.d.-b](../../references.md#react-dev)) | `catalog:` | UI library / renderer |
| `replaywebpage` ([Webrecorder, n.d.-a](../../references.md#replayweb-page)) | `^2.5.3` | WARC viewer assets copied into `resources/replay/` |
| `typescript` ([Microsoft, n.d.](../../references.md#typescriptlang-org)) | `catalog:` | Compiler |
| `vite` ([Vite, n.d.](../../references.md#vite-dev)) | `^8.3.0` | Bundler / dev server |
| `vitest` ([Vitest, n.d.-b](../../references.md#vitest-dev)) | `^5.0.1` | Test runner |

Vite `8.3.0` and `@vitejs/plugin-react` `6.1.1` are verified with the desktop
build. A package-scoped pnpm peer rule records electron-vite 5 compatibility
until its declared Vite range catches up.

### Transitive native modules of note (`pnpm-workspace.yaml` build flags)

- `better-sqlite3`, `re2` — pnpm builds disabled; sqlite is rebuilt for the Electron ABI (or resolves prebuilds), `re2` falls back to
  `RegExp`.
- `onnxruntime-node` — ONNX inference backend for Transformers.js.
- `onnxruntime-web` — direct WebGPU and WASM backend for sensitive-content inference.
- `node-abi` — pinned to `4.35.0` so Electron rebuild recognizes Electron 44.
- `sharp`, `protobufjs`, `esbuild`, `electron`, `electron-winstaller`, `ffmpeg-static`, `spawn-sync` — `allowBuilds: true`.

---

## `apps/extension` — Browser extension (WXT)

Captures saves from supported platforms into the local Pond library.

### Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| `@pond/schema` / `@pond/theme` / `@pond/ui` | `workspace:*` | Types / tokens / primitives |
| `@webext-core/messaging` ([webext-core, n.d.](../../references.md#webext-core-aklinker1-io)) | `^4.0.0` | Type-safe extension messaging |
| `border-beam` ([Antalik, n.d.](../../references.md#beam-jakubantalik-com)) | `^1.3.0` | Animated border on the in-page toolbar |
| `react` ([Meta, n.d.-b](../../references.md#react-dev)) / `react-dom` ([Meta, n.d.-b](../../references.md#react-dev)) | `catalog:` | UI library / renderer |
| `zod` ([Zod, n.d.](../../references.md#zod-dev)) | `^4.6.5` | Runtime validation |

### Dev dependencies

| Package | Version | Purpose |
|---|---|---|
| `@types/chrome` | `^0.3.0` | Chrome extension types |
| `@types/node` / `@types/react` / `@types/react-dom` | `catalog:` | Types |
| `@wxt-dev/module-react` ([WXT, n.d.-b](../../references.md#wxt-dev)) | `^1.2.2` | React module for WXT |
| `sharp` ([sharp, n.d.](../../references.md#sharp-pixelplumbing-com)) | `^0.35.4` | Icon generation |
| `typescript` ([Microsoft, n.d.](../../references.md#typescriptlang-org)) | `catalog:` | Compiler |
| `wxt` ([WXT, n.d.-b](../../references.md#wxt-dev)) | `^0.21.4` | Browser extension framework |

Manifest host permissions cover: `x.com`, `twitter.com`, `instagram.com`,
`pinterest.com`, `are.na`, `cosmos.so`, `tiktok.com`, `youtube.com`, plus
`<all_urls>` for generic articles. The extension talks to Pond through native
messaging (`so.pond.host`); a loopback HTTP API on `127.0.0.1:41610` remains
for debugging.

---

## `apps/raycast` — Raycast extension

Searches the active Library, saves URLs, opens Saves, and switches recent
Libraries through Pond's authenticated loopback API.

The Raycast package is the unscoped package `pond`.

### Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| `@pond/local-api` | `workspace:*` | Authenticated loopback client and response validation |
| `@raycast/api` ([Raycast, n.d.-c](../../references.md#developers-raycast-com)) | `^2.4.1` | Commands, native lists and forms, clipboard access, and feedback |
| `react` ([Meta, n.d.-b](../../references.md#react-dev)) | `catalog:` | Command views |
| `zod` ([Zod, n.d.](../../references.md#zod-dev)) | `^4.6.5` | Local API response validation |

Its development stack uses `@raycast/eslint-config` `^2.2.0`, `eslint` `^10.10.0`,
`@types/node` `22.19.17`, `@types/react` `19.0.10`, and TypeScript `6.0.3`.
TypeScript stays pinned because Raycast's lint stack does not yet support the
repository's TypeScript 7 compiler.

---

## `apps/website` — Promotional site (Next.js)

A single, static page that reuses `@pond/ui` tokens.

| Package | Version | Purpose |
|---|---|---|
| `@pond/icons` / `@pond/theme` / `@pond/ui` | `workspace:*` | Icons / tokens / primitives |
| `clsx` ([lukeed, n.d.](../../references.md#github-com-lukeed-clsx)) | `^2.1.1` | Conditional classnames |
| `next` ([Vercel, n.d.-d](../../references.md#nextjs-org)) | `^16.3.5` | React framework |
| `react` ([Meta, n.d.-b](../../references.md#react-dev)) / `react-dom` ([Meta, n.d.-b](../../references.md#react-dev)) | `catalog:` | UI library / renderer |
| `zod` ([Zod, n.d.](../../references.md#zod-dev)) | `^4.6.5` | Runtime validation |
| `@types/*` / `typescript` (dev) | `catalog:` | Types / compiler |

---

## `packages/cli` — Pond CLI

The publishable `@pond/cli` package provides the `pond` executable. It launches
the desktop app when needed and uses the authenticated local API for every
Library operation.

| Package | Version | Purpose |
|---|---|---|
| `@pond/local-api` | `workspace:*` | Local transport and versioned wire schemas |
| `commander` ([Commander.js, 2026](../../references.md#github-com-tj-commander-js-releases-v15-0-0)) | `^15.0.0` | ESM command and option parsing |
| `tsup` (dev) | `^8.5.1` | ESM executable and declaration build |
| `tsx` (dev) | `^4.23.13` | Run the CLI directly from TypeScript |
| `vitest` (dev) | `^5.0.1` | Output, config, and executable contract tests |
| `zod` | `4.6.5` | Structured input validation |

The repository develops the CLI on Node 24. Its published package retains
`node >=22.12` compatibility, which satisfies Commander 15's minimum.

## `packages/local-api` — Local API client

The private source-first package owns environment-independent loopback requests,
response validation, typed failures, and operation preview/run calls. Raycast
and the CLI inject credentials and application-launch behavior. Development
uses the TypeScript catalog and Vitest `^5.0.1`.

---

## `packages/schema` — Shared schema

Drizzle + Zod types shared between the desktop app and the extension.

| Package | Version | Purpose |
|---|---|---|
| `@react-querybuilder/core` ([React Query Builder, n.d.](../../references.md#react-querybuilder-js-org)) | `^8.23.1` | Query-builder model for saved-view filters |
| `drizzle-orm` ([Drizzle Team, n.d.-b](../../references.md#orm-drizzle-team)) | `^0.45.2` | ORM types |
| `zod` ([Zod, n.d.](../../references.md#zod-dev)) | `^4.6.5` | Runtime validation |
| `@types/node` / `typescript` (dev) | `catalog:` | Types / compiler |

---

## `packages/ui` — Headless React primitives

Thin Base UI wrappers styled with CSS Modules; app-agnostic.

| Package | Version | Purpose |
|---|---|---|
| `@base-ui/react` ([MUI, n.d.](../../references.md#base-ui-com)) | `^1.8.0` | Headless primitives |
| `@pond/icons` | `workspace:*` | Icons |
| `@tanstack/react-store` ([TanStack, n.d.-f](../../references.md#tanstack-com-store)) / `@tanstack/store` ([TanStack, n.d.-f](../../references.md#tanstack-com-store)) | `^0.11.1` | Reactive store |
| `@tanstack/react-table` ([TanStack, n.d.-g](../../references.md#tanstack-com-table)) | `^9.2.4` | Headless table |
| `@tanstack/react-virtual` ([TanStack, n.d.-h](../../references.md#tanstack-com-virtual)) | `^3.14.13` | List virtualization |
| `clsx` ([lukeed, n.d.](../../references.md#github-com-lukeed-clsx)) | `^2.1.1` | Conditional classnames |
| `motion` ([Motion, n.d.-a](../../references.md#motion-dev)) | `^13.3.0` | Animations |
| `react-aria` ([Adobe, n.d.-a](../../references.md#react-spectrum-adobe-com-react-aria)) | `^3.52.1` | Accessibility primitives |
| `react-markdown` | `^10.1.0` | Markdown rendering |
| `react-stately` ([Adobe, n.d.-b](../../references.md#react-spectrum-adobe-com-react-stately)) | `^3.50.0` | State hooks for react-aria |
| `remark-gfm` | `4.0.1` | GitHub Flavored Markdown support |
| `react` / `react-dom` (peer) | `catalog:` | UI runtime |
| `@types/react` / `@types/react-dom` / `typescript` (dev) | `catalog:` | Types / compiler |
| `vitest` (dev) | `^5.0.1` | UI package tests |

---

## `packages/icons` — Icon barrel

Re-exports Nucleo UI React packages (`nucleo-ui-fill-*`, `nucleo-ui-outline-*`)
plus social and brand marks. See
[`packages/icons/COPYRIGHT-NOTICE.md`](../../packages/icons/COPYRIGHT-NOTICE.md).

| Asset | Purpose |
|---|---|
| `fill/*`, `outline/*` | Re-exports of `nucleo-ui-fill-*` and `nucleo-ui-outline-*` `^1.5.1` |
| `social-media/custom/*` | Source brand marks, including licensed Nucleo social glyphs |
| `brand/` | Pond mark (`icon.svg`), AI-generated Assistant adaptation (`assistant.tsx`), and Icon Composer colorways in `tints/` |

## `packages/theme` — Design tokens

The runtime `--ds-*` theming engine (colors, motion, radius, size, shadow, typography,
brand, empty) as plain CSS custom properties. Zero dependencies. Color generation
lives in `src/colors/gen.ts`.

---

## External binaries (spawned at runtime / bundled)

| Tool | How it's used | Source |
|---|---|---|
| **yt-dlp** ([yt-dlp, n.d.](../../references.md#github-com-yt-dlp-yt-dlp)) | Video downloads (TikTok / IG Reels / YouTube). Fetched at runtime into `userData`, **not** bundled. | yt-dlp releases |
| **ffmpeg** ([FFmpeg, n.d.](../../references.md#ffmpeg-org)) | Muxes adaptive streams for downloads. Bundled via `ffmpeg-static` and flattened to `bin/ffmpeg` in packaged builds. | `ffmpeg-static` |
| **Electron BrowserWindow** ([Electron, n.d.-b](../../references.md#electronjs-org-docs-latest-api-browser-window)) | Headless "scrape window" pool used by the refresh/harvest pipeline. | Electron |
| **SQLite** (via `better-sqlite3`) | Local index database. | better-sqlite3 |
| **ReplayWeb.page** ([Webrecorder, n.d.-a](../../references.md#replayweb-page)) | In-app viewer for archived pages (WARC). Assets copied from `replaywebpage`. | Webrecorder |

---

## On-device AI models

Inference runs locally via Transformers.js (`@huggingface/transformers`, ONNX
backend). Curated model IDs and revisions are defined in
`apps/desktop/src/shared/on-device-models.ts`. Natural-language search compiles
with the Agent provider you configured in Settings. Weights for on-device
enrichments come from
Hugging Face ([Hugging Face, n.d.-a](../../references.md#huggingface-co)).

### Text embeddings (semantic search)

- `Xenova/all-mpnet-base-v2` ([Xenova, n.d.-b](../../references.md#xenova-all-mpnet-base-v2))

### Image captions and text in images

- `onnx-community/Florence-2-base-ft` ([ONNX Community, n.d.-b](../../references.md#onnx-community-florence-2-base-ft))

### Visual similarity and style labels

- `onnx-community/siglip2-base-patch16-224-ONNX` ([ONNX Community, n.d.-c](../../references.md#onnx-community-siglip2-base-patch16-224-onnx))

### Transcription

- `onnx-community/whisper-base` ([ONNX Community, n.d.-d](../../references.md#onnx-community-whisper-base))

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
- **Raycast extension API ([Raycast, n.d.-c](../../references.md#developers-raycast-com))** —
  powers local Library search, URL capture, Save opening, and recent Library
  switching from Raycast.
- **macOS LaunchServices / UTType** — registers `.pond` as a package bundle.
- **Apple Icon Composer ([Apple, n.d.-b](../../references.md#developer-apple-com-icon-composer))** — Dock
  icon colorways under `packages/icons/brand/tints/`.
- **Apple notarization & code signing** — via env vars `APPLE_ID`,
  `APPLE_ID_PASSWORD`, `APPLE_TEAM_ID`, `CSC_LINK`, `CSC_KEY_PASSWORD`.
- **Distribution targets** — macOS DMG (arm64 + x64), Windows NSIS (x64 + arm64),
  Linux AppImage + deb.

---

## Typography & iconography

- **Inter** ([Andersson, n.d.](../../references.md#rsms-me-inter)) — UI typeface (variable, bundled).
- **JetBrains Mono** ([JetBrains, n.d.-b](../../references.md#jetbrains-com-lp-mono)) — monospace in the
  desktop app, extension, and website.
- **IBM Plex Mono** ([IBM, n.d.](../../references.md#ibm-com-plex)) — fallback `--ds-font-mono` in
  `@pond/theme` before apps override it.
- **Chirp** — Twitter/X typeface, bundled for tweet cards only.
- **Nucleo** ([Nucleo, n.d.](../../references.md#nucleoapp-com)) — UI glyphs via the Nucleo UI React
  packages, re-exported from `@pond/icons` (see `COPYRIGHT-NOTICE.md`).
- **Custom brand marks** — Are.na, Cosmos, Instagram, TikTok, YouTube,
  Pinterest, Threads, Apple, and others in `social-media/custom/`.
  X, GitHub, and Google Chrome use licensed Nucleo social glyphs in the same
  directory. Are.na's marks also referenced
  aredotna/icons ([Are.na, n.d.-b](../../references.md#github-com-aredotna-icons)).

### Brand / source marks

Source brand colors (`packages/theme/src/brand/brand.css`) reference the official
palettes of Twitter/X, Cosmos, Are.na, Facebook, Pinterest, and Dribbble.
