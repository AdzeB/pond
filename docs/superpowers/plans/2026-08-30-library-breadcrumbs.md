# Library breadcrumbs implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace desktop tabs with one navigable breadcrumb and remove all desktop tab commands.

**Architecture:** Keep one memory router per window, moving AppShell inside RootShell so chrome can read the router directly. Derive breadcrumbs from the route, current library navigation, folder ancestors, and save title. Keep existing source management, panes, searches, selection, and scroll restoration.

**Tech Stack:** React, TanStack Router, Electron, CSS modules, Vitest.

---

### Task 1: Single-window navigation

**Files:** `apps/desktop/src/renderer/src/App.tsx`, `components/shell/root-shell.tsx`, `components/shell/chrome-toolbar/history-nav.tsx`, `components/library/page/index.tsx`, `routes/_library/-library-view.tsx` (component paths relative to renderer `src`).

- [x] Replace TabContent with AppContent, initialized once with `useState(() => buildRouter(initialPath()))`. Keep last-path persistence and `syncPrimaryFromPath` in the router resolution subscription. Remove tab-store writes and tab-dependent remounting.
- [x] Put the existing shell around RootShell's outlet:

```tsx
<AppShell.Root header={<Toolbar />} left={<FolderSidebar />} right={<RightPane />}>
  <Outlet />
</AppShell.Root>
```

- [x] Use `useRouter()` in history controls; subscribe to that router's history without an active-tab dependency. Use `${listPath}${listSearch}` as the list restoration key. Publish library view context on its data changes without a tab subscription.

### Task 2: Breadcrumb header

**Files:** renderer `components/shell/toolbar/{index.tsx,styles.module.css,labels.ts,breadcrumbs.ts,breadcrumbs.test.ts,toolbar.test.tsx}`.

- [x] Add a pure builder with `pathname`, `listPath`, `nav`, `folders`, and `saveLabel` inputs. Each result has `label`, `path`, and optional `nav`. Include Library first; append folder ancestors in root-to-leaf order, Uncategorized or tag when relevant, route names for Sources/Downloads/Trash, and the open save title. Track visited folder IDs so malformed cycles terminate.
- [x] Test the builder with real expected paths:

```ts
expect(buildBreadcrumbs({ pathname: "/", listPath: "/", nav: { kind: "all" }, folders: [] }).map(c => c.label)).toEqual(["Library"]);
expect(buildBreadcrumbs({ pathname: "/downloads", listPath: "/", nav: { kind: "folder", id: "missing" }, folders: [] }).map(c => c.label)).toEqual(["Library", "Downloads"]);
```

- [x] Replace the tab strip with `nav[aria-label="Breadcrumb"] > ol`. Parent buttons navigate to their path and library scope; only the final item has `aria-current="page"`. Use muted slash separators and ellipsized single-line labels. Keep the shell's existing columns, control buttons, and draggable blank space. For deep paths, put intermediate ancestors in a menu.
- [x] Test folder-parent clicks, open-save titles, current-item semantics, deep-path menu, absence of tablist/new-tab controls, and back/forward availability.

### Task 3: Remove desktop tab entry points

**Files:** renderer `components/library/new-menu/{index.tsx,options.ts,index.test.tsx,options.test.ts}`, `lib/save/shortcuts.ts`, `lib/ui/save-nav.ts`, `hooks/use-card-actions.ts`; `apps/desktop/src/{main/menu.ts,preload/index.ts,shared/constants.ts}`.

- [x] Delete the New Tab action and shortcut labels. In the native File menu replace the tab commands with `{ role: "close", label: "Close Window", accelerator: "CmdOrCtrl+W" }`.
- [x] Delete tab-only IPC methods/constants, `effects/tab-shortcuts.tsx`, `hooks/use-tab-navigate.ts`, `stores/tabs.ts`, its tests, and toolbar `icons.tsx`. Leave stored tab data untouched; it is no longer read.
- [x] Make `openSave(id)` always use the one router. Middle-click opens in the same view, while Command-click keeps its existing multi-select behavior.
- [x] Update new-menu tests to assert that Tabs and New Tab are absent.
- [x] Run focused tests from `apps/desktop`:

```sh
node node_modules/vitest/vitest.mjs run src/renderer/src/components/shell/toolbar src/renderer/src/components/library/new-menu src/renderer/src/routes/__root.test.ts src/renderer/src/stores/library-chrome.test.ts src/renderer/src/lib/save/shortcuts.test.ts
```

- [x] Run root Biome on changed files, both desktop TypeScript configurations, and `git diff --check`. Report the known unrelated layout Select typing error separately if it remains.
- [x] Render the actual header in the browser with folder/save fixtures at wide and narrow widths. Verify parent navigation and no overflow. Remove the temporary fixture afterward. Do not commit unrelated user changes.

## Verification

- 75 tests passed across 12 focused and regression suites.
- Biome passed for all 26 touched implementation/test files.
- Native TypeScript passed. Renderer TypeScript reports only the existing `components/library/view-menu/layout/index.tsx:18` Select item mismatch.
- Rendered the real toolbar at 1050px and 640px with deep folder paths and a long save title. Verified ancestor-menu navigation and no horizontal overflow.
- Removed both temporary browser fixture files and closed the preview tab.
- Existing persisted tab data was left untouched; no desktop code reads or writes it now.
