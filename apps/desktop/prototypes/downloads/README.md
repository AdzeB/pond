# Downloads explorations

Five disposable Downloads layouts, switchable with `?variant=A`, `B`, `C`, `D`, or `E` and a floating bottom bar. The question is which layout makes progress and recovery clearest without losing Pond's quiet visual style.

## Run the preview

```sh
pnpm --config.verify-deps-before-run=false --filter @pond/desktop prototype:downloads
```

Open [the downloads preview](http://127.0.0.1:4318/?variant=A).

## Compare the directions

- **A: List** groups individual saves by status. Thumbnails, progress, and retry actions sit in compact rows.
- **B: Sources** adds a source navigator and a source-specific download history. Select a source, then filter its active, failed, or completed saves.
- **C: Focus** emphasizes the current download, keeps waiting saves below, and puts failures in a separate column.
- **D: Transfers** combines compact file rows with expandable imports, inline failures, and a separate History view. Status and indeterminate activity sit directly below each title. This direction draws on the [reference research](references.md).
- **E: Quiet** uses a flat queue inspired by Leech and Pulli: soft moving activity backgrounds, small pause controls and pixel indicators beside thumbnails, and inline errors. Current/Attention/Saved are status filters inside Filter Downloads; there is no tab row, batch header, or percentage claim. Retry Failed is an icon in the search header; rows do not repeat the button. Open a download's details to retry just that save.

Open [the new Quiet direction](http://127.0.0.1:4318/?variant=E), or compare [Transfers](http://127.0.0.1:4318/?variant=D).

Use the bottom buttons or left/right arrow keys to switch. Arrow keys keep their normal behavior inside text fields, select menus, and the details dialog. The variant and sample scenario survive reloads through URL parameters. Other state stays in memory.

All five directions share a compact header based on the All page's `LibraryChrome`: one 52px search bar, a filter toggle, and a Pause/Resume icon. The breadcrumb supplies the page title, so Downloads is not repeated inside the content panel. Source controls appear only when the filter toggle is open; an active filter remains marked on the toggle when closed.

## Try the interactions

1. Pause and resume downloads. Inspect a save to see its status and sample stages.
2. Retry one failed save or all failures. Retried saves return to waiting.
3. Select **Play Sample** to simulate downloads with two simultaneous transfers. Saves pass through Processing before completing, and waiting saves start. **Hold Sample** freezes the simulation state for inspection; **Pause All** pauses the sample downloads themselves.
4. Cancel a download, then use **Undo** in the notification to restore it.
5. Search by title, source, or status. Select **Filter Downloads** to open source controls and, in Quiet, Current/Attention/Saved status choices. **Clear Filters** restores All Sources and Current. The filter icon stays marked when a non-default filter is active, even with controls closed.
6. In Sources, select a source and use its status filters or **Retry Failed** action.
7. In Focus, select a save under **Also downloading** to feature it.
8. Compare **Mixed Activity**, **Processing Files**, **Needs Attention**, **All Completed**, and **Empty** using the Sample menu. **Reset Sample** restores the selected scenario.
9. Use **Dark** or **Light** to compare themes. **State** displays the full relevant sample state.
10. In Transfers, collapse an import to see its saved count and warning count. **Review** expands imports and shows only failures. Retry them, then **Show All** to return to the queue. Switch to **History** to inspect completed saves.
11. In Quiet, pause or resume a single save with its left-hand control. Its stage and activity stop while other work continues. Per-file pauses persist when comparing layouts. Pause All temporarily pauses everything; Resume preserves individual pauses. Reset Sample clears them. Paused transfers retain a slot in the two-transfer sample simulation.

## Boundaries

This follows the existing isolated `apps/desktop/prototypes/` convention rather than adding experimental routes to the running Electron app. The surrounding shell is a visual reproduction for context. Its Library and folder labels are not navigation links. The prototype does not access the real library, IPC, database, or transfers. Production E is implemented separately in `src/renderer/src/components/library/downloads/page`.

Sample titles, status, transfer sizes, and stage history are invented. Thumbnails and source logos reuse repository demo assets, and typography, icons, and the Pond logo reuse existing packages. No assets are fetched from external services. The sample date is August 31, 2026.

Byte progress in A–C is a proposed UI capability, not a claim about the production data model. Production currently exposes completed processing steps divided by total steps. D and E use stage labels and indeterminate activity instead. E's moving backgrounds and pixels do not measure completion. D's batch counts measure completed saves, not transferred bytes. Import membership and processing timing are sample data; production grouping would require an actual import identifier.

E: Quiet was selected on August 31, 2026. Production uses the compact search header, Current/Attention/Saved filters, header retry action, thumbnail rows with indeterminate activity, and inline errors. It has no repeated title, tabs, or footer. Production preserves virtualized selection, cancellation, and paged history. Queue pause prevents new tasks from starting; running tasks finish. Per-file pause and simulated byte progress remain prototype-only.

Archive: local branch `codex/prototype-downloads-explorations-2026-08-31`. The implementation decision and verification notes are in `docs/research/2026-08-31-downloads-implementation.md`.

## Validation

```sh
./apps/desktop/node_modules/.bin/tsc -p apps/desktop/prototypes/downloads/tsconfig.json
pnpm --config.verify-deps-before-run=false --filter @pond/desktop exec vite build --config prototypes/downloads/vite.config.ts
```

See [browser checks](design-qa.md). The floating comparison bar is development-only.
