# Agent and inspector panes implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap Agent and Details independently in the right pane without closing the active save or losing chat state.

**Architecture:** Keep a single resizable right-hand slot, but give it an explicit `agent | inspector | null` mode. Navigation selects the inspector for each newly opened save and restores the library's Agent preference on exit. Keep the Agent mounted so drafts and streaming subscriptions survive pane switches.

**Tech Stack:** React, TanStack Store, Electron renderer, Vitest.

This change builds on the current uncommitted desktop work. Do not commit unrelated changes or change the working branch. Execute inline because the requested result is an update to the current running app.

### Task 1: Separate pane state

**Files:** `apps/desktop/src/renderer/src/stores/library-chrome.ts`, `apps/desktop/src/renderer/src/stores/library-chrome.test.ts`, `apps/desktop/src/renderer/src/lib/ui/save-nav.ts`

- [x] Add regression coverage for opening saves, toggling Agent over Details, returning from chat, closing the pane independently, reopening it, changing saves, and restoring the saved library preference.
- [x] Run `pnpm --filter @pond/desktop exec vitest run src/renderer/src/stores/library-chrome.test.ts`. The first run exposed a test-environment storage issue; stub storage using the existing test pattern before checking behavior.
- [x] Add `rightPane: "agent" | "inspector" | null` and `inspectorSaveId: string | null` to the chrome store. Expose `inspectSave`, `toggleInspector`, `closeRightPane`, `toggleRightPane`, `useRightPane`, and `useInspectorSaveId`. Make `useAgentOpen` describe the visible Agent, not the slot.
- [x] Synchronize navigation using `libraryChrome.inspectSave(id)` in `syncPrimaryFromPath`. Opening a new save selects Details; resolving the same save does not override an explicit pane selection.

### Task 2: Wire independent views and controls

**Files:** `apps/desktop/src/renderer/src/App.tsx`, `components/library/right-pane/index.tsx`, `components/library/agent-toggle/index.tsx`, `components/library/agent-pane/index.tsx`, `components/save/detail/pane/index.tsx`, `components/save/detail/page/index.tsx`, `components/shell/app-shell/index.tsx`, `components/shell/toolbar/index.tsx`, `stores/shell-state.ts`, `effects/app-hotkeys.tsx` (all component/store/effect paths under `apps/desktop/src/renderer/src`).

- [x] Let `RightPane` read the selected mode and inspected save. Keep chat in its existing hidden/inert container; preserve inspector state using React Activity and key each save independently.
- [x] Let the shell's open state and resize label follow the active pane. Collapse the slot with `closeRightPane`, not `toggleAgent`.
- [x] Keep the right-sidebar glyph for Details and use the existing chat glyph for Agent. Display the Details control when a save is open. Both buttons report their own pressed state.
- [x] Add a Close Agent action that returns to Details. Change the Details close action to hide only its pane. Remove the save page effect that forces Agent open.
- [x] Use slot visibility in grid-width prediction and the combined columns shortcut.

### Task 3: Verify

- [x] Run the new tests and existing shell, tab, layout-transition, and window-track regression tests. All 15 pass.
- [x] Run `pnpm --filter @pond/desktop typecheck` and targeted Biome checks. Typecheck and error-level lint pass; existing shortcut non-null assertion warnings remain unchanged.
- [x] In the running Pond app, open a save, switch Details → Agent → Details, verify the save remains open, preserve an unsent draft through the switch, and check pane collapse. Reopen is covered by store regression tests. Remove the temporary draft without sending a message.

### Task 4: Animate complete panel surfaces

**Files:** `apps/desktop/src/renderer/src/components/library/right-pane/index.tsx`, `apps/desktop/src/renderer/src/components/library/right-pane/styles.module.css`, `apps/desktop/src/renderer/src/components/library/right-pane/right-pane.test.tsx`, `apps/desktop/src/renderer/src/components/shell/app-shell/styles.module.css`.

