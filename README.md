> The web is a sea of information. Everyone deserves their own pond.

## Install

Download the latest `.dmg` from [GitHub Releases](https://github.com/raphaelsalaja/pond/releases). Requires macOS 12 or later (Apple Silicon and Intel builds are published separately). Windows builds can be produced locally and have not been tested.

**First open (unsigned build):** macOS may block the app with "developer cannot be verified." Right-click the app → **Open**, or go to **System Settings → Privacy & Security → Open Anyway**.

### Browser extension

Capture from the web requires the Pond extension:

1. Download `pond-extension-X.Y.Z.zip` from the same release (or build from source; see [`apps/extension/README.md`](apps/extension/README.md)).
2. Load unpacked in Chrome (`chrome://extensions` → Developer mode).
3. Open Pond once so it can register the native host, then click the Pond icon or right-click a page to save.

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

See [`apps/desktop/README.md`](apps/desktop/README.md) for architecture and on-disk layout. Before contributing, read the [contributor guide](CONTRIBUTING.md), [code standards](docs/contributing/code-standards.md), and [desktop architecture](docs/contributing/architecture.md). Run `pnpm check` and `pnpm build` from the repository root to verify a change.

## Agent and MCP

Agent lives in the right column. It searches this library with a key you paste in Settings, or a local host you run such as Ollama or LM Studio. Pond never stores those keys on a Pond server.

Cursor, Claude, and other MCP hosts can search the same library. Pond speaks MCP over stdio. This block belongs in Cursor `mcp.json`. It launches Pond as a local stdio server (`--mcp`) against the library on this Mac:

```json
{
  "mcpServers": {
    "pond": {
      "command": "/Applications/Pond.app/Contents/MacOS/Pond",
      "args": ["--mcp"]
    }
  }
}
```

Copy the exact command from Settings → Agent. Pond does not host a public MCP URL.

## Library

The desktop library is a three-column DAM: folder sidebar, image list, Agent. Folders, Uncategorized, List layout, and Eagle import that keeps folder trees ship in this cut.

Later on the same app: ratings, duplicate merge, spacebar browse, GIF/video frame tools, annotations, batch rename, detached windows, a JS plugin host, and Agent as an MCP host. Not on the list: Eagle Cloud, their Plugin Center store, or Photoshop-class format preview.

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
- [Supported File Formats](docs/supported-formats.md)
