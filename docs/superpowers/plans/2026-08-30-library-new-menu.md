# Library new menu implementation plan

> **For agentic workers:** Implement task-by-task in the current session, preserving the existing worktree changes.

**Goal:** Make the sidebar plus a searchable entry point for Pond's supported creation and import operations.

**Architecture:** A library `new-menu` owns the action catalog and dialogs. Existing source flows, folder/tag queries, and import queries remain the source of behavior. A native import picker adds file/folder selection without exposing filesystem access to the renderer.

**Tech Stack:** React, Pond UI Menu/Dialog/Field, CSS Modules, Electron query bridge, Vitest.

---

### Task 1: Action catalog and search

- [ ] Add `apps/desktop/src/renderer/src/components/library/new-menu/options.ts` and `options.test.ts`.
- [ ] Cover New Folder, New Tag, New Tag Group, New Note, Import Files, Import Folders, Import from Links, Import from Clipboard, Import Eagle Library, Connect Source, Watch Account, and New Tab.
- [ ] Match normalized search terms against labels, group names, and keywords. Omit empty groups. Test case-insensitive matching, multiple terms, empty queries, and missing results.

### Task 2: Native picker and action handlers

- [ ] Add `apps/desktop/src/main/ipc/queries/import-picker.ts` and `import-picker.test.ts`. Choose file or directory mode from a validated kind. Return an empty path list on cancellation.
- [ ] Register `saves.pickImportPaths` in `saves-import.ts`, leaving explicit-path imports unchanged.
- [ ] Add renderer `new-menu/actions.ts` and `actions.test.ts`. Reuse current queries, refresh folders, surface failures, and summarize imports. Validate link input before queuing. Do not import anything while opening the menu.

### Task 3: Searchable menu and forms

- [ ] Add `new-menu/index.tsx` and `styles.module.css`, using Pond Menu primitives, icons, separators, autofocus search, bounded scrolling, and a no-results state.
- [ ] Add `new-menu/save-dialog/index.tsx` and `styles.module.css` for multiline notes and links, with pending/error states and duplicate-submit protection.
- [ ] Replace only the workspace header plus in `folder-sidebar/index.tsx`. Reuse the folder creation helper for its existing folder and subfolder actions. Keep the tab-strip plus unchanged.
- [ ] Use existing shortcut metadata for New Tab. Do not claim unimplemented shortcuts or unsupported Eagle document formats.

### Task 4: Verification

- [ ] Run `pnpm --filter @pond/desktop exec vitest run src/renderer/src/components/library/new-menu src/main/ipc/queries/import-picker.test.ts`.
- [ ] Run desktop TypeScript checks and Biome against changed code only. Distinguish unrelated worktree failures.
- [ ] Inspect the rendered menu and exercise search, keyboard navigation, dismissal, and dialog opening when the local app is available. Do not create content in the user's library during verification.

No commits or unrelated cleanup are included in this change.
