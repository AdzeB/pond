# Downloads implementation

E: Quiet is the selected direction. The Downloads page now uses the same compact search-header proportions as All, with Filters, Retry Failed, Pause Queue, and an overflow menu for Cancel All. Current, Attention, Saved, and All Downloads live inside the filter controls alongside source and stage filters. The breadcrumb supplies the title. There are no tabs or summary footer.

Rows use static local thumbnails with source fallbacks, stage labels, inline errors, and a narrow activity indicator. Blue and green washes indicate ongoing work; they do not measure byte progress. Selection checkboxes appear on hover or keyboard focus and remain visible when selected. The list keeps virtualized rendering and the existing selection dock.

Queue pause prevents new tasks from starting. Running tasks finish and keep their activity indicators. The backend does not support per-file pause, so that prototype control was not promoted. Rows retain individual cancellation and save navigation; Retry Failed applies to visible failures. Cancel All remains behind a confirmation.

History loads only for Saved or All Downloads and refreshes as live work completes. Loading and failure states are explicit. Pagination remains reachable when live retries hide every result on a history page.

## Verification

- Renderer TypeScript check
- Desktop production build, including main, preload, and renderer
- Download projection and history-cursor tests
- Component integration tests for queue pause, scoped retry, cancellation, selection, filters, live history refresh, failed history requests, and pagination
- Browser checks of the actual production components with a sample IPC bridge, isolated from the user's library
- Compact and narrow layouts, theme-aware activity colors, and keyboard-accessible controls

The production build reports existing route-test and mixed static/dynamic import warnings. It completes successfully.

## Prototype source

The five alternatives lived on archive branch `codex/prototype-downloads-explorations-2026-08-31`. The production page was implemented against the real queue and shared UI components rather than importing the explorations.
