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

Library Encryption protects item files, portable metadata, thumbnails, backups, and the search index at rest. Pond derives a random Library key from your password or recovery key and keeps the unlocked key in the main process only. Touch ID can authorize access to wrapped key material on supported Macs.

Locking closes the Library index, clears folder sessions and key material, and denies Library access through IPC, the `pond://` protocol, loopback HTTP, native messaging, MCP, and Agent operations. Folder passwords hide every Save contained by a locked folder or locked ancestor.

Backups preserve ciphertext and security metadata. Password-protected Pond packages use separate package keys. Features that hand a file to another app create a permission-restricted temporary plaintext copy and remove it after use, timeout, or Library lock.

Initial encryption creates a verified plaintext migration backup beside the Library. Pond shows its location after setup. Move it to encrypted storage or delete it after you verify the encrypted Library.

Encryption does not protect content while the Library is unlocked or against a process that controls your operating-system account. Logs, global preferences, and files you export may remain plaintext. Keep full-disk encryption and standard account security enabled.

## Best practices for users

- Rotate the ingest token if you suspect it was exposed (menu bar → **Rotate Ingest Token**).
- Only load the Pond extension from [official GitHub Releases](https://github.com/raphaelsalaja/pond/releases) or a build you compiled yourself.
