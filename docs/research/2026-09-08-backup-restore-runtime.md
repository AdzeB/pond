# Backup and restore runtime verification — September 8, 2026

The built desktop application's backup and restore IPC succeeded for an isolated 33-save library. A fresh SQLite index reconstructed from the restored bundle preserved all 33 saves, three original media files, annotations, ratings, folder memberships, nested smart folders and saved views, and the protected-title marker. The fresh-index checks used the application's actual scanner in Electron's Node runtime; graphical verification after restore remains incomplete.

[Machine-readable results](./2026-09-08-backup-restore-runtime.json) record the observed counts, original SHA-256 hashes, attachment dimensions, organization rows, and limits.

## Fixture and execution

The test launched the actual `apps/desktop/out/main/index.js` produced by `pnpm --filter @pond/desktop build`, with the normal preload and renderer. Electron was version 42.4.0 on macOS arm64. `POND_SANDBOX=/tmp/pond-backup-runtime-2RHV4h` isolated the library, application data, browser session, logs, and home directory. No live network or user library was used.

Through `window.pond.query` and `window.pond.batch`, the fixture created a PNG, animated GIF, MP4, and 30 notes. It added an image-region comment, a video timestamp note, an explicit title, image rotation and horizontal flip, tags, a folder containing the three media saves, and a group containing both a smart folder and a saved view with a title sort and layout preference.

The renderer requested a rating change for all 33 saves, then requested `library.backupTo` before that mutation promise completed. The mutation returned `changed: 33`; the backup returned `ok: true` and `copied: 45`. `library.restoreBackup` then returned success after restoring into a separate `Restored.pond` directory. These calls used the optional explicit-path IPC parameters; leaving those parameters absent retains the native file pickers.

For reconstruction, the native runtime created an empty SQLite index using `initializePondSchema`, hydrated `organization.json` with `hydrateOrganizationBundle`, then called `reconcileLibraryIndex` with a real filesystem root, native database, and mutation queue. This was the bundle produced by the successful restore IPC, not a separately generated approximation. No module mocks were used.

## Observed results

| Check | Result |
| --- | --- |
| Saves reconstructed | 33 of 33; all complete and rated 4 |
| Original bytes | PNG, GIF, and MP4 SHA-256 values matched the input files |
| Attachment dimensions | 800×600 PNG, 20×20 GIF, 640×360 MP4 |
| Annotations | Image comment and timestamp note matched exactly |
| Image presentation | Rotation 90 and horizontal flip preserved |
| Tags and explicit title | Tags matched; protected title and `user-title.json` preserved |
| Folder membership | Three restored membership rows |
| Sidebar organization | Group, nested smart folder, and nested saved view restored with query, sort, and layout |
| Annotation keyword index | `timestamp` matched the one video note in rebuilt FTS |

The pending mutation's updated ratings were present in the restored bundle. This demonstrates the overlapping renderer request path; the exact point of main-process worker admission was not instrumented.

## Limits and follow-up

The automatic relaunch reached the renderer, where an initial temporary harness assertion incorrectly treated `/tmp` and `/private/tmp` as different library locations. That assertion was corrected. Subsequent manual graphical launches, including one with a fresh Chromium profile, stalled before Electron's `ready` event. Concurrent QA processes were stopped and the sequential retry still stalled. The harness also emitted a Mach rendezvous/SIGTRAP message around relaunch. This run does not establish the cause or a product relaunch defect.

Consequently, the fresh-index results above are native scanner verification, not a completed post-restore GUI or IPC verification. Repeat the full flow in a signed packaged app and verify the restored gallery and folder contents interactively. This fixture also does not test process termination during snapshot, disk-full recovery, external-drive removal, or large-library backup duration.

Temporary execution evidence is in `/tmp/pond-backup-runtime.log`, `/tmp/pond-backup-native.log`, `/tmp/pond-backup-runtime.cjs`, and `/tmp/pond-backup-native-qa.ts`. The successful build log is `/tmp/pond-backup-qa-build.log`. Temporary files may be removed by the operating system; the linked JSON retains the measured results.
