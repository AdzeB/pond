# Renderer architecture

The renderer is organized **flat and type-first**: code is grouped by _what it is_
(component, hook, store, helper), not by which product area it belongs to. Domain is
conveyed by **naming convention**, not directory boundaries. Entry/wiring files stay at
the root. The one exception is `lib/`, which outgrew a single flat level and is grouped
into domain subfolders (see below).

```
renderer/src/
  App.tsx  main.tsx  routeTree.gen.ts  styles.css  assets/   entry — leave in place
  routes/        TanStack Router route tree (codegen-backed; avoid churning structure)
  effects/       cross-cutting bridges that wire main-process events to the UI
  components/    ALL UI. One flat level of domain-named folders, each with an index.tsx
                 (+ styles.module.css and a lib/ for private logic; reused subcomponents
                 get hoisted to their own domain-prefixed folder).
  hooks/         ALL React hooks, flat (use-*.ts).
  stores/        ALL TanStack stores, flat (one file per store + its selector hooks).
  lib/           shared helpers/IPC/mutations/types/domain logic, in domain subfolders
                 (search/ save/ media/ enrichment/ settings/ ui/ util/ + root types.ts).
```

## Placement rules (decide where any file goes)

- Exports JSX / a component → `components/<name>/index.tsx`. Its `styles.module.css` and
  small private subcomponents live **inside** that folder; non-trivial private logic
  (helpers, hooks, menus, fixtures) goes in `components/<name>/lib/`. A subcomponent that
  grows or gets reused is hoisted to its own top-level domain-prefixed folder
  (`tweet-card/body.tsx` → `tweet-card-body/`).
- A `new Store(...)` and its colocated selector hooks → `stores/<name>.ts`.
- A standalone React hook not owned by a single store → `hooks/<name>.ts`.
- A pure helper, `window.pond` IPC wrapper, mutation, shared type, or domain
  logic shared across components → the matching `lib/<domain>/<name>.ts` subfolder. The
  folder carries the domain, so files drop the redundant prefix
  (`save-actions.ts` → `lib/save/actions.ts`, `search-syntax.ts` → `lib/search/syntax.ts`).
  Domains: `search/` (NL query + facets + filters), `save/` (save lifecycle, mutations,
  selection, sync), `media/` (media units, URLs, video frames, transcripts),
  `enrichment/` (on-device ML pipeline, embeddings, model catalogs, inference),
  `settings/` (settings section configs + the engine/section types), `ui/` (motion,
  native menus, view prefs, glyphs, platform), `util/` (framework-free pure helpers).
  Only the cross-domain `Save` types stay at the `lib/` root (`lib/types.ts`).
- A React context pairs with its consumer cluster as a single file
  (e.g. `components/grid-context.tsx`) or goes to `lib/` if it's standalone.

## Naming convention (the flat namespace)

Domain-prefixed kebab-case so the flat folders sort by area and never collide:

- `save-*` — `save-card`, `save-card-media`, `save-detail-modal`, `save-preview`,
  `save-media-viewer`, `save-presentation`, `save-context-menu`, `save-inspector-kebab`.
- `library-*` — `library-page`, `library-toolbar`, `library-dock`, `library-grid`,
  `library-grid-view`, `library-packed-grid`, `library-waterfall`, `library-justified`,
  `library-list-view`, `library-filter-panel`,
  `library-sync-monitor`, `library-view-menu`, `library-switcher`,
  plus the bare `layout-switcher` and `grid-context`.
- `tag-*` — `tag-picker`, `tag-menu`, `tag-context-menu`, `tag-group-context-menu`.
- `settings-*` — `settings-page`, `settings-sidebar`, `settings-engine`,
  `settings-theme`, `settings-bind-address`, `settings-section-*` (general/appearance/
  schedule/developer/downloads), `settings-tags` (the Tags settings section).
- Shared primitives keep plain names: `confirm-dialog`, `prompt-dialog`, `enum-select`,
  `video-player`.

Hooks and stores use the same domain prefixes where it adds clarity (`use-library-state`,
`view-store`, `tag-clipboard`). `lib/` helpers instead live under a domain subfolder that
carries the area (`lib/save/menu.ts`, `lib/search/filter-helpers.ts`,
`lib/save/sources-registry.ts`, `lib/settings/config-*.tsx`).

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

## Design principles

UI work follows the three principles in [`PRINCIPLES.md`](./PRINCIPLES.md) —
**simplicity** (gradual revelation), **fluidity** (seamless, directional transitions),
and **delight** (selective emphasis, per the Delight-Impact Curve). Pull motion from the
shared `--ds-duration-*` / `--ds-easing-*` tokens and the presets in `lib/ui/motion.ts`,
and make sure every animation respects reduced motion.

## Verifying changes

From `apps/desktop`: `pnpm typecheck` (fastest signal that import rewrites are complete)
and `pnpm lint`. There are a few known pre-existing `@pond/ui` API type mismatches
(Shell `Aside` side, `Settings.Page` width, Menu link `to`, zoom narrowing) — leave those
unless you're fixing the underlying `@pond/ui` contracts.
