# Library Pane FLIP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make opening and closing the Library sidebar and Agent pane smoothly rearrange visible cards without repacking the full Library on every animation frame.

**Architecture:** Capture the mounted, viewport-intersecting card rectangles immediately before a pane state update. Commit the pane's final layout width once, let the existing grid pack once at that width, then use the Web Animations API's individual `translate` and `scale` properties to FLIP matching card elements from their captured rectangles to their final rectangles without conflicting with the cards' absolute-positioning `transform`. Pane contents animate independently inside tracks whose layout width changes immediately.

**Tech Stack:** React 19, TypeScript, TanStack Store, TanStack Virtual, CSS Modules, Web Animations API, Vitest/jsdom.

---

### Task 1: Add the FLIP snapshot and animation utility

**Files:**
- Create: `apps/desktop/src/renderer/src/lib/ui/library-layout-transition.ts`
- Test: `apps/desktop/src/renderer/src/lib/ui/library-layout-transition.test.ts`

- [x] **Step 1: Write a failing unit test for visible-card capture and transform composition**

Create a jsdom test that mounts a `[data-library-grid-viewport]` with one intersecting and one offscreen `[data-save-id]` element. Stub their `getBoundingClientRect()` values and `animate()` method, call `beginLibraryLayoutTransition()`, move the visible card's mocked final rectangle, then call `completeLibraryLayoutTransition(grid)`. Assert that only the visible card animates and its first keyframe contains the inverse `translate` and `scale` values.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/lib/ui/library-layout-transition.test.ts`

Expected: FAIL because `library-layout-transition.ts` does not exist.

- [x] **Step 3: Implement the snapshot utility**

Implement:

```ts
export function beginLibraryLayoutTransition(): void;
export function completeLibraryLayoutTransition(container: HTMLElement): void;
```

`beginLibraryLayoutTransition()` must return early for reduced motion, capture only non-empty card rectangles intersecting the Library viewport, and preserve the first snapshot when two pane toggles happen in the same interaction. `completeLibraryLayoutTransition()` must consume only a fresh snapshot from the same window root, cancel older Pond layout animations, and animate matching cards from inverse `translate`/`scale` values to identity with the window motion easing.

- [x] **Step 4: Run the focused test and verify it passes**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/lib/ui/library-layout-transition.test.ts`

Expected: PASS.

### Task 2: Connect pane actions and rendered grids to FLIP

**Files:**
- Create: `apps/desktop/src/renderer/src/hooks/use-library-layout-transition.ts`
- Modify: `apps/desktop/src/renderer/src/stores/library-chrome.ts`
- Modify: `apps/desktop/src/renderer/src/components/library/layouts/packed-grid/index.tsx`
- Modify: `apps/desktop/src/renderer/src/components/library/layouts/list-view/index.tsx`

- [x] **Step 1: Add a layout-effect hook that completes a pending transition**

Implement a focused hook:

```ts
export function useLibraryLayoutTransition(
  ref: RefObject<HTMLElement | null>,
  layoutVersion: unknown,
): void;
```

The hook calls `completeLibraryLayoutTransition()` in `useLayoutEffect`, before paint, whenever the packed items or list width changes.

- [x] **Step 2: Capture before every pane state mutation**

Call `beginLibraryLayoutTransition()` immediately before `toggleSidebar`, `toggleAgent`, and changed `setAgentOpen` store updates. Keep width-resize actions unchanged because drag resizing already follows the pointer continuously and should not create discrete FLIP snapshots.

- [x] **Step 3: Complete transitions from packed and list grids**

Attach the hook to the existing packed-grid `ul` ref using the packed `items` array as its layout version. Add a list-grid ref and use the measured list width as its version so list rows also resize smoothly.

- [x] **Step 4: Run focused grid and transition tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/lib/ui/library-layout-transition.test.ts src/renderer/src/components/library/layouts/packed-grid/index.test.tsx`

Expected: PASS.

### Task 3: Make pane layout changes single-reflow

**Files:**
- Modify: `apps/desktop/src/renderer/src/lib/util/settled-resize.ts`
- Modify: `apps/desktop/src/renderer/src/lib/util/settled-resize.test.ts`
- Modify: `apps/desktop/src/renderer/src/stores/shell-state.ts`
- Modify: `apps/desktop/src/renderer/src/components/library/layouts/list-view/index.tsx`
- Modify: `packages/ui/src/window/index.tsx`
- Modify: `packages/ui/src/window/styles.module.css`

- [x] **Step 1: Write a failing continuous-measurement test**

Extend `settled-resize.test.ts` with an options case asserting that `observeSettledSize(element, onSize, { continuous: true })` coalesces repeated ResizeObserver deliveries into one animation-frame measurement instead of waiting 64 ms.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/lib/util/settled-resize.test.ts`

Expected: FAIL because the options argument is not implemented.

- [x] **Step 3: Add the continuous observer option**

Add an optional `{ continuous?: boolean }` argument. Schedule at most one animation-frame measurement when `continuous` is true or the pane is being pointer-resized; preserve the settled debounce as the default.

- [x] **Step 4: Use continuous measurement for layout-bound grids**

Pass `{ continuous: true }` from `useGridWidth()` and the list view so an immediate pane track change produces one prompt final grid measurement and ordinary window/drag resizing stays frame-throttled.

- [x] **Step 5: Remove layout-width animation and preserve pane visual motion**

Remove the root custom-width and right-margin transitions. Wrap left and right pane children in stable inner elements, position those wrappers absolutely against their respective outer edges, allow the zero-width tracks to show their fading/sliding wrappers, and move the right pane background/radius/shadow to its wrapper. Keep reduced-motion and pointer-resize rules intact.

- [x] **Step 6: Run UI package and desktop tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/lib/util/settled-resize.test.ts src/renderer/src/lib/ui/library-layout-transition.test.ts src/renderer/src/components/library/layouts/packed-grid/index.test.tsx`

Run: `pnpm --filter @pond/desktop typecheck`

Expected: all tests and type checking pass.

### Task 4: Verify and clean up

**Files:**
- Modify only files listed above if verification finds a scoped issue.

- [x] **Step 1: Run formatter/lint checks on changed files**

Run Biome check against the changed TypeScript and CSS files without applying unrelated repository-wide changes.

- [x] **Step 2: Confirm no temporary diagnostics remain**

Search for temporary test names and debug markers; confirm only the permanent regression tests remain.

- [x] **Step 3: Review the final diff**

Confirm the diff contains one snapshot, one final grid pack, mounted-card-only compositor animation, reduced-motion behavior, and no changes to unrelated dirty worktree files.
