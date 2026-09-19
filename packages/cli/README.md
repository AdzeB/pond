# @pond/cli

Use Pond from scripts, terminals, and local agents. The CLI connects to Pond's
authenticated loopback API. It never opens Library databases or files
directly.

## Install

```bash
npm install --global @pond/cli
```

Open Pond Settings, copy the Local API token, then authorize the CLI:

```bash
pond auth authorize --token <token>
pond doctor
```

## Examples

```bash
pond saves search typography --md
pond saves get <id> --json
pond download https://example.com
printf '%s\n' https://example.com https://example.org | pond download --stdin
pond folders list --table
pond schema --json --compact
```

Run `pond help` or `pond <command> --help` for the full command surface.
Structured output includes a schema version. Stdout contains data, while
progress and diagnostics use stderr.

Destructive commands use Pond's operation previews. Interactive terminals can
confirm a preview. Automation must pass `--yes`.
