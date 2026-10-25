# Safari extension

Safari is the one engine that cannot use Pond's native-messaging setup as-is, so the
Safari target differs from Chrome, Brave, Edge, and Firefox in three places.

## Why Safari is different

| | Chrome, Edge, Brave, Firefox | Safari |
| --- | --- | --- |
| Native messaging | `NativeMessagingHosts` manifest + `allowed_origins`, launches `pond-native-host` | `SafariWebExtensionHandler` compiled into a Safari App Extension |
| Context menus | `contextMenus` namespace | `menus` namespace |
| MAIN-world scripts | `world: "MAIN"` since Chrome 111 | `world: "MAIN"` **only since Safari 18** |

The wire protocol does not change. `apps/extension/safari/SafariWebExtensionHandler.swift`
writes the same 4-byte little-endian length prefix and UTF-8 JSON that
`native-host/pond-native-host.c` writes, to the same Unix socket that
`apps/desktop/src/main/native/server.ts` listens on. **The desktop app needs no changes.**

## Version floor

`entrypoints/hooks-main.content.ts` declares `world: "MAIN"`, which Safari added in 18.
The Safari target therefore needs macOS 14.4 or later, even though Pond itself supports
macOS 13. There is no fallback injector; a script-tag shim would break on strict-CSP
sites such as X and TikTok, which are the Sources that matter most.

## Building

You need Xcode, not only the Command Line Tools, because `safari-web-extension-converter`
ships with the full IDE.

```bash
pnpm --filter @pond/extension build:safari
open apps/extension/dist/safari/Pond/Pond.xcodeproj
```

Run the `Pond` scheme, enable the extension in Safari's settings, then `pnpm dev` for
the desktop side as usual.

## Site access must be granted before anything runs

Safari does not run a web extension's content scripts on any site until the user allows
it, and `<all_urls>` in the manifest does not imply that permission. After enabling the
extension, open **Settings → Extensions → Pond** and allow it for the sites you save
from, or use **Always Allow on Every Website…**. Until then the background script loads
and the popup opens, but no content script ever injects and hooks stay silent — which
looks like a broken build rather than a permission prompt.

## What is verified and what is not

Verified on macOS 27.0.1 with Safari 27.0.1 and Xcode 27.1:

- The handler compiles into the Safari App Extension and its framing round-trips over a
  real Unix socket, in both directions.
- The converted Xcode project builds, `pluginkit` registers it as
  `com.apple.Safari.web-extension`, and the bundle passes
  `codesign --verify --deep --strict`.
- SafariWebDriver creates sessions once **Allow remote automation** is on in Settings →
  Developer, and the extension appears under Settings → Extensions with its description,
  permissions, and shortcuts.
- `world: "MAIN"` **works**. On Pinterest the page's own world ends up with
  `window.__pondInterceptors` holding the `pinterest` interceptor, with `patchedFetch`
  and `patchedXhr` both true. The converter's "unsupported key" warning for `world` is
  about its own manifest reading, not about Safari refusing the key.
- `runtime.sendNativeMessage` reaches Pond through the handler: `hello`, `library.info`,
  and `session.pending` all return real `{"ok":true,...}` payloads from a running Pond.

Not verified:

- **Source connection.** `entrypoints/background/session.ts` reads cookies for nine
  Source domains. Safari's `cookies.getAll` and ITP behave differently from Chromium
  around `HttpOnly` and session lifetime, and that has not been tested against a live
  signed-in session.
- **Full-page capture.** The stitching loop in `entrypoints/background/screenshot.ts`
  depends on `captureVisibleTab` rate limits; Safari's differ and have not been measured.
