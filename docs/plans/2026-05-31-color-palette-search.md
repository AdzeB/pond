# Color / Palette Search Implementation Plan

> **For agentic workers:** Use the `executing-plans` skill. Steps use checkbox
> (`- [ ]`) syntax. Read `2026-05-31-eagle-features-overview.md` first. This is
> the largest of the nine plans and the only one that adds a native dependency.

**Goal:** Extract a dominant-color palette from image saves and let the user
filter the library by color (pick a swatch, see images whose palette contains a
near match). Mirrors Eagle's color search.

**Architecture:** Add `sharp` (used only in the main process) to extract a small
palette per image at finalize, stored in a new `dominantColors` JSON column
(array of hex strings, most-frequent first). Add a new `color` filter field to
the existing filter system. Color matching is intentionally **in-memory only**:
the renderer already evaluates filters with `matches()` over the pool and does
not call the SQL `saves.find` path, so `buildWhere` returns nothing for color
and the renderer's `matches()` does the nearness test. A backfill command
computes palettes for pre-existing image saves.

**Tech Stack:** `sharp` (main process, N-API so no Electron rebuild needed),
better-sqlite3 + Drizzle, `@pond/schema/filters`, React 19 filter bar. No test
runner: verify with `pnpm --filter @pond/desktop typecheck`,
`pnpm --filter @pond/schema typecheck`, `pnpm lint:check`, manual smoke.

---

## File Structure

- Modify `apps/desktop/package.json`: add `sharp`.
- Create `apps/desktop/src/main/lib/palette.ts`: extract palette from a file path.
- Modify `packages/schema/src/db.ts`: `dominantColors` column.
- Modify `apps/desktop/src/main/db.ts`: boot migration.
- Modify `apps/desktop/src/renderer/src/pool/types.ts` + `reconcile.ts`: surface it.
- Modify `apps/desktop/src/main/core/pipeline/workers/finalize.ts`: compute at finalize.
- Modify `apps/desktop/src/main/ipc/queries/saves.ts`: `saves.backfillColors`.
- Create `packages/schema/src/filters/color.ts`: hex parse + nearness (pure, shared).
- Modify `packages/schema/src/filters/{types,meta,match,to-sql,url}.ts`: the `color` field.
- Modify `apps/desktop/src/renderer/src/components/library/filter-bar/index.tsx`: color swatch chip.
- Modify `apps/desktop/src/renderer/src/components/command-palette/registry/actions.ts`: "Compute colors" command.

---

## Task 1: Add `sharp`

**Files:**
- Modify: `apps/desktop/package.json`

- [ ] **Step 1: Install**

Run: `pnpm --filter @pond/desktop add sharp`
Expected: `sharp` appears under `dependencies`. sharp ships prebuilt libvips
binaries and uses N-API (ABI-stable), so it loads in Electron's main process
without an electron-rebuild step.

- [ ] **Step 2: Sanity check it loads in the Electron main runtime**

Run: `pnpm --filter @pond/desktop dev`, then in the main process logs confirm no
"sharp" load error at boot (it is imported lazily in later tasks, so this step
just confirms the dependency installed cleanly). Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/package.json pnpm-lock.yaml
git commit -m "build(desktop): add sharp for image palette extraction"
```

---

## Task 2: Palette extraction helper

**Files:**
- Create: `apps/desktop/src/main/lib/palette.ts`

- [ ] **Step 1: Write the extractor**

Resize to a small thumbnail, read raw RGB, quantize to a coarse cube, count
buckets, return the top N as hex.

```ts
import sharp from "sharp";

