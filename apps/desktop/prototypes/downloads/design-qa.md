# Downloads preview checks

Checked August 31, 2026 in the Codex in-app browser.

## Visual checks

- All three directions render using Pond's neutral colors, Inter font, logo, source marks, and existing icons.
- The captured production Downloads screen informed the shell and density. The explorations intentionally change the content hierarchy, not the product branding.
- Sources retains its navigator at an 820 px desktop width and uses horizontally scrollable source controls at 390 px.
- List and Focus reflow at 390 px. All three stay within the viewport without page-level horizontal overflow.
- Dark mode, mixed activity, all failures, completed, and empty examples render.
- Visible image assets loaded without errors during the desktop check.

## Interaction checks

- Pause updates the overview, notice, and details dialog; details open and close.
- Retrying a failure removes it from Needs Attention and returns it to waiting.
- Cancel removes a sample download; Undo restores it.
- Source selection and status filtering restrict the displayed saves. Source-wide Retry Failed clears its failure view.
- Search finds the flower-arrangement save and displays a no-results state for an unmatched query.
- Arrow keys in search do not switch variants. Arrow navigation outside inputs updates the variant URL, and reload restores the selected variant.
- Play Sample advances transfer values, completes saves, and starts waiting downloads. Reset restores the mixed sample.
- Pause is disabled when all saves are completed. Completed and empty scenarios have distinct visible states.

## Fixes made during review

- Corrected singular counts in the source footer.
- Removed misleading search-empty wording implying downloads were always active.
- Distinguished waiting downloads from completed downloads in Focus's no-active-transfer state.
- Changed the failure introduction when no other work is active.

## Transfers revision

- TypeScript check and Vite production build pass with the fourth direction.
- D renders at the normal desktop viewport, 820 px, and 390 px without page-level horizontal overflow. The four-direction dock wraps on narrow screens.
- Light and dark appearances checked. Reduced-motion preferences disable the new indeterminate animation.
- Collapsing an import hides its children while keeping saved and warning counts visible. Review opens collapsed imports to expose failures.
- Individual retries leave the attention view and produce its resolved state. History shows completed saves separately.
- Processing Files exposes the intermediate stage without playing the simulation. Play Sample moves those saves into History only after processing completes.
- Pause updates row stages. All Completed shows the settled view with Pause disabled; Empty retains the shared empty state.
- A–C keep their existing layouts. The shared simulation and details dialog now include Processing.
- Search, source filtering, Cancel and Undo checked in D. The four-way switcher and D URL reload work. Final desktop check found no broken images or browser warnings/errors.

## Quiet revision

- Added E while preserving A–D and the URL-driven comparison bar.
- TypeScript and Vite build checked. Five-variant switcher and narrow-screen CSS reviewed in code; reduced-motion rules cover the new animations.
- Single-file pause stops that save's sample progression. Shared statuses and progress indicators reflect individual pauses when switching variants. Paused transfers retain their simulation slot, avoiding excess concurrent downloads on resume.
- Browser verification was blocked by the browser URL security policy after the original local preview server was found stopped. The server was restarted, but no visual or interactive browser pass is claimed for E.

## Compact header revision

- Removed the repeated Downloads title and summary row from all five prototypes. Matched the All page's search-first `LibraryChrome` structure and 52px height.
- Search, Clear Search, filter expansion/collapse, source selection, and active-filter indication verified in the browser. Reset clears and closes filters.
- Pause All and Resume Downloads work from the compact icon control. Queue views remain below the header.
- E visually checked at desktop and 390px; no page-level horizontal overflow at 390px. This later browser pass supersedes the earlier visual-check limitation for E's default layout.
- TypeScript and Vite build pass after the header changes.

## Limits

Quiet's tab row was subsequently removed. Current/Attention/Saved are controlled from the shared filter area, and Retry Failed moved into the header. Browser checks verified Saved and Attention selection, combined source/status restrictions, scoped retry, resolved attention state, filter clearing, and collapsing controls. The default desktop layout was visually inspected without the tab row.

This is a UI prototype with in-memory sample data. It does not validate real byte telemetry, pipeline recovery, persistence, source authentication, ingestion stages, or Electron behavior. No comprehensive screen-reader, contrast, or accessibility audit was performed. Scope excludes functionality in the surrounding Library navigation.
