# Eagle-Inspired Features: Overview & Roadmap

> **For agentic workers:** This is the parent index for nine sibling plans. Each
> sibling is independently shippable. Implement one plan at a time with the
> `executing-plans` skill. Steps in the sibling plans use checkbox (`- [ ]`)
> syntax for tracking.

**Goal:** Add nine Eagle-inspired capabilities to Pond without changing its
identity as a local-first archive of things you save across the web.

**Source:** Derived from a scan of all 144 articles under
`eagle.cool/support/desktop`, filtered for fit against Pond's positioning. The
gap analysis canvas lives outside the repo (Cursor canvas
`eagle-pond-feature-gaps`).

---

## Scope

In scope (one plan each):

1. **Manual capture + local file import** (`2026-05-31-manual-capture-local-import.md`)
2. **Notes / annotations UI** (`2026-05-31-notes-annotations.md`)
3. **Duplicate + similar detection** (`2026-05-31-duplicate-similar-detection.md`)
4. **Rule-based auto-tagging** (`2026-05-31-rule-based-auto-tagging.md`)
5. **Smart folders + Quick Access** (`2026-05-31-smart-folders-quick-access.md`)
6. **Color / palette search** (`2026-05-31-color-palette-search.md`)
7. **Single-key categorize overlay** (`2026-05-31-categorize-overlay.md`)
8. **Timestamped video notes** (`2026-05-31-video-notes.md`)
9. **Bulk + CSV export** (`2026-05-31-bulk-csv-export.md`)

Explicitly out of scope: star ratings, one-click "Action" macros, folder
hierarchies, font/audio libraries, cloud library sync, plugin ecosystem.

## Recommended build order

Foundational first, because later plans reuse the primitives:

1. Manual capture + local import (introduces a non-URL save origin; notes/export touch the same surfaces)
2. Notes / annotations UI (smallest; reused by categorize overlay and video notes)
3. Smart folders + Quick Access (introduces a new persisted entity + sidebar group)
4. Rule-based auto-tagging (reuses the finalize hook + settings pattern)
5. Duplicate + similar detection (new pipeline op + scan view)
6. Categorize overlay (reuses tag picker + selection)
7. Bulk + CSV export (reuses selection + bulk-action-bar + path resolver)
8. Video notes (reuses notes persistence pattern + video player)
9. Color / palette search (largest; adds the `sharp` dependency + a filter field)

Each plan is self-contained; this order only minimizes rework.

---

## Shared conventions (read once, applies to every plan)

These are repeated in each plan's "Tech Stack" line by reference. They are
**conventions and commands**, not code, so referencing them here is not a
placeholder.

### Verification (no test runner)

This repo has **no test framework** (confirmed: no `test` script, no
`vitest`/`jest`, no `*.test.ts`). The established plan convention
(see `docs/plans/2026-05-27-*.md`) is:

- **Typecheck:** `pnpm --filter @pond/desktop typecheck` (runs
  `tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json`)
  and `pnpm --filter @pond/schema typecheck` when schema changes.
- **Lint:** `pnpm lint:check` (Biome CI) from the repo root, or
  `pnpm lint` to auto-fix.
- **Manual smoke:** `pnpm --filter @pond/desktop dev` and follow the explicit
  manual QA steps in each task.

Every task's verify step uses these. When a task only changes
`packages/schema`, run the schema typecheck too because the desktop app
imports it.

### Adding a DB column or table (the actual workflow here)

There are **no checked-in SQL migration files**. Schema is applied
programmatically on every boot in `apps/desktop/src/main/db.ts` via the
`migrate(sqlite)` function. To add a column or table:

1. **Edit the Drizzle schema** in `packages/schema/src/db.ts` (types + ORM
   columns). This is the source of truth for query types.
2. **Add a `CREATE TABLE IF NOT EXISTS`** for new tables in `migrate()` in
   `apps/desktop/src/main/db.ts`, OR for a new column add a forward-only,
   idempotent helper following `ensureSavesPipelineColumns`:

