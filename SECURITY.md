# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.0.x   | Yes       |

## Reporting a vulnerability

If you discover a security issue in Pond, report it responsibly:

1. **Do not** open a public GitHub issue for undisclosed vulnerabilities.
2. Email or DM the maintainer via GitHub: [@raphaelsalaja](https://github.com/raphaelsalaja).
3. Include steps to reproduce, impact, and affected version if known.

We aim to acknowledge reports within a few days and will coordinate disclosure once a fix is available.

## Security model (summary)

### Browser extension

The extension talks to Pond through Chrome native messaging (`so.pond.host`). Chrome launches a small host binary that Pond registers; only this extension ID is allowed. Saves and session cookies stay on your Mac.

A loopback HTTP API on `127.0.0.1:41610` still exists for debugging. It requires the ingest token.

### IPC

Renderer ↔ main IPC handlers validate the sending frame. Untrusted web content cannot invoke privileged channels.

### Library data

Pond stores Library files, thumbnails, backups, and the search index unencrypted on your Mac. Logs, preferences, and files you export are also plaintext. Keep FileVault and standard account security on to protect them at rest.

## Best practices for users

- Rotate the ingest token if you suspect it was exposed (menu bar → **Rotate Ingest Token**).
- Only load the Pond extension from [official GitHub Releases](https://github.com/raphaelsalaja/pond/releases) or a build you compiled yourself.
