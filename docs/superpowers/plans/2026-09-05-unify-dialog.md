# Unify Dialog Implementation Plan

**Goal:** One compositional Dialog export, including reusable prompt and confirmation commands.

**Architecture:** Base UI owns modal and alert semantics. Dialog parts own static and paged layout; internal command hosts consume those parts without importing the public assembly. Desktop callers supply domain callbacks. Preserve all existing source-flow work.

**Tech Stack:** React, Base UI, Motion, CSS Modules, Vitest.

## Implementation

- [x] Migrate regression tests to `Dialog.Host`, `Dialog.confirm`, `Dialog.prompt`, and paged `Dialog.Popup`; add alert dismissal and form-close coverage. Run the dialog suite to establish failures.
- [x] Merge primitives into `packages/ui/src/dialog/`. Use a discriminated Root variant, paired pageId/depth, internal page context, shared Base parts, default circular Close with custom render support, static Content and padded Footer. Preserve paged measurement and source-flow CSS overrides.
- [x] Move command state, typed options, prompt/confirm bodies, and submission handling into the dialog module. Assemble public Dialog in index.tsx without cycles. Retain handle factories and Dialog.Handle.
- [x] Migrate app callers and mount one Dialog.Host. Move static descriptions out of headers; add disabled close controls to pending forms. Collapse gallery specimens and migrate prototypes. Delete superseded modules.
- [x] Run dialog regressions, required pnpm check/build, gallery build, and browser layout/focus checks. Record unrelated failures separately. Update architecture ownership documentation.

## Acceptance

Static dialogs need no page context. Alert dialogs reject outside dismissal and initially focus the safe action. Header Close never submits a form and cannot interrupt pending work. Retry retains input; duplicate submissions remain blocked. Paged exits are inert, active observers survive outgoing cleanup, persistent chrome is measured, and custom source-flow dimensions survive. Static bodies scroll in short windows, custom command-menu geometry remains intact, and motion respects reduced-motion settings.


## Results

- Unified the public Dialog API and removed the old AlertDialog/PageDialog implementations and app command hosts.
- Added command defaults and retained injected prompt services for domain-operation tests.
- `pnpm check` passes: 153 test files, 1,381 tests passed, 16 skipped. Local socket/HEIC tests required running outside the sandbox.
- `pnpm build` and all performance budgets pass. Component gallery build passes.
- Browser verified static and command dialogs, safe confirmation focus, alert outside-click protection, Escape/focus restoration, forward/back page focus, and 360×180 containment/scrolling. Fixed static form padding overflow and added a maximum-width clamp during animated viewport resizing. Viewport override reset; no gallery console errors/warnings.
- Reduced motion is covered by component tests and retained CSS handling. Dark-theme rendering and the live Electron source/command-menu flows were not manually exercised.
