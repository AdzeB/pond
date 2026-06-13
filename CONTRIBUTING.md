# Contributing

## Add a source

Pond is designed so that adding a new source (a site Pond can capture saves
from) is essentially **one extractor file plus one descriptor line**. Almost
everything else is either derived from the descriptor or forced by the
TypeScript compiler, so you cannot ship a half-wired source by accident.

The model is borrowed from [yt-dlp](https://github.com/yt-dlp/yt-dlp): a
source's URL matching, auth, and extraction logic live together, and embedded
tests travel with the code.

### TL;DR

```bash
pnpm new-source <id>   # e.g. pnpm new-source vimeo
# fill in the generated descriptor + extractor
pnpm test              # offline tests
pnpm generate          # refresh docs/supported-sources.md
pnpm typecheck         # fix every error the compiler points at
```

### 1. The descriptor (cross-runtime, the single source of truth)

`packages/schema/src/sources/registry.ts` holds one `SOURCE_DESCRIPTORS` entry
per external source:

```ts
{
  id: "vimeo",                 // stable id; also the value stored in the DB
  label: "Vimeo",              // human-facing name
  hosts: ["vimeo.com"],        // apex hosts (matched directly or as a suffix)
  urlPatterns: [/.../],        // patterns identifying a saveable item URL
}
```

Adding an entry automatically widens the `Source` union (`@pond/schema/db`) and
re-derives `sourceLabel` / `isSource` / `hostToSource` (`@pond/schema/sources`).
The descriptor is the **only** place these cross-runtime facts are defined.

### 2. The extractor (main-process, where the logic lives)

`apps/desktop/src/main/core/pipeline/extractors/sources/<id>.ts` implements the
`Extractor` interface. It co-locates everything specific to the source:

- `validUrl` — read from `descriptorFor("<id>").urlPatterns`
- `cookieDomain` — the leading-dot cookie domain that gates scraping
- `authCookies(name)` — which cookie name(s) prove a signed-in session
- `handleFromPath(segments)` — optional, parse an account handle from a profile
  URL (only for sources with account/list sync)
- `probeExpression` — optional, in-page JS that returns the signed-in handle
- `tests` — embedded test cases (yt-dlp `_TESTS` style)
- `suitable(url)` and `extract(input)` — the matcher and the extraction itself

### 3. Register it (one typed line)

Add the instance to `EXTRACTORS` in
`apps/desktop/src/main/core/pipeline/extractors/index.ts`. The record is
`satisfies Record<ExternalSource, Extractor>`, so a missing source is a compile
error. (`pnpm new-source` does this for you.)

### 4. Fill the compiler-forced registries

Because several registries are total `Record<Source, …>`, the compiler will
list exactly what's missing after you add the source. Fill each:

| File | What to add |
| --- | --- |
| `apps/desktop/src/renderer/src/features/sources/registry.ts` | `SOURCE_ICONS` — a brand icon (add the SVG to `@pond/icons` first) |
| `apps/desktop/src/main/core/pipeline/specs.ts` | `CAPTURE_EXPECTATIONS` — required/recommended capture fields |
| `apps/desktop/src/main/core/refresh/harvest/index.ts` | `REGISTRY` — a `Harvester` (copy the throwing `local` entry if the source has no list sync) |
| `apps/desktop/src/main/core/refresh/scrape-window/pool.ts` | `PER_SOURCE_CAP` — concurrent scrape-window cap |
| `apps/desktop/src/main/core/sync/index.ts` | `SYNC_WATCHDOG_MS` — per-source sync watchdog timeout |

### 5. Tests

Offline tests (`pnpm test`) run a generic harness over every extractor's
embedded `tests`: URL routing, `source_id` parsing, and `handleFromPath`
parsing, plus registry/descriptor totality. They gate PR CI.

Live checks (`pnpm test:live`) hit the network to confirm each sample URL is
still reachable. They are flaky/auth-walled, so they run on a nightly schedule
(`.github/workflows/sources-live.yml`), not on PRs.

### 6. Docs

`pnpm generate` rewrites [`docs/supported-sources.md`](docs/supported-sources.md)
from the descriptors. CI runs `pnpm generate && git diff --exit-code`, so a
forgotten regenerate is a red build — never hand-edit that file.

### 7. Optional extras

- **List sync / harvest**: a real `core/refresh/harvest/<id>/` adapter if the
  source supports syncing a user's saved list.
- **Extension capture**: entrypoints under `apps/extension/sources/` if the
  browser extension should capture this source directly.
