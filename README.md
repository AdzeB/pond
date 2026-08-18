> The web is a sea of information. Everyone deserves their own pond.

## Install

Download the latest `.dmg` from [GitHub Releases](https://github.com/raphaelsalaja/pond/releases). Requires macOS 12 or later (Apple Silicon and Intel builds are published separately).

**First open (unsigned build):** macOS may block the app with "developer cannot be verified." Right-click the app → **Open**, or go to **System Settings → Privacy & Security → Open Anyway**.

### Browser extension

Capture from the web requires the Pond extension:

1. Download `pond-extension-X.Y.Z.zip` from the same release (or build from source; see [`apps/extension/README.md`](apps/extension/README.md)).
2. Load unpacked in Chrome (`chrome://extensions` → Developer mode).
3. Pair: Pond menu bar → **Copy Pairing Token** → paste the `pond://pair?...` link in the in-page toolbar.

## Development

Requires Node.js 22 (see `.nvmrc`) and pnpm 11.

```bash
pnpm install
pnpm dev
```

Extension dev (separate terminal):

```bash
pnpm --filter @pond/extension dev
```

If native modules fail after an Electron upgrade:

```bash
pnpm --filter @pond/desktop rebuild
```

See [`apps/desktop/README.md`](apps/desktop/README.md) for architecture and on-disk layout.

## How sourcing works (and your responsibility)

Pond's source adapters run entirely through **your own authenticated browser
session, on your own machine**. There are no Pond-operated scraping servers and
no credential harvesting. Pond never sees or stores your platform passwords or
cookies on any remote service. When you import from a source, a hidden local
browser window loads the pages you already have access to and reads what's on
them.

Because that traffic comes from your account, Pond is deliberately conservative:
a built-in rate governor paces every request, respects platform rate-limit
signals (`retry-after` and friends), backs off instead of escalating, persists
cooldowns across restarts, and hard-stops a source if it detects a
challenge/checkpoint. You can pause all syncing at any time.

That said, **you are responsible for your own use** of each platform under its
Terms of Service. Pond is a personal tool for organizing things you've already
saved; use it accordingly. If you're writing or reviewing a source adapter, see
the [`CONTRIBUTING`](CONTRIBUTING.md) "Add a source" section for the boundaries
adapter authors are expected to respect.

## Documentation

- [References](references.md)
- [License](LICENSE)
- [Privacy](PRIVACY.md)
- [Security](SECURITY.md)
- [Releasing](RELEASING.md)
- [Contributing](CONTRIBUTING.md)
- [Extension](apps/extension/README.md)
