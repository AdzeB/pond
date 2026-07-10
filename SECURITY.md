# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a vulnerability

If you discover a security issue in Pond, please report it responsibly:

1. **Do not** open a public GitHub issue for undisclosed vulnerabilities.
2. Email or DM the maintainer via GitHub: [@raphaelsalaja](https://github.com/raphaelsalaja).
3. Include steps to reproduce, impact, and affected version if known.

We aim to acknowledge reports within a few days and will coordinate disclosure once a fix is available.

## Security model (summary)

### Local ingest API

The desktop app exposes an HTTP API on `127.0.0.1:41610` for the browser extension. Requests require a bearer token (the ingest token). The server enforces origin allowlists and rate-limits failed auth attempts. Only processes on your machine can reach this port under normal OS firewall defaults.

### IPC

Renderer ↔ main IPC handlers validate the sending frame. Untrusted web content cannot invoke privileged channels.

### Extension pairing

Pairing uses a `pond://pair` deep link with a token copied from the menu bar. Treat the pairing token like a local API secret — anyone with access to your Mac while Pond is running could use it.

### Library data

Your `.pond` library bundle is readable by any process with filesystem access to your user account. Use full-disk encryption and standard macOS account security.

## Best practices for users

- Rotate the ingest token if you suspect it was exposed (menu bar → **Rotate Ingest Token**).
- Only load the Pond extension from [official GitHub Releases](https://github.com/raphaelsalaja/pond/releases) or a build you compiled yourself.
- Review AI provider settings if you want to avoid sending content to third-party APIs.
