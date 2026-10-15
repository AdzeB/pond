> The web is a sea of information. Everyone deserves their own pond.

## Install

Download the latest `.dmg` from [GitHub Releases](https://github.com/raphaelsalaja/pond/releases), or install it with Homebrew:

```bash
brew tap raphaelsalaja/pond https://github.com/raphaelsalaja/pond
brew install --cask raphaelsalaja/pond/pond
```

Pond needs macOS 13 or later, on Apple Silicon or Intel. It's signed and notarized, and it updates itself from GitHub Releases. Windows and Linux are on the [roadmap](ROADMAP.md).

### Browser extension

Saving from the web and connecting accounts in Sources both need the Pond extension. It works in Chrome, Arc, Brave, and Edge.

1. In Pond, open the library menu at the top of the sidebar, choose **Browser Extension**, then click **Download**. A Pond Extension folder lands in Downloads. You can also download `pond-extension-X.Y.Z.zip` from the release, or build it from source with [`apps/extension/README.md`](apps/extension/README.md).
2. Open `chrome://extensions`, turn on Developer mode, click **Load unpacked**, and choose the folder.
3. Click the Pond icon or right-click a page to save. Pond must have opened once so the extension can reach it.

### Raycast extension

The Raycast extension searches your active Library, saves URLs, opens Saves,
and switches recent Libraries. See
[`apps/raycast/README.md`](apps/raycast/README.md) for setup.

### CLI

Install the local automation client from npm:

```bash
npm install --global @pond/cli
pond auth authorize --token <token>
pond doctor
```

Copy the Local API token from Pond Settings. The CLI launches Pond when needed
and sends every Library operation through the authenticated loopback service.
Run `pond --help` for commands and output formats.

## Development

Requires Node.js 24 (see `.nvmrc`) and pnpm 11.27.0.

```bash
pnpm install
pnpm dev
```

Extension dev (separate terminal):

```bash
pnpm --filter @pond/extension dev
```

Raycast extension dev (separate terminal):

```bash
pnpm --dir apps/raycast develop
```

CLI development:

```bash
pnpm cli -- --help
pnpm cli:build
```

If native modules fail after an Electron upgrade:

```bash
pnpm --filter @pond/desktop rebuild
```

See [`apps/desktop/README.md`](apps/desktop/README.md) for architecture and on-disk layout. Before contributing, read the [contributor guide](CONTRIBUTING.md), [code standards](docs/contributing/code-standards.md), and [desktop architecture](docs/contributing/architecture.md). Run `pnpm check` and `pnpm build` from the repository root to verify a change.

## Assistant and MCP

Assistant lives in the right column. It searches this library with a key you paste in Settings, or a local host you run such as Ollama or LM Studio. Pond never stores those keys on a Pond server.

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

Copy the exact command from Settings → Model Context Protocol → Advanced. Pond does not host a public MCP URL.

## Library

The desktop library is a three-column DAM: folder sidebar, image list, Assistant. Folders, Uncategorized, List layout, and Eagle import that keeps folder trees ship in this cut.

See the [roadmap](ROADMAP.md) for what's next. Not on it: Eagle Cloud, their Plugin Center store, or Photoshop-class format preview.

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
challenge/checkpoint. You can turn off automatic fetching at any time in
Settings → Harvesting.

That said, **you are responsible for your own use** of each platform under its
Terms of Service. Pond is a personal tool for organizing things you've already
saved; use it accordingly. If you're writing or reviewing a source adapter, see
the [`CONTRIBUTING`](CONTRIBUTING.md) "Add a source" section for the boundaries
adapter authors are expected to respect.

Read [Responsible use](RESPONSIBLE-USE.md) before you connect an account.

## Documentation

- [License](LICENSE)
- [Privacy](PRIVACY.md)
- [Responsible Use](RESPONSIBLE-USE.md)
- [Roadmap](ROADMAP.md)
- [Security](SECURITY.md)
- [Releasing](RELEASING.md)
- [Contributing](CONTRIBUTING.md)
- [Extension](apps/extension/README.md)
- [Raycast Extension](apps/raycast/README.md)
- [Supported File Formats](docs/supported-formats.md)
