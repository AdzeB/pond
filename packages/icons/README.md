# @pond/icons

Icon barrels for Pond.

## UI icon budget

Up to **100** Nucleo UI glyphs are vendored under the open-source license terms.
The canonical list lives in [`allowlist.json`](./allowlist.json).

To add a UI icon:

1. Remove an existing glyph from `allowlist.json` and delete its generated module.
2. Add the new glyph via `pnpm --filter @pond/icons generate:icons` (requires a
   one-time local Nucleo install — see `scripts/generate-icons.mjs`).
3. Run `pnpm --filter @pond/icons check:allowlist`.

## Social / brand icons

Icons under `social-media/custom/` are hand-authored brand marks. They are
**outside** the 100-icon budget and can be added freely.
