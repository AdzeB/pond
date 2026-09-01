# Dialog repairs implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair dialog layout, viewport containment, page navigation, and asynchronous confirmation behavior without replacing existing app work.

**Architecture:** Keep Base UI responsible for modal semantics and focus trapping. Repair the shared layout and give each animated page its own measurement lifecycle. Keep prompt and confirmation submission state local to each payload.

**Tech Stack:** React, Base UI, CSS Modules, Motion, Vitest, existing component gallery.

## Evidence and reference

ConnectKit reference: https://github.com/family/connectkit/tree/main/packages/connectkit/src/components/Common/Modal

Browser baseline: Dialog description starts at y=284.25, above the heading bottom of 305.25. Paged dialog at a 360×300 viewport spans x=-12 to 372. Both fail deterministic DOM geometry checks.

## Task 1: Shared dialog layout

Files: `packages/ui/src/shared/parts/dialog/index.tsx`, `packages/ui/src/shared/styles/dialog/styles.module.css`, `apps/desktop/src/renderer/src/components/shared/dialog.test.tsx`.

- [x] Test custom classes preserve the built-in header/content/footer classes, and leading/trailing actions occur in the expected order.
- [x] Destructure className before spreading props; put heading/description in a column, with optional actions on either side.
- [x] Use a 400px panel bounded by the viewport, 20px corners and 24px padding, a horizontal footer with equal action widths, and scrollable content. Keep settings custom dimensions intact.
- [x] Re-run the DOM geometry check and test command below.

## Task 2: Paged dialogs

Files: `packages/ui/src/page-dialog/index.tsx`, `packages/ui/src/page-dialog/styles.module.css`, `apps/desktop/src/renderer/src/components/shared/dialog.test.tsx`.

- [x] Test changing pages disconnects the outgoing observer without disconnecting the incoming observer; test default close button native semantics.
- [x] Extract an internal Page component owning its ref, ResizeObserver, presence state, and cleanup. Mark exiting content inert. Focus the incoming page on navigation.
- [x] Bound page width and height to the viewport, keep the header outside scrolling content, use 32px circular controls and short directional scale/fade transitions.
- [x] Verify forward/back, close, Escape, focus restoration, and narrow/short-window containment in the gallery. Verify dynamic content resizing in the regression test.

## Task 3: Prompt and confirmation submission

Files: `apps/desktop/src/renderer/src/components/shared/prompt-dialog/index.tsx`, `apps/desktop/src/renderer/src/components/shared/confirm-dialog/index.tsx`, `apps/desktop/src/renderer/src/components/shared/use-dialog-submit.ts`, `apps/desktop/src/renderer/src/components/shared/dialog.test.tsx`.

- [x] Test a prompt uses Input.Root, keeps its value on rejection, reports an error, and closes only after success.
- [x] Test confirmation rejection is handled, duplicate submissions are blocked, and dismissal is blocked while pending.
- [x] Use a payload-keyed body, a synchronous ref guard, local pending/error state, and a form for keyboard submission. Catch callback failures and keep the dialog open for retry.

## Verification

```sh
cd apps/desktop
./node_modules/.bin/vitest run src/renderer/src/components/shared/dialog.test.tsx
./node_modules/.bin/tsc --noEmit -p tsconfig.web.json
cd ../../packages/ui
./node_modules/.bin/tsc --noEmit
```

Also run Biome on changed files, check light/dark rendering, and reset browser viewport overrides. Do not commit the user's mixed worktree.

## Results

- 10 new dialog regression tests pass. The baseline had five failures.
- 29 tests pass across dialogs, downloads, search, and toolbar tests.
- UI and desktop renderer TypeScript checks pass; targeted Biome and diff whitespace checks pass.
- Standard header geometry now passes: description below title, aligned 172px action buttons.
- At 360×300, the paged dialog stays inside 16px horizontal margins. At 360×180, its body scrolls and navigation remains reachable.
- Forward/back navigation moves focus to the new page. Mouse dismissal restores trigger focus; Escape dismisses. Native button semantics are covered by the regression test; the browser's synthetic Enter dispatch did not activate native buttons.
- No gallery console errors or warnings. Viewport override reset.
- Light-theme visual checks completed. Dark-theme tokens are preserved, but dark rendering and the full Electron account connection flow were not exercised.
