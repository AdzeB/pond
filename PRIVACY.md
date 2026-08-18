# Privacy

Pond is a **local-first** application. Your library, index, and preferences live on your Mac. Pond does not operate a cloud sync service and does not collect usage telemetry.

## What stays on your machine

- **Library**: `~/Pond/My Pond.pond/` (or a location you choose). This is the source of truth for your saves.
- **App state**: `~/Library/Application Support/pond/` (SQLite index, preferences, logs).
- **Secrets**: The ingest token used by the browser extension is stored in the macOS Keychain via Electron `safeStorage`.
- **Pipeline logs**: Diagnostic events are written locally to SQLite and `electron-log` files. They are not sent to Pond or any third party.

## Browser extension

The Pond extension talks only to a **local HTTP server** on `127.0.0.1:41610` on your Mac. Saves and session data sent from the extension never leave your machine through Pond's servers. There are no Pond-operated servers in this path.

## Platform sync

When you sync a source (X, Instagram, Pinterest, etc.), Pond uses **your own authenticated browser session** on your machine. Pond does not store your platform passwords on any remote service. Traffic originates from your account and is subject to each platform's terms.

## Ask and enrichments

Ask and enrichment run **on your Mac**. Natural-language search uses Minnow, a bundled on-device model downloaded to Application Support on first use. Captions, text in images, transcripts, and embeddings use Transformers.js / ONNX locally. Pond does not send prompts or library content to hosted AI APIs.

## On-device ML

Some features (e.g. local embeddings) run entirely on your Mac via Transformers.js / ONNX. No network call is made for those models once downloaded.

## Changes

This policy may be updated as Pond evolves. The canonical copy lives in the [GitHub repository](https://github.com/raphaelsalaja/pond/blob/main/PRIVACY.md).
