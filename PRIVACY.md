# Privacy

Pond is a **local-first** application. Your library, index, and preferences live on your Mac. Pond does not operate a cloud sync service and does not collect usage telemetry.

## What stays on your machine

- **Library** — `~/Pond/My Pond.pond/` (or a location you choose). This is the source of truth for your saves.
- **App state** — `~/Library/Application Support/pond/` (SQLite index, preferences, logs).
- **Secrets** — The ingest token used by the browser extension is stored in the macOS Keychain via Electron `safeStorage`.
- **Pipeline logs** — Diagnostic events are written locally to SQLite and `electron-log` files. They are not sent to Pond or any third party.

## Browser extension

The Pond extension talks only to a **local HTTP server** on `127.0.0.1:41610` on your Mac. Saves and session data sent from the extension never leave your machine through Pond's servers — there are no Pond-operated servers in this path.

## Platform sync

When you sync a source (X, Instagram, Pinterest, etc.), Pond uses **your own authenticated browser session** on your machine. Pond does not store your platform passwords on any remote service. Traffic originates from your account and is subject to each platform's terms.

## Optional AI features

If you configure AI providers in Settings (OpenAI, Anthropic, Google, Ollama, etc.), prompts and content you send for enrichment, search, or skills are transmitted **directly to the provider you chose**, using API keys stored in your local Keychain. Pond does not proxy or retain that traffic on a central server. Disable AI features or remove provider keys if you do not want any external network use.

## On-device ML

Some features (e.g. local embeddings) run entirely on your Mac via Transformers.js / ONNX. No network call is made for those models once downloaded.

## Changes

This policy may be updated as Pond evolves. The canonical copy lives in the [GitHub repository](https://github.com/raphaelsalaja/pond/blob/main/PRIVACY.md).
