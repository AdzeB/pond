# Duplicate + Similar Detection Implementation Plan

> **For agentic workers:** Use the `executing-plans` skill. Steps use checkbox
> (`- [ ]`) syntax. Read `2026-05-31-eagle-features-overview.md` first.

**Goal:** Help the user find and clean up redundant saves: exact duplicates
(byte-identical files) and visually similar images (different resolution or
format). Harvesting the same media across several platforms is the main source
of duplication.

**Architecture:** Two independent detectors behind one "Duplicates" view.
**Exact** duplicates need no new data: every `SaveFile` already stores a
`sha256` (`packages/schema/src/db.ts:47-55`), so grouping saves by shared file
hash is a pure in-memory pass over the pool. **Similar** images use a 64-bit
average hash (aHash) computed in the renderer from the already-rendered thumbnail
(an 8x8 grayscale canvas), persisted to a new `phash` column so the work is
done once, then clustered by Hamming distance. No new main process dependency;
all decoding uses the browser canvas the renderer already has.

**Tech Stack:** React 19, canvas 2D, TanStack Router/Store, better-sqlite3 +
Drizzle, `applySavePatch`. No test runner: verify with
`pnpm --filter @pond/desktop typecheck`, `pnpm --filter @pond/schema typecheck`,
`pnpm lint:check`, manual smoke.

---

## File Structure

- Modify `packages/schema/src/db.ts`: add `phash` column to `saves`.
- Modify `apps/desktop/src/main/db.ts`: boot migration for `phash`.
- Modify `apps/desktop/src/main/ipc/queries/saves.ts`: `saves.setPhash`.
- Create `apps/desktop/src/renderer/src/lib/phash.ts`: aHash + Hamming.
- Create `apps/desktop/src/renderer/src/lib/duplicates.ts`: grouping/clustering.
- Create `apps/desktop/src/renderer/src/routes/_library/duplicates.tsx`: the view.
- Create `apps/desktop/src/renderer/src/components/library/duplicates/index.tsx` + `styles.module.css`: group list UI.
- Modify `apps/desktop/src/renderer/src/components/command-palette/registry/actions.ts`: "Find duplicates" command.

---

## Task 1: Add the `phash` column

**Files:**
- Modify: `packages/schema/src/db.ts:82-99` (saves columns)
- Modify: `apps/desktop/src/main/db.ts` (migrate)

- [ ] **Step 1: Add the column to the Drizzle schema**

In the `saves` table definition, add after `fileSize`:

```ts
    phash: text("phash"),
```

- [ ] **Step 2: Add the boot migration**

In `apps/desktop/src/main/db.ts`, add a helper modeled on
`ensureSavesPipelineColumns` and call it inside `migrate()`:

```ts
function ensureSavesPhashColumn(sqlite: Database.Database): void {
  const cols = sqlite
    .prepare<unknown[], { name: string }>("PRAGMA table_info(saves)")
    .all() as { name: string }[];
  if (!cols.some((c) => c.name === "phash")) {
    sqlite.exec("ALTER TABLE saves ADD COLUMN phash TEXT");
  }
}
```

Call `ensureSavesPhashColumn(sqlite)` alongside the other `ensure*` calls in
`migrate()`.

- [ ] **Step 3: Add `phash` to the renderer pool type + reconcile**

