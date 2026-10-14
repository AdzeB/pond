# Pond for Raycast

Search your active Pond Library, save URLs, open Saves, and switch recent
Libraries from Raycast. Every request stays on your Mac and uses Pond's
authenticated loopback API.

## Setup

1. Keep Pond open or enable **Launch at Login** and **Launch in Background**.
2. Open **Pond Settings → General → Raycast**.
3. Select **Copy Token**.
4. Open the Pond extension preferences in Raycast.
5. Paste the token into **Local API Token**.

The default API address is `http://127.0.0.1:41610/api/v2`. Update **Local API
URL** if you changed Pond's local API port.

## Commands

- **Search Library** finds Saves and opens them in Pond or at their original URL.
- **Save URL** saves a URL you enter.
- **Save Clipboard URL** saves an `http` or `https` URL from the clipboard.
- **Switch Library** lists available recent Libraries and reopens Pond in one.
- **Open Library** opens the active Library in Pond.

## Development

Run Pond, copy its Local API Token, then start the extension:

```bash
pnpm --dir apps/raycast develop
```

This is the one workspace package that does not use the `catalog:` protocol.
`@raycast/api` pins `@types/node` and `@types/react` to exact versions as peer
dependencies, and `ray build` validates against them, so `react` and both type
packages stay on the versions Raycast requires rather than the catalog's.
