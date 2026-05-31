# Single-Key Categorize Overlay Implementation Plan

> **For agentic workers:** Use the `executing-plans` skill. Steps use checkbox
> (`- [ ]`) syntax. Read `2026-05-31-eagle-features-overview.md` first.

**Goal:** Press `f` with one or more saves selected to open a fast,
keyboard-driven overlay for assigning tags (and, with the smart-folders plan,
optionally moving items into a smart folder's filter). This mirrors Eagle's
category tool "F" and fits Pond's keyboard-first model.

**Architecture:** Add an `f` handler to the existing save-shortcut effect
(`effects/save-shortcuts.tsx`), guarded by the same `isTypingTarget` and
`isChordPending` checks the file already uses, that opens a new overlay via an
imperative module store (the exact pattern `lib/presentation.ts` uses). The
overlay reuses the existing tag picker logic against either the multi-selection
(`useSelectedIds`) or the single primary selection (`primarySelection`), and
writes through `setSaveTags` (`window.pond.query("tags.setForSave")`) per
selected save. There is already a menu dispatch for `find.filter` keyed to `f`
that has no renderer handler; this plan claims `f` for categorize and leaves
search on its existing `/` and Cmd+F affordances.

**Tech Stack:** React 19, TanStack Store, existing tag picker + selection pool.
No test runner: verify with `pnpm --filter @pond/desktop typecheck`,
`pnpm lint:check`, manual smoke.

---

## File Structure

- Create `apps/desktop/src/renderer/src/lib/categorize.ts`: imperative open/close store (mirrors `lib/presentation.ts`).
- Create `apps/desktop/src/renderer/src/components/library/categorize/index.tsx` + `styles.module.css`: the overlay.
- Modify `apps/desktop/src/renderer/src/effects/save-shortcuts.tsx`: bind `f`.
- Modify `apps/desktop/src/renderer/src/components/shell/app-root.tsx`: mount the overlay.
- Modify `packages/schema/src/keyboard.ts`: document the shortcut.

---

## Task 1: Categorize store

**Files:**
- Create: `apps/desktop/src/renderer/src/lib/categorize.ts`

- [ ] **Step 1: Mirror the presentation store pattern**

Read `apps/desktop/src/renderer/src/lib/presentation.ts` and copy its shape
(module-level store + `useSyncExternalStore` hook + `open`/`close`). Target IDs
are the selection at open time:

```ts
import { useSyncExternalStore } from "react";

interface CategorizeState {
  open: boolean;
  ids: string[];
}

let state: CategorizeState = { open: false, ids: [] };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const categorize = {
  open(ids: string[]) {
    if (ids.length === 0) return;
    state = { open: true, ids };
    emit();
  },
  close() {
    state = { open: false, ids: [] };
    emit();
  },
  get(): CategorizeState {
    return state;
  },
};

export function useCategorize(): CategorizeState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
```

If `presentation.ts` uses TanStack `Store` instead of `useSyncExternalStore`,
match that implementation exactly rather than this hand-rolled version.

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`

```bash
git add apps/desktop/src/renderer/src/lib/categorize.ts
git commit -m "feat(categorize): add imperative overlay store"
```

---

## Task 2: The overlay component

**Files:**
- Create: `apps/desktop/src/renderer/src/components/library/categorize/index.tsx`
- Create: `.../categorize/styles.module.css`

- [ ] **Step 1: Build the overlay**

It shows how many items are targeted, a tag input that adds a tag to every
target via `setSaveTags`, and closes on Escape/Enter. Reuse the tag
normalization already used in quick capture.

```tsx
import { useCallback, useEffect, useState } from "react";
import { categorize, useCategorize } from "@/lib/categorize";
import { pool } from "@/pool/pool";
import styles from "./styles.module.css";

export function Categorize() {
  const { open, ids } = useCategorize();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) setValue("");
  }, [open]);

  const apply = useCallback(async () => {
    const tags = value
      .split(/[\s,]+/)
      .map((t) => t.replace(/^#+/, "").toLowerCase())
      .filter(Boolean);
    if (tags.length === 0) {
      categorize.close();
      return;
    }
    await Promise.all(
      ids.map((id) => {
        const save = pool.get(id);
        if (!save) return Promise.resolve();
        const merged = [...save.tags];
        for (const t of tags) {
          if (!merged.some((x) => x.toLowerCase() === t)) merged.push(t);
        }
        return window.pond.query("tags.setForSave", { saveId: id, tags: merged });
      }),
    );
    categorize.close();
  }, [value, ids]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={() => categorize.close()}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.count}>
          Add tags to {ids.length} item{ids.length === 1 ? "" : "s"}
        </div>
        <input
          autoFocus
          className={styles.input}
          placeholder="tags, comma separated"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void apply();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              categorize.close();
            }
          }}
        />
      </div>
    </div>
  );
}
```

For a richer picker (autocomplete against existing tags, starred/recent
sections), swap the raw `<input>` for the existing tag-picker component; the
selection-driven `setSaveTags` loop above is the contract either way.

- [ ] **Step 2: Stylesheet**

```css
.backdrop {
  position: fixed; inset: 0; display: grid; place-items: start center;
  padding-top: 18vh; background: rgba(0, 0, 0, 0.3); z-index: 60;
}
.panel {
  display: flex; flex-direction: column; gap: 8px; min-width: 360px;
  padding: 12px; border-radius: 12px;
  background: var(--bg-elevated); border: 1px solid var(--stroke-secondary);
}
.count { font-size: 12px; color: var(--text-tertiary); }
.input { font-size: 14px; padding: 6px 8px; }
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`

```bash
git add apps/desktop/src/renderer/src/components/library/categorize
git commit -m "feat(categorize): add the categorize overlay component"
```

---

## Task 3: Mount the overlay + bind `f`

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/shell/app-root.tsx`
- Modify: `apps/desktop/src/renderer/src/effects/save-shortcuts.tsx`

