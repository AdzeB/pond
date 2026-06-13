# Renderer architecture

The renderer is organized into **`core/`** (shared, app-wide foundations) and
**`features/`** (cohesive product slices). Entry/wiring files stay at the root.

```
renderer/src/
  App.tsx  main.tsx  routeTree.gen.ts  styles.css  assets/   entry — leave in place
  routes/        TanStack Router route tree (codegen-backed; avoid churning structure)
  effects/       cross-cutting bridges that wire main-process events to the UI
  core/
    data/        the bottom data layer (TanStack Store + window.pond IPC). Depends on
                 nothing app-level. Stores, hooks, snapshots, mutations, pool, prefs, theme.
    ui/          shared presentational primitives: confirm-dialog, prompt-dialog, enum-select
    lib/         shared, domain-free helpers: format, initials, motion, platform,
                 search-schemas, use-stable-array, zoom
  features/
    library/     grid/list/justified/waterfall views, layout-switcher, save-card, toolbar,
                 filter-panel, inspector, saved-views, card-thumb, sidebar, view menus, plus its
                 own stores/ hooks/ lib/
    sources/     sources registry, sidebar-sources, source menus, customize-sources dialog,
                 visibility select
    save/        detail, preview, presentation, save-context menu, categorize + quick-capture
                 dialogs, save-actions, card actions, stores/
    media/       video-player: a thin skin that composes the @pond/ui `Video`
                 compound component (Root/Media/Controls/parts), plus a chapters-vtt helper
    tags/        tag menus (tag-context, tag-group-context, tag-menu), tag-picker,
                 tag-clipboard store, the Tags settings section
    settings/    engine, registry, sections.tsx + sections/*, theme + bind-address selects,
                 sync-helpers, settings sidebar + page shell
```

## Dependency direction (enforce this)

```
routes ──▶ features ──▶ core/ui ──▶ core/data
                   └──▶ core/lib ──▶ (nothing app-level)
                   └──▶ core/data
effects ──▶ core/data, features
```

- `features/*` may import `core/*` freely.
- `core/data` imports **nothing** app-level. `core/ui` / `core/lib` stay domain-free.
- Features may import a **sibling feature only at the leaf** (e.g. `save → media`,
  `library → sources`, `tags → library` for navigation). Never create cycles.
- No upward imports: `core` must never reach into `features`.

## Conventions

- Path alias `@/` → `renderer/src/`. Prefer `@/core/...` / `@/features/...` over deep
  relative paths. `@pond/ui`, `@pond/icons`, `@pond/schema` are the shared packages.
- A feature owns its own `stores/`, `hooks/`, `lib/`, and `menus/` — colocate them inside
  the feature rather than in a global bucket.
- State is **TanStack Store** (`@tanstack/store` / `@tanstack/react-store`). IPC goes through
  `window.pond`. Both live behind `core/data`.
- Read context with React 19 `use()`, not `useContext()`. No `forwardRef`.
- Prefer context over multi-layer prop/render-prop drilling (see `library/grid-context.tsx`
  for the selection/callbacks pattern that replaced `renderCard` + `multiSelect` drilling).
- Multi-part components export a **compound object** (e.g. `Shell.Body`, `Menu.Item`). A
  family of co-dependent tiny files should be a single module (see `library/card-thumb`).
  Polymorphic dispatch (one editor per variant behind a dispatcher, e.g. the filter
  `value-select/bodies/*`) is the exception — keep those split.
- Keep files focused; split components past ~400 lines along their natural seams
  (sub-sections, row components, pure helpers).

## Verifying changes

From `apps/desktop`: `pnpm typecheck` (fastest signal that import rewrites are complete)
and `pnpm lint`. There are a few known pre-existing `@pond/ui` API type mismatches
(Shell `Aside` side, `Settings.Page` width, Menu link `to`, zoom narrowing) — leave those
unless you're fixing the underlying `@pond/ui` contracts.
