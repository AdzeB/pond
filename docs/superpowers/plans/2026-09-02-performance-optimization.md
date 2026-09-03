# Pond Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce desktop startup work and package size, preserve scalable library search/filtering, minimize website hydration, and stop unnecessary extension wakeups.

**Architecture:** Keep expensive features behind explicit runtime boundaries: desktop panes and pipeline workers load on demand, migrations run in bounded batches, server-side queries return bounded result sets, and background maintenance runs incrementally. Package and web entrypoints use explicit imports/allowlists so built artifacts contain only code and assets required by that surface.

**Tech Stack:** Electron 42, electron-vite/Vite 8, React 19, TanStack Router/Store, better-sqlite3/Drizzle, Next.js 16, WXT 0.20, TypeScript 7, Vitest 4.

---

### Task 1: Lazy-load desktop right-pane features

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/library/right-pane/index.tsx`
- Test: `apps/desktop/src/renderer/src/components/library/right-pane/right-pane.test.tsx`

- [ ] Add a test asserting the assistant and inspector implementations are absent until their corresponding pane is requested.
- [ ] Replace static imports with `lazy(() => import(...))`, add named default adapters in each target module, and render each portal only after its feature is activated.
- [ ] Run `pnpm --filter @pond/desktop test -- right-pane.test.tsx` and expect all tests to pass.

### Task 2: Bound startup database migrations

**Files:**
- Modify: `apps/desktop/src/main/lib/raw-slim.ts`
- Modify: `apps/desktop/src/main/db.ts`
- Modify: `apps/desktop/src/main/index.ts`
- Create: `apps/desktop/src/main/lib/raw-slim.test.ts`

- [ ] Add tests proving each raw-slim migration batch processes at most 500 rows and reports whether work remains.
- [ ] Replace the unbounded `SELECT ... .all()` with `backfillRawSlimBatch(sqlite, limit)` and schedule later batches with `setImmediate` after the database is available.
- [ ] Start database readiness and window creation in parallel while keeping IPC handlers safe because every query already awaits `getDb()`.
- [ ] Run the raw-slim tests and desktop typecheck.

### Task 3: Keep search/filter hydration bounded

**Files:**
- Modify: `apps/desktop/src/renderer/src/routes/_library/-library-view.tsx`
- Modify: `apps/desktop/src/renderer/src/hooks/use-search-results.ts`
- Modify: `apps/desktop/src/renderer/src/lib/search/fts-client.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves.ts`
- Test: relevant existing search/filter tests plus new focused unit tests where needed.

- [ ] Remove the route-level blanket `hydrateFullPool()` effect; `useFilteredSaves` remains the single authority for non-SQL projections.
- [ ] Pass `limit: 500` into FTS and hydrate at most those returned IDs.
- [ ] Return `total` only on the first saves page and retain the renderer's previous total on later pages.
- [ ] Run desktop search, save-list, and typecheck suites.

### Task 4: Load pipeline workers on demand

**Files:**
- Modify: `apps/desktop/src/main/core/pipeline/reconciler-config.ts`
- Modify: `apps/desktop/src/main/core/pipeline/reconciler.ts`
- Modify: `apps/desktop/src/main/index.ts`
- Test: pipeline reconciler/config tests.

- [ ] Replace the static worker registry with async loader functions such as `() => import("./workers/archive-page")`.
- [ ] Resolve and invoke only the selected operation's worker during dispatch.
- [ ] Dynamically import the reconciler from post-launch initialization and keep shutdown operations behind a small lazy bridge.
- [ ] Build desktop and confirm the heavy worker graph is no longer statically reachable from `out/main/index.js`.

### Task 5: Make enrichment and maintenance incremental

**Files:**
- Modify: `apps/desktop/src/renderer/src/lib/enrichment/sweep.ts`
- Modify: `apps/desktop/src/main/index.ts`

- [ ] Increase the full integrity sweep interval and skip it when the pool has not changed since the prior completed scan.
- [ ] Start maintenance only after the initial renderer pool signals readiness, with a bounded fallback timer for hidden launches.
- [ ] Verify visibility cleanup, timers, and existing enrichment tests.

### Task 6: Slim desktop release payloads

**Files:**
- Modify: `apps/desktop/electron-builder.yml`
- Create: `apps/desktop/scripts/prune-package.cjs`
- Modify: `apps/desktop/package.json`

- [ ] Add explicit package exclusions for icon tint sources, duplicate ffmpeg, unused ONNX WASM variants, non-target ONNX native platforms, source maps/tests/sources, and known large package development trees.
- [ ] Add an `afterPack` pruner that uses Electron Builder context platform/architecture and validates that required native binaries remain.
- [ ] Add a release-size verification script with clear budgets for DMG and installed resources.
- [ ] Build an arm64 package and compare its size with the 438 MiB/925 MiB baseline.

### Task 7: Split the UI package into analyzable exports

**Files:**
- Modify: `packages/ui/package.json`
- Modify: website imports under `apps/website/app/components/**`
- Modify: extension UI imports under `apps/extension/entrypoints/**`

- [ ] Export each component subpath used outside the desktop app, including `./button`, `./input`, `./accordion`, `./tab`, and `./logo`.
- [ ] Replace website and extension root-barrel imports with direct package subpaths.
- [ ] Build website and extension and compare emitted chunks.

### Task 8: Remove static website hydration

**Files:**
- Modify: `apps/website/app/components/_mocks/app-window/index.tsx`
- Modify: `apps/website/app/components/_fragments/link-button.tsx`
- Modify: `apps/website/app/components/faqs/index.tsx`
- Modify: `apps/website/app/components/_fragments/subscribe-form/index.tsx`
- Modify: corresponding CSS modules.

- [ ] Convert the inert app mock to server-rendered native elements without interactive UI primitives.
- [ ] Convert link buttons to styled anchors and FAQs to native `details`/`summary` markup.
- [ ] Keep subscription as the only required client island and replace client Zod parsing with a narrow structural check.
- [ ] Build the website and confirm the page-specific client chunk shrinks materially from 762 KiB.

### Task 9: Stop extension service-worker churn

**Files:**
- Create: `apps/extension/utils/session-push.ts`
- Modify: `apps/extension/entrypoints/background.ts`
- Create: `apps/extension/utils/session-push.test.ts`

- [ ] Add pure tests for persisted pending state, cooldown, and exponential backoff.
- [ ] Register all listeners synchronously, but gate native probing through persisted `storage.session` state and a minimum probe interval.
- [ ] Create the retry alarm only while a session is pending or a recent explicit connection attempt is active; clear it after success/no-pending.
- [ ] Build and typecheck the extension.

### Task 10: Add performance budgets and final verification

**Files:**
- Create: `apps/desktop/scripts/check-performance-budgets.mjs`
- Modify: `apps/desktop/package.json`
- Modify: root `package.json`

- [ ] Check renderer startup references, main static reachability, extension service-worker size, website page chunk size, and packaged DMG/resources when present.
- [ ] Run targeted tests, all three typechecks, and all three production builds.
- [ ] Record before/after measurements in the implementation handoff and leave unrelated working-tree changes untouched.
