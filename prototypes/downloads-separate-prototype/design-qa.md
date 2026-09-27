# Design QA — Downloads / Sources prototype

## Visual truth and implementation

- Source visual truth: the running Pond desktop app at `http://localhost:5173/`, captured through Computer Use at 1292 × 768.
- Implementation: `http://127.0.0.1:8768/`, captured through the in-app browser at the desktop breakpoint. The browser capture is attached to the prototype task; the Computer Use API did not expose a filesystem path for the screenshot.
- Reference density: 13 px navigation and toolbar labels, 11–12.5 px metadata, 30–32 px controls, 42–54 px toolbar and row heights, and a persistent 300–322 px inspector.

## Full-view comparison

The prototype preserves Pond's three-part desktop structure: compact library sidebar, flexible main workspace, and right-side inspector. It also carries forward the warm neutral surfaces, fine borders, restrained purple selection state, small Nucleo controls, and dense typography visible in the running app.

The Downloads content intentionally changes from summary-first to task-first. Status filters, active work, failed work, and dated history now occupy the main canvas; the inspector holds detail and recovery actions. Sources remains a separate sidebar destination and links back to a source-filtered Downloads view.

## Focused region

The focused comparison covered the Downloads toolbar, table header, active row, progress treatment, and inspector boundary. At the 1280 px desktop target, all six table columns fit while the inspector is open. Status, progress, and recovery actions remain legible without increasing the visual weight beyond the existing Pond shell.

## Findings and fixes

1. **High — Fixed:** the first implementation used table column minimums that forced horizontal scrolling and clipped the Added column when the inspector was open. Reduced the column minimums and tightened Source and Added widths.
2. **Medium — Fixed:** returning from Sources applied the source filter but left the inspector on a hidden download from another source. The inspector now follows the first visible filtered result.
3. **Medium — Fixed:** the Sources-to-Downloads action originally reopened the unfiltered queue. The selected source now becomes the initial Downloads filter.
4. **Low — Accepted:** long stage details and file paths truncate with ellipses at compact widths, matching Pond's dense desktop treatment; full values remain available in the inspector context.

## Interaction and runtime verification

- Status filter isolates failed downloads.
- Retry moves a failed item into Waiting and shows confirmation.
- Pause and resume update both queue rows and inspector state.
- Search isolates matching downloads and keeps the inspector synchronized.
- Selection reveals batch actions and clears correctly.
- Inspector source links open the separate Sources screen.
- “View downloads” returns to a source-filtered queue.
- Browser console: no warnings or errors from the prototype.
- Production build: passed.
- Sites worker tests: 4 passed.

## Comparison history

- Round 1: full desktop comparison found table overflow with the inspector open and two source handoff state mismatches.
- Round 2: repeated the full-view and focused-region checks after the fixes; layout, hierarchy, source filtering, and inspector synchronization passed.

## Result

**Passed.** The prototype is ready for review at `http://127.0.0.1:8768/`.