```ts
function ensureSavesColorColumns(sqlite: Database.Database): void {
  const cols = sqlite
    .prepare<unknown[], { name: string }>("PRAGMA table_info(saves)")
    .all() as { name: string }[];
  const have = new Set(cols.map((c) => c.name));
  if (!have.has("dominant_colors")) {
    sqlite.exec("ALTER TABLE saves ADD COLUMN dominant_colors TEXT");
  }
}
```

3. **Call the helper** inside `migrate()` after the `CREATE TABLE` block.
4. New columns that should appear on disk go through `info.json` (see
   `apps/desktop/src/main/lib/library-format.ts` `infoDocFromSave`).

`db:generate` / `db:push` scripts exist but are **not** the runtime path; do
not rely on them.

### Mutating data (disk + index + sync + undo)

Two paths, both ending in `executeTransaction` (`apps/desktop/src/main/core/executor.ts`):

- **Undoable, renderer-initiated:** build a `Transaction` (shape in
  `packages/schema/src/tx.ts`) and call `window.pond.tx(tx)` /
  `window.pond.batch(txs)`. The `IPC.tx` handler calls `recordForUndo`.
- **Query handlers / core modules:** call `executeTransaction(tx)` directly
  (e.g. `setSaveTags` in `apps/desktop/src/main/core/tags.ts`). These write
  `sync_actions` and broadcast to the renderer but do **not** enter the undo
  stack.
- **Pipeline workers:** use `applySavePatch`
  (`apps/desktop/src/main/core/pipeline/workers/apply.ts`) which writes DB +
  `sync_actions` + on-disk files + broadcast, `actor: "system"`.

A `tx` `update` for a save: `{ kind: "update", model: "save", id, patch:
Partial<NewSave>, before: Partial<NewSave>, meta: { actor, actorReason } }`.

### IPC (renderer <-> main)

- **Queries:** add a handler keyed `"domain.action"` to a `QueryHandlerMap`
  (e.g. `apps/desktop/src/main/ipc/queries/saves.ts`), then call from the
  renderer with `await window.pond.query("domain.action", params)`. The
  registry is merged in `apps/desktop/src/main/ipc/queries/index.ts`.
- **Mutations with undo:** `window.pond.tx` / `window.pond.batch`.
- The preload bridge types live in `apps/desktop/src/preload/index.ts`
  (`PondApi`). Adding a new query name needs no preload change (the `query`
  method is generic over the string name).

### Renderer state (the "pool")

Saves live in a TanStack Store (`apps/desktop/src/renderer/src/pool/pool.ts`),
hydrated from `saves.list` and updated via `window.pond.onSyncAction`. Read
with `useSaves()` / `useSave(id)` (`pool/hooks.ts`). Selection lives in
`pool/selection.ts` (`useSelectedIds`, `primarySelection`). Filters apply in
memory via `matches()` (`packages/schema/src/filters/match.ts`) inside
`pool/use-filtered-saves.ts`. Prefs via `usePrefs(section)` (`pool/prefs.ts`).

### Commit discipline

Commit after each task (conventional commits, the repo uses commitlint). Never
`--amend` a pushed or non-self-authored commit. Keep commits scoped to one
task.

### House rules (from `AGENTS.md`)

- Comments: default to none; only explain non-obvious *why*. Never narrate.
- No em dashes anywhere (code, copy, docs, commits). Use commas/colons/periods.
- CSS class names are kebab-case; one `*.module.css` per component, owned by
  exactly one consumer.

---

## Cross-cutting risks

- **`SOURCES` is a fixed enum** (`packages/schema/src/db.ts`). Manual/local
  saves need a new source value (`"local"`). That value ripples into source
  presets, sync (must be excluded), and extractor planning. The manual-import
  plan handles this explicitly; later plans assume `"local"` exists.
- **`saves.source + saves.sourceId` is UNIQUE.** Manual saves must mint a
  unique `sourceId` (use a `ulid()` or content hash).
- **`coverIndex`** selects the primary file when a save has multiple files.
  Export and color extraction default to `coverIndex ?? 0`.
- **`sharp` is not yet a dependency** and needs native rebuild in Electron
  (there is a `scripts/rebuild-native.mjs`). Only the color-search plan adds it.
