# @pond/icons

Icon barrels for Pond. UI glyphs under `fill/*` and `outline/*` are vendored
Nucleo SVGs (≤100 unique glyphs). Social and brand marks live under
`social-media/custom/` and `providers/` and are outside that cap.

## Regenerating UI glyphs

Requires the `nucleo-ui-*` packages installed temporarily (with a
`NUCLEO_LICENSE_KEY`):

1. Add the four `nucleo-ui-*` dependencies back to this package.
2. Run `pnpm install` with the license key available.
3. Run `pnpm --filter @pond/icons generate:icons`.
4. Drop the `nucleo-ui-*` dependencies again and reinstall.

`pnpm --filter @pond/icons check:allowlist` runs in CI and fails if the app
imports a glyph outside `allowlist.json`.