- [x] Add a red regression assertion on the actual incoming panel: `expect(incoming?.style.transform).toContain("translateX")`. Run `pnpm --filter @pond/desktop exec vitest run src/renderer/src/components/library/right-pane/right-pane.test.tsx`; the visibility-only implementation fails this assertion.
- [x] Use keyed `motion.div` surfaces inside `<AnimatePresence initial={false} mode="sync">`. Enter from `x: "100%"` to `x: "0%"` over 300ms, exit toward `x: "100%"` over 200ms, and animate opacity with each surface. Keep both surfaces painted during the overlap; only the present panel is interactive.
- [x] Keep Agent and Inspector content in stable portal hosts created with lazy state initialization. Move each host into its animated surface with a callback ref so completed exits do not discard drafts or streaming subscriptions. Retain the last inspector ID through its exit.
- [x] Keep background, radius, and shadow on the animated card. Override the shell surface using `.shell .right-pane[data-slot="right"] > div`, which wins against the shared window selectors. Keep the viewport clip so motion never paints over Center.
- [x] Cover completed exits, reentry, rapid reversal, inspector navigation, and reduced motion with real Motion components. The right-pane, chrome-store, window-track, and library-layout tests pass (19 tests), including a changing transform during the animation. Targeted Biome checks and `git diff --check` pass. Desktop typecheck remains blocked by the unrelated existing Select items type error in `components/library/view-menu/layout/index.tsx:18`; the right-pane change has no remaining reported type errors.
- [x] Record repeated Assistant toggles with a save open in Resurf, then the same interaction in Pond. Frame comparison showed Pond's slow-starting exit was covered too soon by its incoming card. Change the exit to the same decelerating ease as entry and delay entry by 30ms. A second Pond recording confirms a larger exposed background gap and visible incoming panel edge. Regression coverage checks that both card edges move beyond 30% together during a swap.

### Task 5: Match the top-right opening/closing control

- [x] Record the Resurf top-right inspector control opening and closing, then record Pond's equivalent. Resurf keeps the panel width fixed; Pond's `width: auto` resized its content as the column opened.
- [x] Keep `.shell .right-pane[data-slot="right"] > div` anchored with `inset: 0 auto 0 0`, `width: var(--window-right-track)`, and matching `min-width`. The shared closed slot already clips overflow at the right window edge. A source regression protects these dimensions.
- [x] Run pane/store/layout/window regressions: 21 tests pass. Targeted Biome checks pass. Renderer typecheck still reports only the existing layout-menu Select items error.
- [x] Visually verify the fixed-width opening/closing adjustment. The first capture was blocked by the Mac locking; the Task 6 native recordings now verify the fixed-width card throughout opening and closing.

Comparison clips are saved under `/Users/raphaelsalaja/.codex/visualizations/2026/08/30/01a051d8-74fd-7e41-81b4-8cd188210bae/`: `resurf-swap.mp4`, `pond-swap.mp4`, and `resurf-open-close.mp4`. Full recordings and frame contact sheets are in `/private/tmp/pond-panel-recordings.6cFUCD/`.

### Task 6: Coordinate sidebar and right-panel edge motion

**Files:** `apps/desktop/src/renderer/src/components/shell/app-shell/styles.module.css` and shell animation regression tests. Keep changes scoped to the desktop shell; preserve the independent Agent/Details swap.

- [x] Record Resurf closing/opening its right panel and sidebar. The sidebar leaves no reserved column when closed. Native Pond recording was interrupted by the Mac locking, so use an isolated browser fixture importing the actual shared Window and desktop shell styles to measure the same edge states.
- [x] Reproduce two regressions in the fixture: sidebar width remains nonzero when closed; the right wrapper's opacity becomes zero at the start of closing.
- [x] Set `--window-left-min: 0px` on `.shell` (toolbar controls retain their own `max-content` sizing). Keep the sidebar content at its existing fixed width and translate it using `calc(var(--window-left-width) - var(--window-left-track))`, so it follows the animated column. Keep both edge wrappers opaque while they move; closed slots already clip and disable interaction.
- [x] Re-run browser measurements for closing/opening both edges. The sidebar slot now closes from 220px to 0px rather than 206px, its surface stays 220px wide, and its translation reaches -220px. The right wrapper remains 340px wide and opaque while its slot collapses to zero. All four direction checks pass. Remove the temporary fixture and its browser tab.
- [x] Native comparison exposed a second right-panel issue: the card swap exit was also running during slot collapse, so the card faded too quickly. Pass slot visibility through AnimatePresence custom data. During whole-slot closing, retain the card until the shell's 200ms edge transition finishes, then remove it without an extra horizontal exit or fade. Add a failing-then-passing real Motion regression that checks opacity and position at 80ms and removal after completion.
- [x] Verify native Pond against Resurf: record all four actions again and inspect closing frames at 60fps. The right card stays solid and fixed-width while moving offscreen; the sidebar moves fully offscreen and restores on reopening. Save `pond-edges-final.mp4` and `resurf-edge-motion.mp4` in the visualization directory above. Source captures and contact sheets are in `/private/tmp/pond-edge-comparison.V7VxXs/`.
- [x] Run targeted Vitest/Biome checks: all 25 tests pass, targeted formatting/lint passes, and `git diff --check` passes. Renderer typecheck still reports the unrelated layout-menu Select items type error at line 18.