- [ ] **Step 1: Mount the overlay**

In `app-root.tsx`, next to `<CommandPalette />` / `<QuickCapture.Root />`:

```tsx
      <Categorize />
```

Import it from `@/components/library/categorize`.

- [ ] **Step 2: Bind `f` in the save-shortcut effect**

`save-shortcuts.tsx` already early-returns on `isTypingTarget(e.target)` and
`isChordPending()`, and computes the focused save. Add a case alongside the
existing single-key actions (`o`, `c`, `r`, `t`). Use the multi-selection when
present, else the single focused save:

```tsx
        case "f": {
          e.preventDefault();
          const selected = selection.snapshot();
          const ids = selected.length > 0 ? selected : id ? [id] : [];
          if (ids.length > 0) categorize.open([...ids]);
          return;
        }
```

Import `selection` from `@/pool/selection` and `categorize` from
`@/lib/categorize`. Confirm `id` is the focused-save id already computed near
the top of the handler (the file uses `primarySelection.get()`).

- [ ] **Step 3: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS.

- [ ] **Step 4: Manual smoke**

Run dev. Select 3 cards (Cmd/Shift+click). Press `f`. The overlay shows "Add
tags to 3 items". Type `inspiration, todo`, press Enter. All 3 cards gain both
tags. Press `f` with a single focused card and no multi-selection: it targets
that one. Confirm typing in the toolbar search does not trigger `f`
(`isTypingTarget` guard).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/src/components/shell/app-root.tsx apps/desktop/src/renderer/src/effects/save-shortcuts.tsx
git commit -m "feat(categorize): open the categorize overlay with f"
```

---

## Task 4: Document the shortcut

**Files:**
- Modify: `packages/schema/src/keyboard.ts`

- [ ] **Step 1: Add a catalog entry**

In `KEYBOARD_SHORTCUTS`, add (matching the existing `KeyboardShortcut` shape):

```ts
  {
    id: "categorize",
    group: "saving",
    binding: "F",
    label: "Add tags to selection",
  },
```

If a `find.filter` entry currently claims `F` and is unused by the renderer,
update its binding or remove it to avoid showing a conflicting bare-`F` entry in
the cheatsheet.

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter @pond/schema typecheck && pnpm --filter @pond/desktop typecheck`

```bash
git add packages/schema/src/keyboard.ts
git commit -m "feat(categorize): document the F shortcut"
```

---

## Self-Review Checklist

- [ ] `f` does nothing while typing in an input (guarded).
- [ ] Multi-selection and single focused save both work as targets.
- [ ] Tags merge (no duplicates) across every targeted save.
- [ ] Escape and backdrop click close without applying; Enter applies.
- [ ] Cheatsheet shows the new shortcut with no duplicate `F` binding.
- [ ] All typechecks and `pnpm lint:check` pass.
