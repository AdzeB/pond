# Downloads design QA

Implemented the approved active Downloads list with details in Pond’s existing global right pane. The main page shows running work, current phases and actual byte progress; waiting and completed groups start collapsed. Failed work remains visible. Inspection preserves the shared panel’s close, reopen and resizing behavior.

## Browser checks

Verified the production page and inspector with offline fixtures at `http://127.0.0.1:4322/downloads.html`:

- Selected row has the theme accent background and opens the corresponding item in Details.
- Waiting work stays collapsed until opened; pause changes the waiting count to paused while active transfers remain visible.
- A stalled transfer displays elapsed silence and removes stale speed and ETA.
- Request details show GET, host, response status, response timing and first-byte timing where measured.
- Desktop layout has no horizontal document overflow and uses the shared inset content and right-panel shell.
- No browser error logs appeared during these interactions.

The fixture uses source-logo fallbacks instead of local media thumbnails. Its queue is representative, with three active items and eighteen waiting. Real thumbnails use the existing save media path. Browser screenshot capture rendered the page at a smaller scale inside its output; layout geometry and visible component state were checked directly. The target is the desktop app’s layout; a narrow embedded browser can squeeze the center when both sidebars are open.

## Verification and limits

82 focused offline tests pass. Component preview build and architecture checks pass. Whole-repository checks and the desktop production build have unrelated blockers recorded in the implementation plan. Actual source downloads were not performed. Direct fetch provides HTTP timing and byte telemetry; yt-dlp provides available byte progress; browser harvesting and archival expose coarse phases where fine-grained measurements are unavailable. Activity is bounded in-memory state, so older history has persisted completion/error information without a retained request trace.
