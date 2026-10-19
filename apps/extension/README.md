# @pond/extension

Browser extension that saves pages, screenshots, and images into your local Pond library, captures what you bookmark on supported sites, and pushes signed-in cookies when you connect a source.

## Install

Get the extension from [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/desktop%40pond.so/) or the Chrome Web Store, or open Pond and choose **Browser Extension** from the library menu.

Open Pond once so it can register the native host. On macOS this writes a manifest into each installed browser's native messaging folder. On Windows it registers the host under per-user `HKEY_CURRENT_USER` registry keys for Chrome, Edge, Brave, and other supported browsers.

## Use

- Click the Pond icon to open the panel. Add tags or folders, then click **Save Page**, or pick a capture tool: visible area, region, element, full page, or images on the page.
- Right-click a page, link, image, or video to save it, or to start a screenshot.
- On supported sites, the usual save or bookmark control also sends the item to your library. Likes are optional per source.
- In the extension's settings, make the toolbar button save in one click, turn off on-page confirmations, or choose which sources to capture.
- Keyboard shortcuts: `Alt+Shift+P` opens the panel, `Alt+Shift+S` saves the page. Region screenshots have no default shortcut.

Session connect happens in the background when Pond is waiting and you open that site signed in.

## Supported sources

See [`docs/supported-sources.md`](../../docs/supported-sources.md) for the full list.

## Layout

| Path | What it holds |
| --- | --- |
| `entrypoints/background/` | Service worker: captures, screenshots, menus, session connect |
| `entrypoints/hooks.content.ts` | Isolated-world bridge that validates and relays site saves |
| `entrypoints/hooks-main.content.ts` | Main-world hooks that watch each site's save and like requests |
| `entrypoints/overlay.content/` | On-page toasts, region and element pickers, and the image collector, in a shadow root |
| `entrypoints/popup/` | Toolbar panel |
| `entrypoints/options/` | Settings page |
| `sources/` | One folder per supported site |

## Develop

```bash
pnpm install
pnpm --filter @pond/extension build
```

Load `apps/extension/.output/chrome-mv3` unpacked from `chrome://extensions`, or `apps/extension/.output/firefox-mv3/manifest.json` from `about:debugging`. Unpacked Chromium builds keep a pinned `key`, so their ID matches the native host's allowed origins.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | WXT dev server on port 3001 |
| `pnpm build` | Production builds for Chrome and Firefox in `.output/` |
| `pnpm zip` | Build and zip both browsers for local testing |
| `pnpm zip:store` | Store zips without the pinned `key`, plus the AMO sources zip |
| `pnpm test` | Unit tests |

## Build from source for AMO review

The sources zip holds the workspace packages the extension imports. From its root, with the Node version in `.nvmrc` and pnpm installed:

```bash
pnpm install --filter @pond/extension...
pnpm --filter @pond/extension build:firefox
```

The build lands in `apps/extension/.output/firefox-mv3`.
