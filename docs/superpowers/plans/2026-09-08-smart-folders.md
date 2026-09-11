# Smart Folders Implementation Plan

> **For agentic workers:** Implement task by task, with persistence delegated independently and renderer integration handled in this task. Preserve existing working changes. The user has authorized implementation.

**Goal:** Offer New Smart Folder, New Group, and New Saved View under one Smart Folders sidebar section.

**Architecture:** Extend the existing saved view records with a kind and optional parent group. Main owns hierarchy validation and transactional mutations. Library state owns selection and editable filters; parent filters are composed separately so editing a child never overwrites its ancestors.

**Tech Stack:** React, TanStack Store, shared Pond UI, Drizzle, SQLite, Vitest.

---

### Task 1: Persistence and compatibility

Files: `packages/schema/src/db.ts`, `apps/desktop/src/main/db.ts`, `apps/desktop/src/main/db.test.ts`, `apps/desktop/src/main/core/saved-views.ts`, `apps/desktop/src/main/ipc/queries/saved-views.ts`, `apps/desktop/src/shared/query-contracts.ts`.

- [x] Add `kind: "saved_view" | "smart_folder" | "group"` (default `saved_view`) and `parentId: string | null` (default null). Migrate existing records in place.
- [x] Validate parent groups on creation and moves. Reject self/descendant cycles. Delete a group and promote direct children in one transaction.
- [x] Test legacy migration, reinitialization, invalid parents, cycles, and child preservation using temporary databases.

### Task 2: Selection and filter inheritance

Files: `apps/desktop/src/renderer/src/features/library/state/saved-views.ts`, `apps/desktop/src/renderer/src/features/library/state/view-store.ts`, new `apps/desktop/src/renderer/src/features/library/lib/smart-folders.ts` and colocated tests, library filtering hooks.

- [x] Compose effective filters as `{ combinator: "and", rules: [ancestorQuery, ownQuery] }`, retaining nested AND/OR semantics. Keep editable local filters separate from inherited conditions.
- [x] Smart folders/groups restore only filters. Saved views restore filters, sort key/direction, and layout. Selecting any entry clears transient text/semantic/visual searches.
- [x] Creation captures current filters, plus presentation for saved views. Group child creation starts with no local filters. Updating an active entry saves only local conditions; moving updates inherited scope. Deleted active entries reset selection.
- [x] Test inheritance, presentation differences, filter editing, and selection reset.

### Task 3: Sidebar and operations

Files: new `apps/desktop/src/renderer/src/features/library/components/smart-folders/` component and styles; existing folder sidebar and its tests.

- [x] Replace Saved Views with a collapsible Smart Folders section. Its plus/context menu offers all three creation actions with distinct icons.
- [x] Render groups recursively with disclosure controls and child creation. Provide rename, save current filters/view, move to group/root, and delete actions.
- [x] Use shared menus/dialogs/sidebar controls for focus, keyboard handling, transitions and error feedback. Highlight only the active destination.
- [x] Verify creation menus, nested selection/collapse, rename/delete, and all three entry types through real component interactions.

### Task 4: Documentation and verification

- [x] Add glossary entries in `CONTEXT.md` and describe ownership/inheritance in `docs/contributing/architecture.md`.
- [x] Run focused Vitest coverage, then `pnpm check` and `pnpm build`. Run `ELECTRON_RUN_AS_NODE=1 pnpm --filter @pond/desktop exec electron node_modules/vitest/vitest.mjs run src/main/db.test.ts` for native migration tests.
- [x] Inspect the rendered sidebar in an isolated development preview. Report any unrelated failures without overwriting existing work.


## Validation results

- 70 focused renderer tests passed, including sidebar creation, child filtering, saved view presentation, search and toolbar regression coverage.
- 11 Electron native database/hierarchy tests passed, including migration, cycles, concurrent mutations and rollback.
- Architecture checks and changed-file Biome/Oxlint passed.
- Browser preview verified the three creation actions, nested sidebar layout, distinct icons and saved view creation using isolated fixtures. Temporary preview files and server were removed afterward.
- Full `pnpm check` reaches existing Oxlint failures in shadows, source tests, Cosmos and search fields. Separate Knip and renderer type checks also report existing unrelated failures.
- Full offline suite: 1,664 tests passed; 8 failed in HEIC decoding, native socket permission tests, and source menus; 30 skipped. Focused coverage was rerun after final feature changes.
- `pnpm build` is blocked by the pre-existing unexported `@pond/theme/shadow/shadow.css` import. No unrelated code was changed to bypass these checks.
