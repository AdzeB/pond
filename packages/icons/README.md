# @pond/icons

Icon barrels for Pond.

## Development

The `fill/*` and `outline/*` barrels re-export the `nucleo-ui-*` npm packages
directly, so every Nucleo UI glyph is available while developing.

## Release

Before release, swap the npm packages for vendored glyphs so the open-source
repo only ships the icons Pond actually uses (up to 100 under Nucleo's
open-source terms):

1. Run `pnpm --filter @pond/icons generate:icons` to extract the used glyphs
   into committed modules under `generated/` and write `allowlist.json`.
2. Point the barrels at `generated/` instead of the npm packages.
3. Drop the `nucleo-ui-*` dependencies and re-enable
   `pnpm --filter @pond/icons check:allowlist` in CI.

## Social / brand icons

Icons under `social-media/custom/` are hand-authored brand marks. They are
independent of Nucleo and can be added freely.
