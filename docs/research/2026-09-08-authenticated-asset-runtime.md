# Authenticated asset capture runtime verification

Verified on 8 September 2026 with Electron 42.4.0 on macOS. The real `captureAsset` implementation successfully downloaded an image from a local HTTP server that required both an imported test cookie and the expected Referer. The original PNG bytes, title, rating, and tags survived import into an isolated Pond library.

The [recorded observations](2026-09-08-authenticated-asset-runtime.json) contain request paths and boolean authentication checks. No browser credentials or live provider accounts were used.

| Check | Observed result |
| --- | --- |
| Request without cookie | Rejected with HTTP 403 |
| Imported cookie and Referer | Server accepted the request |
| Original image | Imported bytes exactly matched the served PNG |
| Metadata | Title, rating, and tags matched the request |
| Repeated asset URL | Returned the same Save ID as a duplicate without downloading again |
| Successful HTTP response containing HTML | Rejected as a non-image |
| Default Electron cookie jar | Did not contain the test cookie afterward |

The test used [capture-asset.ts](../../apps/desktop/src/main/core/capture-asset.ts), its real Electron session/cookie implementation, the normal manual import operation, and a real SQLite index. The source module was bundled into an Electron test entry; this was a domain runtime integration test, rather than a browser-extension/native-message or renderer IPC end-to-end test. The server listened only on `127.0.0.1` on an ephemeral port. App data, Chromium storage, logs, and the library were confined to `/tmp/pond-asset-runtime-omHFW2`.

The temporary harness source is `/tmp/pond-capture-asset-qa.ts`, its builder is `/tmp/pond-build-asset-qa.cjs`, and the runtime log is `/tmp/pond-capture-asset-runtime.log`. Electron was run outside the restricted process sandbox after the restricted runtime could not start; all application paths remained isolated. Early harness attempts required fixing module aliases and asynchronous Electron readiness before the successful run; those attempts did not exercise capture behavior.

This establishes local cookie forwarding, Referer forwarding, isolation, import fidelity, URL duplicate handling, and rejection of an incorrect response type. It does not establish compatibility with any particular live site's authentication, anti-bot checks, cross-origin redirects, expired sessions, or cookie recovery after restarting Pond. Capture cookies currently remain in memory, so authenticated capture resumption across a process restart remains unverified.
