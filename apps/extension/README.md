# @pond/extension

Browser extension that captures saves from supported sites into your local Pond library, and pushes signed-in cookies when you connect a source.

## Install from a release

1. Download `pond-extension-X.Y.Z.zip` from [GitHub Releases](https://github.com/raphaelsalaja/pond/releases).
2. Unzip the archive.
3. Open Chrome → `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** and select the unzipped folder (e.g. `chrome-mv3`).

## Install from source

```bash
pnpm install
pnpm --filter @pond/extension zip   # produces .output/*.zip
# or for dev with hot reload:
pnpm --filter @pond/extension dev
```

Load unpacked from `apps/extension/.output/chrome-mv3` while developing.

## In-page toolbar

Click the Pond toolbar icon to show a floating bar on the current page (same idea as Figma's capture HUD):

1. Paste a pairing token from Pond's menu bar → **Copy Pairing Token**.
2. Once linked, **Capture Page** sends the current URL into your library.
3. Session connect still happens in the background when Pond is waiting and you open the matching source site signed in.

## State gallery

With `pnpm --filter @pond/extension dev` running:

```
http://localhost:3001/entrypoints/gallery/index.html
```

Or `chrome-extension://<id>/gallery.html`. Gallery is omitted from production `zip` builds.

## Supported sources

See [`docs/supported-sources.md`](../../docs/supported-sources.md) for the full list.

## Scripts

| Script | What it does |
|--------|--------------|
| `pnpm dev` | WXT dev server on port 3001 |
| `pnpm build` | Production build to `.output/` |
| `pnpm zip` | Build + zip for distribution |
