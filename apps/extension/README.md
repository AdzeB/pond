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

## App page

Click the toolbar icon to open the full-page Pond extension UI (not a tiny popup):

1. **Link your desktop app.** If Pond is already running on this machine, the extension links automatically. Otherwise paste a token from Pond’s menu bar → **Copy Pairing Token**.
2. **Connect [Source].** When you’re on a source site (X, Instagram, …), confirm to push cookies.
3. Otherwise a linked status page shows that capture is running in the background.

## State gallery

With `pnpm --filter @pond/extension dev` running:

```
http://localhost:3001/entrypoints/gallery/index.html
http://localhost:3001/entrypoints/app/index.html
```

Or `chrome-extension://<id>/gallery.html` / `app.html`. Gallery is omitted from production `zip` builds.

## Supported sources

See [`docs/supported-sources.md`](../../docs/supported-sources.md) for the full list.

## Scripts

| Script | What it does |
|--------|--------------|
| `pnpm dev` | WXT dev server on port 3001 |
| `pnpm build` | Production build to `.output/` |
| `pnpm zip` | Build + zip for distribution |
