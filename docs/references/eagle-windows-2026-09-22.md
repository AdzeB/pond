# Eagle window boundaries

Inspected September 22, 2026. These are source and documentation findings, not
claims that every Eagle window was exercised live.

The locally installed [Eagle (2026)](../provenance/generated/REFERENCES.md#eagle-4-20260401)
archive was previously extracted to an ignored temporary directory. Paths below
are relative to its `app/` directory. Main-process entrypoints are compiled
bytecode, so filenames alone cannot establish native-window behavior.

| Surface | Evidence | Pond adaptation |
| --- | --- | --- |
| Desktop screenshot collection | `js/background.js` sends `open-collect-window`; Collect controller invokes `remote.getCurrentWindow()` and closes its own window. | Independent screenshot organizer, explicit Save, existing metadata/folder workflow. |
| Preferences | Independent native window explicitly documented by [Eagle Team (2026)](../provenance/generated/REFERENCES.md#eagle-4-build20-preferences-window); `js/preferences.js` controls its current window. | Singleton Settings window with live preference propagation. |
| Image/video references | `js/preview-window.js` controls minimize, maximize, opacity and fullscreen. Video new-window use is documented by [Eagle Team (2025)](../provenance/generated/REFERENCES.md#eagle-4-build9-video-windows). | Extend existing image windows to video; image presentation remains supported separately. |
| Batch Save | `index.html:2175` mounts `batch-save-panel`; directive responds to IPC by setting `isOpen`. | Keep embedded. |
| Plugin Center | `index.html:2178` mounts its modal directive. Actual plugin tools separately create BrowserWindows. | No plugin-window feature added to Pond. |
| Notification Center and progress | Notification modal embeds an iframe; main HTML mounts import/export/progress directives. | Keep embedded progress and notifications. |
| Browser extension collection | `collect-window/js/lib/collect-window.js:45` injects an iframe into the host document. | Do not mistake this overlay for the desktop screenshot window. |

No Eagle code or assets are shipped. The creator is Eagle/OGDESIGN; redistribution
terms were not established. This is behavioral and visual inspiration, with
Pond's own React components, styling, IPC and persistence. User-provided
inspector screenshots are private design inputs. No unrelated plugin or
licensing surfaces were recreated.

Pond's native window lifecycle, including cancellation, focus and Library
switching, requires its own Electron checks. Browser comparison fixtures prove
layout only and use synthetic Save data.

## Pond verification

The inspector comparison uses the actual Pond component with synthetic Saves,
beside the supplied single- and multiple-selection references. It was reviewed
in light and dark themes at 280, 340 and 560 pixel panel widths. This confirms
layout, not Eagle's runtime behavior.

`scripts/smoke-auxiliary-windows.cjs` exercises multiple image/video windows, playback, seeking, volume, fullscreen,
Keep on Top, target changes, missing media and live appearance updates.

`scripts/smoke-screenshot-window.cjs` uses real Electron windows, IPC and an
isolated temporary Library, with synthetic OS capture pixels. It checks the
organizer, scoped queries, repeated requests, native cancellation, capture from
the native menu without a Library renderer, persistence and after-save behavior.
Domain tests cover failed saves, retry without duplicate imports, expiry,
Library invalidation and close prevention during persistence.

Physical screen selection, returning focus to another application in every
visibility state, and physical display unplugging still need a manual macOS
pass. The automated pixel fixture and mocked shortcut registration tests do not
establish those OS interactions. Test scripts never use the user's Library.