### Task 7: Collapse the sidebar at its minimum usable width

Execute inline in the existing checkout and preserve unrelated edits; no branch or commit changes.

**Files:** `packages/ui/src/window/track.ts`, `packages/ui/src/window/index.tsx`, `apps/desktop/src/window-track.test.ts`, `apps/desktop/src/window-resize.test.tsx`, `apps/desktop/src/renderer/src/stores/library-chrome.ts`, `apps/desktop/src/renderer/src/stores/library-chrome.test.ts`.

- [x] Add track tests: opt-in `collapseAtMin: true` returns `null` when a 300px left track is dragged to 220px or below. A non-collapsible left track and the right track keep clamping normally. The first track/store run failed on three collapse cases and the old 180px preference.
- [x] Add real Window pointer-interaction tests: resizing above the minimum commits the width; reaching the minimum closes once before pointer release; no resize is committed on collapse; original inline width and cursor/selection are restored; cancel/lost capture does not close or commit; reopening uses the previous saved width. The initial run failed the collapse and cancellation cases.
- [x] Change `SIDEBAR_WIDTH_MIN` to 220. Cover loading an old 180px preference and setting an undersized width, both clamped to 220; toggling closed/open retains the saved width. This is above the Mac titlebar controls' 206px minimum.
- [x] Extend `nextTrackWidth` with optional `collapseAtMin?: boolean`, returning `number | null`: `if (input.collapseAtMin && raw <= input.min) return null;` before normal clamping. The Window handle opts in only for the left edge when an `onCollapse` callback exists.
- [x] Keep drag widths transient in the DOM. On threshold crossing, remove pointer listeners/capture and resizing flags, restore the cursor/selection, call `onCollapse`, and restore the pre-drag inline track value. Do not call `onResize`. Handle cancellation separately so it restores the pre-drag value without collapsing.
- [x] Run track, pointer, chrome-store, pane, shell-style, and layout tests: all 39 pass. Targeted Biome and `git diff --check` pass. Browser measurements using the actual Window/toolbar styles show both center and tabs at x=236px with the 220px sidebar. Click-to-close/reopen preserves width. Browser drag commands delivered no pointer events, so threshold dragging is verified by the real Window pointer regression tests, not claimed as a successful native drag. Remove the temporary fixture and browser tab.

### Task 8: Add Eagle-style folder tree connectors

Execute inline; preserve navigation, context menus, drop targets, and existing folder order.

**Files:** `apps/desktop/src/renderer/src/components/library/folder-sidebar/{index.tsx,styles.module.css,tree.ts,tree.test.ts}`.

- [x] Extract the existing flattening into `flattenFolderTree`. Return `{ folder, depth, guides }`, where each guide has a stable `parentId` and a `continues` boolean indicating a following sibling. Root rows have no guides. Tests cover roots, a single child, siblings, ancestor continuations, and four-level nesting.
- [x] Render decorative `aria-hidden` guide spans in each folder row wrapper, positioned independently of the button. Use `--folder-depth` for indentation at any depth and `--guide-depth` for each connector's column. Draw a muted 1px vertical line, ending in a 6px rounded elbow at each child; continue the trunk only when another sibling follows. Use parent IDs for React keys, and keep the guides non-interactive.
- [x] Run folder-tree and existing pane/resize regressions: 43 tests pass. Targeted Biome and `git diff --check` pass. Renderer typecheck reports only the pre-existing layout-menu Select items error. Inspect light and representative dark-token examples using the real tree helper and CSS; verify all 12 sampled elbows are rounded, aria-hidden, and pointer-events none. Remove the temporary fixture and browser tab.
