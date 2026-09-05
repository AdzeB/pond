# Browser harvest contracts

`browser-validation.ts` owns the schemas used while reading untrusted page and API data. It uses Zod Mini so the generated browser payload stays small. Instagram and TikTok normalize parsed records; Cosmos and Reddit use the shared scalar and object schemas while collecting paginated results.

Harvest expressions execute in the page without Node imports or Pond globals. `generate-harvest-validation.mjs` bundles the schemas into a standalone IIFE and writes `browser-validation-source.ts`. Expression builders embed that bundle and create validators once per expression, then pass them into normalizers and collectors. Never import runtime values into a function that is serialized with `toString()` unless its expression builder explicitly supplies them.

From the repository root:

```sh
node apps/desktop/scripts/generate-harvest-validation.mjs
node apps/desktop/scripts/generate-harvest-validation.mjs --check
```

Edit the schema source, regenerate, and commit both files. The check command compares generated output without rewriting it. It does not depend on icon generation or licensed assets. The colocated tests execute generated expressions in a fresh JavaScript context and cover malformed optional fields, scalar validation, and page authentication results.
