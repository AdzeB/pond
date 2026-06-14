# Renderer architecture

The renderer is organized **flat and type-first**: code is grouped by _what it is_
(component, hook, store, helper), not by which product area it belongs to. Domain is
conveyed by **naming convention**, not directory boundaries. Entry/wiring files stay at
the root.

```
renderer/src/
  App.tsx  main.tsx  routeTree.gen.ts  styles.css  assets/   entry — leave in place
  routes/        TanStack Router route tree (codegen-backed; avoid churning structure)
  effects/       cross-cutting bridges that wire main-process events to the UI
  components/    ALL UI. One flat level of domain-named folders, each with an index.tsx
                 (+ its own styles.module.css, constants.ts, and private subcomponents).
  hooks/         ALL React hooks, flat (use-*.ts).
  stores/        ALL TanStack stores, flat (one file per store + its selector hooks).
  lib/           pure helpers, window.pond IPC wrappers, mutations, types, domain logic.
```

## Placement rules (decide where any file goes)

- Exports JSX / a component → `components/<name>/index.tsx`. Companion files
  (`styles.module.css`, `constants.ts`, private subcomponents like `condition-row.tsx`)
  live **inside** that folder and are referenced with relative imports.
- A `new Store(...)` and its colocated selector hooks → `stores/<name>.ts`.
- A standalone React hook not owned by a single store → `hooks/<name>.ts`.
- A pure helper, `window.pond` IPC wrapper, mutation, shared type, or domain
  logic → `lib/<name>.ts`.
- A React context pairs with its consumer cluster as a single file
  (e.g. `components/grid-context.tsx`) or goes to `lib/` if it's standalone.

## Naming convention (the flat namespace)

Domain-prefixed kebab-case so the flat folders sort by area and never collide:

- `save-*` — `save-card`, `save-card-media`, `save-detail-modal`, `save-preview`,
  `save-media-viewer`, `save-presentation`, `save-context-menu`, `save-inspector-kebab`.
- `library-*` — `library-page`, `library-toolbar`, `library-dock`, `library-grid`,
  `library-grid-view`, `library-packed-grid`, `library-waterfall`, `library-justified`,
  `library-list-view`, `library-filter-panel`, `library-saved-views`,
  `library-sync-monitor`, `library-view-menu`, `library-pond-switcher`,
  plus the bare `layout-switcher` and `grid-context`.
- `tag-*` — `tag-picker`, `tag-menu`, `tag-context-menu`, `tag-group-context-menu`.
- `settings-*` — `settings-page`, `settings-sidebar`, `settings-engine`,
  `settings-theme`, `settings-bind-address`, `settings-section-*` (general/appearance/
  schedule/developer/downloads), `settings-tags` (the Tags settings section).
- Shared primitives keep plain names: `confirm-dialog`, `prompt-dialog`, `enum-select`,
  `video-player`.

Hooks, stores, and lib helpers use the same domain prefixes where it adds clarity
(`use-library-state`, `use-save-actions`, `view-store`, `tag-clipboard`, `save-actions`,
`filter-helpers`, `sources-registry`, `settings-*-config`).

## Conventions

- Path alias `@/` → `renderer/src/`. Prefer `@/components/...`, `@/hooks/...`,
  `@/stores/...`, `@/lib/...` over deep relative paths; use relative imports **only**
  for companion files within the same component folder. `@pond/ui`, `@pond/icons`,
  `@pond/schema` are the shared packages.
- State is **TanStack Store** (`@tanstack/store` / `@tanstack/react-store`). IPC goes
  through `window.pond`. Both live in `stores/` and `lib/` respectively.
- Read context with React 19 `use()`, not `useContext()`. No `forwardRef`.
- Prefer context over multi-layer prop/render-prop drilling (see
  `components/grid-context.tsx` for the selection/callbacks pattern).
- Multi-part components export a **compound object** (e.g. `Shell.Body`, `Menu.Item`). A
  family of co-dependent tiny files should be a single folder (see
  `components/save-card-media`). Polymorphic dispatch (one editor per variant behind a
  dispatcher, e.g. `library-view-menu/filter/value-select/bodies/*`) is the exception —
  keep those split.
- Keep files focused; split components past ~400 lines along their natural seams
  (sub-sections, row components, pure helpers) — e.g. `library-filter-panel` →
  `condition-row` + `field-picker`, `library-list-view` → `columns`.

## A note on dependency direction

The old `core/` → `features/` split enforced a one-way dependency arrow. The flat model
trades that structural guarantee for ergonomics: nothing physically prevents a new tangle
(a store importing a component, two components importing each other). Keep imports flowing
**components → hooks → stores/lib** by discipline, and avoid importing a `component` from a
`store` or `lib` file. An ESLint import-cycle rule can backstop this if cycles creep in.

## Verifying changes

From `apps/desktop`: `pnpm typecheck` (fastest signal that import rewrites are complete)
and `pnpm lint`. There are a few known pre-existing `@pond/ui` API type mismatches
(Shell `Aside` side, `Settings.Page` width, Menu link `to`, zoom narrowing) — leave those
unless you're fixing the underlying `@pond/ui` contracts.
