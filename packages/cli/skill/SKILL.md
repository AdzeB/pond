# Pond CLI

Use the `pond` executable to work with the active local Pond Library. Pond must
be installed. Commands launch the app when its authenticated loopback service
is unavailable.

## Setup

```bash
npm install --global @pond/cli
pond auth authorize --token <token>
pond doctor
```

Copy the Local API token from Pond Settings. The CLI stores it with owner-only
file permissions.

## Agent output

Prefer compact JSON for structured work and Markdown for reading:

```bash
pond saves search design systems --json --compact
pond saves get <id> --md
pond schema --json
```

Stdout contains data. Progress and diagnostics use stderr. Destructive
commands require a preview and confirmation. Pass `--yes` in non-interactive
automation.

## Common commands

```bash
pond libraries current
pond libraries list
pond saves list
pond saves search <terms...>
pond saves get <id...>
pond download <url...>
pond download --stdin --ndjson
pond folders list
pond tags list
pond sources accounts
pond sync history
pond downloads list
pond duplicates list
pond views list
pond stats
pond schema
```

Use `pond operations list` and `pond operations get <name>` to discover exact
operation schemas. Run a discovered operation with:

```bash
pond operations run <name> --args '{"field":"value"}' --dry-run
pond operations run <name> --args '{"field":"value"}' --yes
```
