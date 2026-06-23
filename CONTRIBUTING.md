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
  // Optional — only if the source can sync a saved list. Omit for
  // capture-only sources (defaults to no list sync).
  sync: { strategy: "scroll" }, // "cursor" | "scroll" | "full" | "none"
}
```

Adding an entry automatically widens the `Source` union (`@pond/schema/db`) and
re-derives `sourceLabel` / `isSource` / `hostToSource` (`@pond/schema/sources`).
The descriptor is the **only** place these cross-runtime facts are defined.

#### Sync + rate limiting (account safety)

If the source can sync a user's saved list, declare `sync` on the descriptor.
`strategy` tells the sync engine how the list is walked so it can **stop early**
once it reaches items you already have:

- `cursor` — API pagination with a cursor (newest-first); early-stops on known ids.
- `scroll` — DOM infinite-scroll (newest-first); early-stops on known ids.
- `full` — no reliable ordering; must walk everything (use sparingly).
- `none` — no list sync (the default; capture-only).

You almost never need to set `rate`. Every source inherits a conservative,
account-safe profile (`DEFAULT_RATE_PROFILE`: ~1 request / 1.5s, ≤60/min, paced
2× slower on the first full sync). The rate **governor**
(`apps/desktop/src/main/core/pipeline/rate-governor.ts`) enforces this for both
list harvest and pipeline ingest, respects platform rate-limit headers, and
persists cooldowns across restarts. Only override `rate` (e.g.
`rate: { minDelayMs: 2500, maxPerWindow: 30 }`) when a platform is unusually
strict — and always err slower. The governing rule is **it is always better to
sync slowly than to risk a user's account.** Use `syncConfigFor(id)` to read the
resolved config; never read `descriptor.sync` directly.

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
  source supports syncing a user's saved list. Set `sync: { strategy }` on the
  descriptor (see "Sync + rate limiting" above) so the engine early-stops and
  the governor paces requests safely.
- **Extension capture**: entrypoints under `apps/extension/sources/` if the
  browser extension should capture this source directly.

> **A note on responsibility.** Pond's source adapters run entirely through the
> user's own authenticated browser session on their own machine — there are no
> Pond-operated scraping servers and no credentials leave the device. The rate
> governor exists to respect each platform's limits. When adding a source, keep
> the conservative pacing and remember that users are responsible for their own
> use under each platform's terms of service. See the
> [README "How sourcing works"](README.md#how-sourcing-works-and-your-responsibility)
> note for the user-facing version of this boundary, and
> [`core/sync/README.md`](apps/desktop/src/main/core/sync/README.md) +
> [`core/refresh/README.md`](apps/desktop/src/main/core/refresh/README.md) for
> how the governor, watermark cursors, and ingest path fit together.