// Top-N dominant colors as #rrggbb, most frequent first. Returns [] when the
// image can't be decoded.
export async function extractPalette(
  path: string,
  count = 5,
): Promise<string[]> {
  try {
    const size = 32;
    const { data, info } = await sharp(path)
      .resize(size, size, { fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
    for (let i = 0; i + channels - 1 < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Quantize to a 4-bit-per-channel grid to merge near-identical pixels.
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const entry = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      entry.count++;
      entry.r += r;
      entry.g += g;
      entry.b += b;
      buckets.set(key, entry);
    }

    return Array.from(buckets.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, count)
      .map((e) =>
        toHex(
          Math.round(e.r / e.count),
          Math.round(e.g / e.count),
          Math.round(e.b / e.count),
        ),
      );
  } catch {
    return [];
  }
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`

```bash
git add apps/desktop/src/main/lib/palette.ts
git commit -m "feat(color): palette extraction from image files"
```

---

## Task 3: `dominantColors` column

**Files:**
- Modify: `packages/schema/src/db.ts`
- Modify: `apps/desktop/src/main/db.ts`
- Modify: `apps/desktop/src/renderer/src/pool/types.ts`, `reconcile.ts`

- [ ] **Step 1: Drizzle column**

In the `saves` table, after `fileSize` (or after the dedup/video columns if
those plans landed):

```ts
    dominantColors: text("dominant_colors", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
```

- [ ] **Step 2: Boot migration**

In `apps/desktop/src/main/db.ts`, add and call:

```ts
function ensureSavesColorColumn(sqlite: Database.Database): void {
  const cols = sqlite
    .prepare<unknown[], { name: string }>("PRAGMA table_info(saves)")
    .all() as { name: string }[];
  if (!cols.some((c) => c.name === "dominant_colors")) {
    sqlite.exec(
      "ALTER TABLE saves ADD COLUMN dominant_colors TEXT NOT NULL DEFAULT '[]'",
    );
  }
}
```

- [ ] **Step 3: Pool**

`pool/types.ts`: add `dominantColors: string[];`. `pool/reconcile.ts`: add
`dominantColors: raw.dominantColors ?? [],`.

- [ ] **Step 4: Verify + commit**

Run: `pnpm --filter @pond/schema typecheck && pnpm --filter @pond/desktop typecheck`

```bash
git add packages/schema/src/db.ts apps/desktop/src/main/db.ts apps/desktop/src/renderer/src/pool
git commit -m "feat(schema): add dominantColors column to saves"
```

---

## Task 4: Compute at finalize + backfill

**Files:**
- Modify: `apps/desktop/src/main/core/pipeline/workers/finalize.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves.ts`

- [ ] **Step 1: Compute in finalize for image saves**

In `runFinalize`, before the complete patch, compute a palette from the cover
file if the save is an image and has none yet:

```ts
  if (save.mediaType === "image" && (save.dominantColors ?? []).length === 0) {
    const cover = (save.files ?? [])[save.coverIndex ?? 0] ?? (save.files ?? [])[0];
    if (cover) {
      const { extractPalette } = await import("../../../lib/palette");
      const { itemFile } = await import("../../../paths");
      const colors = await extractPalette(itemFile(saveId, cover.path));
      if (colors.length > 0) {
        await applySavePatch(saveId, { dominantColors: colors }, {
          actorReason: "color:extract",
        });
      }
    }
  }
```

`itemFile(id, relativePath)` resolves the absolute on-disk path
(`apps/desktop/src/main/paths.ts`).

- [ ] **Step 2: Backfill IPC for existing saves**

In `saves.ts`:

```ts
  async "saves.backfillColors"() {
    const { getDb } = await import("../../db");
    const { saves: savesTable } = await import("@pond/schema/db");
    const { eq } = await import("drizzle-orm");
    const { extractPalette } = await import("../../lib/palette");
    const { itemFile } = await import("../../paths");
    const { applySavePatch } = await import("../../core/pipeline/workers/apply");

    const db = await getDb();
    const rows = db
      .select()
      .from(savesTable)
      .where(eq(savesTable.mediaType, "image"))
      .all();

    let updated = 0;
    for (const row of rows) {
      if ((row.dominantColors ?? []).length > 0) continue;
      const cover = (row.files ?? [])[row.coverIndex ?? 0] ?? (row.files ?? [])[0];
      if (!cover) continue;
      const colors = await extractPalette(itemFile(row.id, cover.path));
      if (colors.length > 0) {
        await applySavePatch(row.id, { dominantColors: colors }, {
          actorReason: "color:backfill",
        });
        updated++;
      }
    }
    return { ok: true, updated };
  },
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`

```bash
git add apps/desktop/src/main/core/pipeline/workers/finalize.ts apps/desktop/src/main/ipc/queries/saves.ts
git commit -m "feat(color): extract palettes at finalize and via backfill"
```

---

## Task 5: Color nearness helper (shared, pure)

**Files:**
- Create: `packages/schema/src/filters/color.ts`

- [ ] **Step 1: Write the helper**

```ts
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Squared Euclidean distance in RGB. Default tolerance ~ a moderate match.
export const DEFAULT_COLOR_TOLERANCE = 60;

export function colorNear(
  targetHex: string,
  palette: ReadonlyArray<string>,
  tolerance = DEFAULT_COLOR_TOLERANCE,
): boolean {
  const target = parseHex(targetHex);
  if (!target) return false;
  const tol2 = tolerance * tolerance;
  for (const hex of palette) {
    const c = parseHex(hex);
    if (!c) continue;
    const dr = c.r - target.r;
    const dg = c.g - target.g;
    const db = c.b - target.b;
    if (dr * dr + dg * dg + db * db <= tol2) return true;
  }
  return false;
}

// A small set of named swatches for the filter UI.
export const COLOR_PRESETS: ReadonlyArray<{ label: string; hex: string }> = [
  { label: "Red", hex: "#e5484d" },
  { label: "Orange", hex: "#f76b15" },
  { label: "Yellow", hex: "#ffe629" },
  { label: "Green", hex: "#30a46c" },
  { label: "Teal", hex: "#12a594" },
  { label: "Blue", hex: "#0091ff" },
  { label: "Purple", hex: "#8e4ec6" },
  { label: "Pink", hex: "#e93d82" },
  { label: "Brown", hex: "#ad7f58" },
  { label: "Gray", hex: "#8d8d8d" },
  { label: "Black", hex: "#1a1a1a" },
  { label: "White", hex: "#fafafa" },
];
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter @pond/schema typecheck`

```bash
git add packages/schema/src/filters/color.ts
git commit -m "feat(color): shared hex parsing, nearness, and swatch presets"
```

---

## Task 6: Add the `color` filter field

**Files:**
- Modify: `packages/schema/src/filters/types.ts`
- Modify: `packages/schema/src/filters/meta.ts`
- Modify: `packages/schema/src/filters/match.ts`
- Modify: `packages/schema/src/filters/to-sql.ts`
- Modify: `packages/schema/src/filters/url.ts` (only if encoding needs a special case)

- [ ] **Step 1: Extend the field id and type unions**

In `types.ts`, add `"color"` to the `FieldId` union and, if `FieldMeta.type` is
a closed union, add `"color"` to it. The predicate value for color is the hex
string; the comparator is `"near"` (add `"near"` to `ComparatorId` if absent).

- [ ] **Step 2: Field metadata**

In `meta.ts`, add to `FIELD_META`:

```ts
  color: {
    id: "color",
    type: "color",
    label: "Color",
    group: "content",
  },
```

- [ ] **Step 3: In-memory match**

In `match.ts` `evalPredicate`, add a case. `SaveLike` must include
`dominantColors`; widen the type there if needed (it mirrors the pool `Save`).

```ts
    case "color": {
      const target = typeof p.value === "string" ? p.value : "";
      if (!target) return null;
      return colorNear(target, s.dominantColors ?? []) ? true : null;
    }
```

Import `colorNear` from `./color`. Confirm the `evalPredicate` return contract
(the investigation shows predicates return `true` / `null`; match that exact
convention, returning `null` for "no opinion" rather than `false`).

- [ ] **Step 4: SQL is a no-op for color**

In `to-sql.ts` `compileForField`, return `null` for `field === "color"` so
`buildWhere` skips it. The renderer filters in memory via `matches()`, so this
is correct; document it with a one-line comment explaining color is
in-memory-only.

- [ ] **Step 5: URL encoding**

The compact encoder writes `f.color=near:%23aabbcc`. Confirm `encodePredicate`/
`decodePredicate` handle a plain string value with the `near` comparator. If the
generic encoder already serializes `cmp:value` for string predicates, no change
is needed beyond the comparator being recognized.

- [ ] **Step 6: Verify**

Run: `pnpm --filter @pond/schema typecheck && pnpm --filter @pond/desktop typecheck`
Expected: PASS. Resolve any non-exhaustive switch errors that surface from the
new `FieldId`/`ComparatorId` members.

- [ ] **Step 7: Commit**

```bash
git add packages/schema/src/filters
git commit -m "feat(color): add color filter field with near matching"
```

---

## Task 7: Color chip in the filter bar

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/library/filter-bar/index.tsx`

- [ ] **Step 1: Render a color chip**

The filter bar maps `FIELD_IDS` to chips and uses `setFieldPredicate(field,
predicate | null)` from `useView()`. Add a chip for `color` whose popover shows
the `COLOR_PRESETS` swatches; selecting one sets the predicate:

```tsx
import { COLOR_PRESETS } from "@pond/schema/filters/color";

// inside the color chip popover:
{COLOR_PRESETS.map((c) => (
  <button
    key={c.hex}
    type="button"
    title={c.label}
    style={{ background: c.hex }}
    className={styles.swatch}
    onClick={() =>
      actions.setFieldPredicate("color", {
        kind: "p",
        field: "color",
        cmp: "near",
        value: c.hex,
      })
    }
  />
))}
```

Add a `.swatch` class to the filter bar's stylesheet (square, rounded, bordered).
The active predicate value (a hex) drives the chip's selected swatch indicator.
Follow the exact chip structure the other fields use in this file.

- [ ] **Step 2: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS.

- [ ] **Step 3: Manual smoke**

Run dev. First run the backfill (Task 8) or save a few colorful images. Open the
Color filter chip, click the Blue swatch: the grid narrows to images whose
palette contains a near-blue. Clear it: all return. Confirm the filter survives
in the URL (`f.color=near:...`) and can be saved as a smart folder.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/filter-bar
git commit -m "feat(color): color swatch filter chip"
```

---

## Task 8: Backfill command

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/command-palette/registry/actions.ts`

- [ ] **Step 1: Add a command**

```ts
  {
    id: "compute-colors",
    label: "Compute colors for images",
    group: "Library",
    perform: async ({ close }) => {
      await window.pond.query("saves.backfillColors", {});
      close();
    },
  },
```

- [ ] **Step 2: Verify + manual smoke**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`. In dev, run the
command on a library with existing images; afterward those images have palettes
(the color filter starts matching them, and the inspector could show swatches if
you add that later).

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/command-palette/registry/actions.ts
git commit -m "feat(color): backfill command for existing images"
```

---

## Self-Review Checklist

- [ ] sharp loads in the Electron main process without a rebuild step.
- [ ] New images get a palette at finalize; existing images via backfill.
- [ ] Color filter narrows the grid by nearness and is URL-serializable.
- [ ] `buildWhere` is a no-op for color; the renderer's `matches()` does the work.
- [ ] `dominantColors` defaults to `[]` so old rows and non-images are safe.
- [ ] All typechecks and `pnpm lint:check` pass.

## Notes / Follow-ups

- The match is RGB-Euclidean for simplicity. If users want better perceptual
  grouping (e.g. distinguishing hue from lightness), convert to HSL/Lab in
  `color.ts` later; the field plumbing does not change.
- An inspector "palette" row showing the extracted swatches is an easy follow-up
  using `save.dominantColors`.
