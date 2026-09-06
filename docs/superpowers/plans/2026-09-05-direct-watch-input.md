# Direct watch input implementation plan

**Goal:** Open one input when Watch Account is selected. Infer the platform and target type from links; ask for the platform inline for bare handles.

**Architecture:** Keep platform detection in a pure source-feature helper backed by the shared source registry. Reuse the existing main-process target resolver and watch mutations. Keep input and ambiguity selection local to the dialog.

**Tech stack:** React, Base UI, TypeScript, Vitest.

- [x] Add and test platform inference for supported links, schemeless links, bare handles, and unsupported hosts.
- [x] Route watch entry points directly to the target form. Remove the obsolete platform and kind pages and their state.
- [x] Use generic input copy, an inline platform choice for handles, source-aware session guidance, and request-keyed previews. Guard submission against stale or missing resolution.
- [x] Run formatting, focused tests, repository checks and production build. Inspect the dialog using fixtures.

Validation: 16 focused tests passed. Repository lint, architecture, unused-code and type checks passed. The offline suite passed 1,374 tests; the three sandbox failures passed on an unsandboxed rerun. Production build and performance budgets passed. Browser fixtures verified direct entry, link detection, handle clarification, session guidance, and stale-input submission blocking.
