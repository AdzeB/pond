# Library filter menu implementation plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. Continue inline in the current task.

**Goal:** Add a discoverable Filter button to the library toolbar, with nested choices that update the existing search query.

**Architecture:** Reuse Pond's Menu components, field metadata, live facets, and filter predicates. Combine choices within a category and intersect categories. Keep the Lexical search editor synchronized with external filter changes without moving focus away from the menu.

**Tech Stack:** React, Base UI menus, TanStack Store, Lexical, CSS modules, Vitest.

### Tasks

- [x] Add `components/library/filter-menu/selection.ts` and behavior tests for combining types, removing selections, replacing date ranges, and preserving other filters. Confirm the resulting predicates match saves and survive search serialization.
- [x] Add `options.ts` for field presets and current library tags, folders, sources, creators, and accounts. Use folder IDs as values and folder names as labels.
- [x] Add `index.tsx`, `custom-filter.tsx`, and `styles.module.css` for nested checkbox menus, searchable long lists, custom numeric/date/color controls, active counts, and clearing.
- [x] Insert `<FilterMenu />` before the view controls in `components/library/chrome/index.tsx`.
- [x] Replace one-time search seeding with guarded synchronization in `components/search/bar/index.tsx`. Use Lexical's selection-skip tag and ignore tagged external updates in the store listener.
- [x] Run focused Vitest tests, `pnpm exec tsc --noEmit -p apps/desktop/tsconfig.web.json`, and Biome on touched files. Inspect the rendered menu and verify keyboard use, multiple selections, clearing, and search synchronization.

No backend or database changes are needed. Existing unrelated workspace changes remain untouched.

### Verification

- 23 tests pass across filter selection, custom controls, search editor synchronization, and existing search compilation.
- Renderer TypeScript check and Biome checks pass.
- Inspected the toolbar and dropdown in running Pond. Verified keyboard submenu navigation, checked choices, search updates, and clearing.
- Later native screen captures were intermittent; custom date-range and duration behavior was verified with component tests.
