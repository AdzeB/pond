> The web is a sea of information. Everyone deserves their own pond.

## Getting Started

Download the latest release.

```bash
brew install --cask pond
```

Or grab a `.dmg` from [Releases](https://github.com/raphaelsalaja/pond/releases).

## Development

```bash
pnpm install
pnpm dev
```

## How sourcing works (and your responsibility)

Pond's source adapters run entirely through **your own authenticated browser
session, on your own machine**. There are no Pond-operated scraping servers and
no credential harvesting — Pond never sees or stores your platform passwords or
cookies on any remote service. When you import from a source, a hidden local
browser window loads the pages you already have access to and reads what's on
them.

Because that traffic comes from your account, Pond is deliberately conservative:
a built-in rate governor paces every request, respects platform rate-limit
signals (`retry-after` and friends), backs off instead of escalating, persists
cooldowns across restarts, and hard-stops a source if it detects a
challenge/checkpoint. You can pause all syncing at any time.

That said, **you are responsible for your own use** of each platform under its
Terms of Service. Pond is a personal tool for organising things you've already
saved; use it accordingly. If you're writing or reviewing a source adapter, see
the [`CONTRIBUTING`](CONTRIBUTING.md) "Add a source" section for the boundaries
adapter authors are expected to respect.

## Documentation

- [License](LICENSE)
- [Contributing](CONTRIBUTING.md)
