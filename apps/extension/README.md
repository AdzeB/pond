# @pond/extension

Browser extension that captures saves from supported sites into your local Pond library.

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

## Pair with Pond

1. Install and launch the [Pond desktop app](https://github.com/raphaelsalaja/pond/releases).
2. Click the Pond menu bar icon → **Copy Pairing Token**.
3. Open the extension popup and paste the `pond://pair?...` link (or enter it in the pairing field).
4. The popup should show **Connected** when Pond is running.

If pairing fails, confirm Pond is open and try copying a fresh token. Use **Rotate Ingest Token** in the menu bar if you suspect the old token was revoked.

## Supported sources

See [`docs/supported-sources.md`](../../docs/supported-sources.md) for the full list.

## Scripts

| Script | What it does |
|--------|--------------|
| `pnpm dev` | WXT dev server on port 3001 |
| `pnpm build` | Production build to `.output/` |
| `pnpm zip` | Build + zip for distribution |
