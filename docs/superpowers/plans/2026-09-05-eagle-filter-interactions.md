# Eagle Filter Interactions Implementation Plan

> **For agentic workers:** Execute inline in the authorized implementation session.

**Goal:** Replace generic query controls with the observed Eagle filter interactions while preserving Pond components.

**Architecture:** Keep predicates and field descriptors. Choice inclusion/exclusion belongs to each option; collection matching belongs to Tags/Folders. Numeric and text editors validate drafts and commit automatically without remounting inputs.

**Tech Stack:** React, Pond UI, Vitest.

- [x] Remove category-wide operators except collection matching; retain a local matching selection before the first tag/folder choice.
- [x] Add per-option exclusion via context menu and Shift+F10, with an explicit excluded indicator and guidance.
- [x] Automatically commit valid range, dimension and content drafts; preserve invalid drafts, focus and existing strict comparisons. Empty edited drafts clear only their field.
- [x] Remove numeric preset and Apply scaffolding from immediate editors.
- [x] Update behavioral regressions and run filter tests, renderer typecheck and live UI verification.

Font/Camera behavior, exact-set matching, and comma-keyword semantics were not established in the audit; do not invent those semantics.

Validation: 50 filter tests pass across 7 files. Renderer typecheck reports only the two existing agent settings provider-type errors at lines 89 and 108. Live Duration popup verified with just Min/Max/Units; Mac locked before further live interaction checks. Exact-set tags, hidden Font/Camera, and comma keyword semantics remain unverified.