In `apps/desktop/src/renderer/src/pool/types.ts` add `phash: string | null;`
to the `Save` interface, and in `apps/desktop/src/renderer/src/pool/reconcile.ts`
add `phash: raw.phash ?? null,` to the normalizer.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @pond/schema typecheck && pnpm --filter @pond/desktop typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/schema/src/db.ts apps/desktop/src/main/db.ts apps/desktop/src/renderer/src/pool
git commit -m "feat(schema): add phash column for perceptual image hashing"
```

---

## Task 2: aHash + Hamming utilities

**Files:**
- Create: `apps/desktop/src/renderer/src/lib/phash.ts`

- [ ] **Step 1: Write the hashing helpers**

```ts
// 64-bit average hash (aHash). Returns 16 lowercase hex chars, or null if the
// image can't be decoded. Cheap, order-of-magnitude good enough for "these two
// look alike" clustering of saved media.
export async function computeAHash(src: string): Promise<string | null> {
  const img = await loadImage(src);
  if (!img) return null;
  const size = 8;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const gray: number[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray.push(g);
    sum += g;
  }
  const avg = sum / gray.length;

  let bits = "";
  for (const g of gray) bits += g >= avg ? "1" : "0";

  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/lib/phash.ts
git commit -m "feat(duplicates): add aHash and hamming-distance helpers"
```

---

## Task 3: Persist computed hashes

**Files:**
- Modify: `apps/desktop/src/main/ipc/queries/saves.ts`

- [ ] **Step 1: Add `saves.setPhash`**

```ts
  async "saves.setPhash"(params) {
    const id = String(params.id ?? "");
    const phash = params.phash != null ? String(params.phash) : null;
    if (!id) return { ok: false };
    const { applySavePatch } = await import(
      "../../core/pipeline/workers/apply"
    );
    await applySavePatch(id, { phash }, { actorReason: "duplicates:phash" });
    return { ok: true };
  },
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`

```bash
git add apps/desktop/src/main/ipc/queries/saves.ts
git commit -m "feat(duplicates): persist perceptual hash via saves.setPhash"
```

---

## Task 4: Grouping + clustering logic

**Files:**
- Create: `apps/desktop/src/renderer/src/lib/duplicates.ts`

- [ ] **Step 1: Write the pure functions**

```ts
import type { Save } from "@/pool/types";
import { hammingDistance } from "./phash";

export interface DuplicateGroup {
  key: string;
  saves: Save[];
}

// Exact duplicates: saves sharing any identical file sha256.
export function groupExactDuplicates(saves: ReadonlyArray<Save>): DuplicateGroup[] {
  const byHash = new Map<string, Save[]>();
  for (const s of saves) {
    if (s.deletedAt) continue;
    for (const f of s.files ?? []) {
      if (!f.sha256) continue;
      const arr = byHash.get(f.sha256) ?? [];
      if (!arr.includes(s)) arr.push(s);
      byHash.set(f.sha256, arr);
    }
  }
  return Array.from(byHash.entries())
    .filter(([, arr]) => arr.length > 1)
    .map(([key, arr]) => ({ key, saves: arr }));
}

// Similar images: single-link clustering over aHash within `threshold` bits.
const DEFAULT_THRESHOLD = 8;

export function clusterSimilar(
  saves: ReadonlyArray<Save>,
  threshold = DEFAULT_THRESHOLD,
): DuplicateGroup[] {
  const items = saves.filter((s) => !s.deletedAt && s.phash);
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) && parent.get(r) !== r) r = parent.get(r) as string;
    return r;
  };
  const union = (a: string, b: string) => {
    parent.set(find(a), find(b));
  };
  for (const s of items) parent.set(s.id, s.id);

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (hammingDistance(a.phash as string, b.phash as string) <= threshold) {
        union(a.id, b.id);
      }
    }
  }

  const byRoot = new Map<string, Save[]>();
  for (const s of items) {
    const root = find(s.id);
    const arr = byRoot.get(root) ?? [];
    arr.push(s);
    byRoot.set(root, arr);
  }
  return Array.from(byRoot.entries())
    .filter(([, arr]) => arr.length > 1)
    .map(([key, arr]) => ({ key, saves: arr }));
}
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`

```bash
git add apps/desktop/src/renderer/src/lib/duplicates.ts
git commit -m "feat(duplicates): exact-hash grouping and similar-image clustering"
```

---

## Task 5: Duplicates view + backfill

**Files:**
- Create: `apps/desktop/src/renderer/src/components/library/duplicates/index.tsx`
- Create: `apps/desktop/src/renderer/src/components/library/duplicates/styles.module.css`
- Create: `apps/desktop/src/renderer/src/routes/_library/duplicates.tsx`

- [ ] **Step 1: Write the component**

It reads the pool, backfills missing hashes (chunked, with progress), then
renders exact and similar groups with a trash action per item (reuse the
existing trash action `lib/save-actions.ts` or `window.pond.tx` trash).

```tsx
import { useCallback, useMemo, useState } from "react";
import { useSaves } from "@/pool/hooks";
import { computeAHash } from "@/lib/phash";
import { buildPondUrl } from "@/pool/url";
import { pickPrimaryFile } from "@/pool/media";
import {
  clusterSimilar,
  groupExactDuplicates,
  type DuplicateGroup,
} from "@/lib/duplicates";
import styles from "./styles.module.css";

export function DuplicatesView() {
  const saves = useSaves();
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(0);

  const imagesNeedingHash = useMemo(
    () =>
      saves.filter(
        (s) => !s.deletedAt && !s.phash && s.mediaType === "image",
      ),
    [saves],
  );

  const scan = useCallback(async () => {
    setScanning(true);
    setDone(0);
    for (const s of imagesNeedingHash) {
      const file = pickPrimaryFile(s);
      if (!file) {
        setDone((d) => d + 1);
        continue;
      }
      const hash = await computeAHash(buildPondUrl(s.id, file));
      if (hash) {
        await window.pond.query("saves.setPhash", { id: s.id, phash: hash });
      }
      setDone((d) => d + 1);
    }
    setScanning(false);
  }, [imagesNeedingHash]);

  const exact = useMemo(() => groupExactDuplicates(saves), [saves]);
  const similar = useMemo(() => clusterSimilar(saves), [saves]);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1>Duplicates</h1>
        {imagesNeedingHash.length > 0 ? (
          <button type="button" onClick={scan} disabled={scanning}>
            {scanning
              ? `Scanning ${done}/${imagesNeedingHash.length}`
              : `Scan ${imagesNeedingHash.length} images for similar`}
          </button>
        ) : null}
      </header>

      <Section title="Exact duplicates" groups={exact} />
      <Section title="Similar images" groups={similar} />
    </div>
  );
}

function Section({ title, groups }: { title: string; groups: DuplicateGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2>{`${title} (${groups.length})`}</h2>
      {groups.map((g) => (
        <div key={g.key} className={styles.group}>
          {g.saves.map((s) => {
            const file = pickPrimaryFile(s);
            return (
              <figure key={s.id} className={styles.item}>
                {file ? (
                  <img src={buildPondUrl(s.id, file)} alt={s.title ?? ""} />
                ) : null}
                <figcaption>{s.title ?? s.url}</figcaption>
              </figure>
            );
          })}
        </div>
      ))}
    </section>
  );
}
```

If `pickPrimaryFile` is not exported from `pool/media.ts`, use the documented
`pickPrimaryUnit` or select `s.files[s.coverIndex ?? 0]` directly.

- [ ] **Step 2: Write the stylesheet**

```css
.root { padding: 16px; display: flex; flex-direction: column; gap: 24px; }
.header { display: flex; align-items: center; justify-content: space-between; }
.section { display: flex; flex-direction: column; gap: 12px; }
.group {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 8px; border: 1px solid var(--stroke-tertiary); border-radius: 8px;
}
.item { width: 140px; margin: 0; }
.item img { width: 100%; border-radius: 6px; display: block; }
.item figcaption {
  font-size: 11px; color: var(--text-tertiary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
```

- [ ] **Step 3: Register the route**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { DuplicatesView } from "@/components/library/duplicates";

export const Route = createFileRoute("/_library/duplicates")({
  component: DuplicatesView,
});
```

The TanStack Router plugin regenerates `routeTree.gen.ts` on dev/build; do not
hand-edit it.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS (router types regenerate during `dev`/`build`; if typecheck runs
before generation, run `pnpm --filter @pond/desktop dev` once to regenerate
`routeTree.gen.ts`, then re-run typecheck).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/duplicates apps/desktop/src/renderer/src/routes/_library/duplicates.tsx
git commit -m "feat(duplicates): add duplicates view with exact and similar groups"
```

---

## Task 6: Make the view reachable

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/command-palette/registry/actions.ts`

- [ ] **Step 1: Add a command**

```ts
  {
    id: "find-duplicates",
    label: "Find duplicates",
    group: "Library",
    perform: ({ navigate, close }) => {
      navigate("/duplicates", { viewTransition: true });
      close();
    },
  },
```

Match the exact `Command` shape and `navigate` signature already used by the
sibling commands in this file.

- [ ] **Step 2: Verify + manual smoke**

Run dev. Cmd+K, "Find duplicates". Expect: the view opens. Import the same
image twice (via the manual-import feature) and confirm it appears under Exact
duplicates. Click Scan, then confirm two visually similar images (e.g. a JPEG
and a resized PNG of the same picture) cluster under Similar images.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/command-palette/registry/actions.ts
git commit -m "feat(duplicates): add command-palette entry for the duplicates view"
```

---

## Self-Review Checklist

- [ ] Exact duplicates group with zero new hashing (uses stored `sha256`).
- [ ] Similar scan persists `phash` once; re-opening the view does not rescan.
- [ ] Clustering is single-link union-find, no duplicate group membership.
- [ ] Trash from the duplicates view updates the pool and removes the item.
- [ ] All typechecks and `pnpm lint:check` pass.

## Notes / Follow-ups

- aHash is intentionally coarse. If false positives are noticeable, lower the
  threshold (Task 4 `DEFAULT_THRESHOLD`) or upgrade to dHash/pHash later.
- When the color-search plan adds `sharp`, perceptual hashing can move to the
  ingest pipeline (main process) and drop the renderer backfill.
