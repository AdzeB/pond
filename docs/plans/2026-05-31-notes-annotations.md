# Notes / Annotations UI Implementation Plan

> **For agentic workers:** Use the `executing-plans` skill. Steps use checkbox
> (`- [ ]`) syntax. Read `2026-05-31-eagle-features-overview.md` first for the
> shared verify/mutation/IPC conventions.

**Goal:** Let the user view and edit a free-text note on any save from the
inspector. The `saves.notes` column, on-disk `annotation`, and search scoring
already exist; this plan adds the missing editor UI and makes it persist
through the standard undoable mutation path.

**Architecture:** Add a `Notes` section to the existing inspector preview pane
(`components/save/preview/pane/index.tsx`), modeled on the pane's existing
`contentEditable` title field, which already persists via `window.pond.tx`
(undoable) with optimistic pool updates. No schema change, no IPC change: the
`notes` column and `tx` `update` path are already wired end-to-end.

**Tech Stack:** React 19, CSS Modules, TanStack Store pool, `window.pond.tx`.
No test runner: verify with `pnpm --filter @pond/desktop typecheck`,
`pnpm lint:check`, and manual smoke.

---

## File Structure

- Modify `apps/desktop/src/renderer/src/components/save/preview/pane/index.tsx`
 : add a `PaneNotes` sub-component and a `Notes` `PaneSection`.
- Modify the pane's `styles.module.css` (same folder): add `.notes-input`.

Everything stays inside the preview-pane component folder, which already owns
its `styles.module.css` (per `AGENTS.md` CSS ownership rule).

---

## Task 1: Add the notes editor to the preview pane

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/save/preview/pane/index.tsx`
- Modify: `apps/desktop/src/renderer/src/components/save/preview/pane/styles.module.css`

- [ ] **Step 1: Add the `PaneNotes` component**

Add near the other pane sub-components in `pane/index.tsx`. It mirrors the
title field's optimistic + `tx` pattern (the file already imports `pool`,
`optimistic`, and uses `window.pond.tx`). Use a `<textarea>` committed on blur:

```tsx
function PaneNotes({ save }: { save: Save }) {
  const [draft, setDraft] = useState(save.notes ?? "");

  // Keep the local draft in sync when the selected save changes or a sync
  // action updates notes from elsewhere (e.g. undo).
  useEffect(() => {
    setDraft(save.notes ?? "");
  }, [save.id, save.notes]);

  const commit = useCallback(async () => {
    const next = draft.trim() || null;
    if (next === (save.notes ?? null)) return;
    const prev = pool.get(save.id);
    if (!prev) return;
    await optimistic(
      () => pool.upsert({ ...prev, notes: next }),
      () => pool.upsert(prev),
      () =>
        window.pond.tx({
          kind: "update",
          model: "save",
          id: save.id,
          patch: { notes: next },
          before: { notes: save.notes },
        }),
    );
  }, [draft, save.id, save.notes]);

  return (
    <textarea
      className={styles["notes-input"]}
      value={draft}
      placeholder="Add a note"
      spellCheck={false}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
    />
  );
}
```

Confirm `useState`, `useEffect`, `useCallback` are imported from React in this
file (the title field already uses `useCallback`); add `useState`/`useEffect`
to the import if missing.

- [ ] **Step 2: Render the section in `SavePreview`**

Insert a `Notes` section after the `Tags` section (`pane/index.tsx:155-169`):

```tsx
      <PaneSection label="Notes">
        <PaneNotes save={save} />
      </PaneSection>
```

- [ ] **Step 3: Add the textarea styling**

In `pane/styles.module.css`:

```css
.notes-input {
  width: 100%;
  min-height: 64px;
  resize: vertical;
  border: 1px solid var(--stroke-tertiary, transparent);
  border-radius: 8px;
  padding: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 1.4;
}

.notes-input::placeholder {
  color: var(--text-quaternary);
}

.notes-input:focus {
  outline: none;
  border-color: var(--stroke-secondary);
}
```

Match the existing token names already used in this stylesheet; if the file
uses different CSS variable names for strokes/placeholder, reuse those instead
of inventing new ones.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS.

- [ ] **Step 5: Manual smoke**

Run `pnpm --filter @pond/desktop dev`. Select a save so the inspector shows.
Type a note, blur (click elsewhere). Expect: note persists. Press Cmd+Z and
confirm the note edit is undone (the title field's `tx` path is undoable, and
notes now uses the same path). Reselect the save from a fresh launch and
confirm the note is still there (proves it reached disk via the executor's
`applyToDisk`).

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/renderer/src/components/save/preview/pane
git commit -m "feat(inspector): add editable notes field to the preview pane"
```

---

## Task 2: Surface a note indicator on cards (optional polish)

Makes the existing `note` filter discoverable by showing which saves have a
note. Skip if you want the minimal slice.

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/library/save-card/index.tsx`
- Modify: that component's `styles.module.css`

- [ ] **Step 1: Render a small note glyph when `save.notes` is non-empty**

In the card, near other metadata badges, add:

```tsx
{save.notes?.trim() ? (
  <span className={styles["note-badge"]} title="Has a note">
    <NotebookPen size={12} />
  </span>
) : null}
```

Import `NotebookPen` from `lucide-react` (the project pins `lucide-react`).

- [ ] **Step 2: Style `.note-badge`**

```css
.note-badge {
  display: inline-flex;
  align-items: center;
  color: var(--text-tertiary);
}
```

- [ ] **Step 3: Verify + manual smoke**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`. In dev, a save
with a note shows the glyph; one without does not. Filtering by `note` (filter
bar) lists only saves with notes.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/save-card
git commit -m "feat(cards): show a badge on saves that have a note"
```

---

## Self-Review Checklist

- [ ] Notes edit, persist, and reach disk (survive relaunch).
- [ ] Note edits are undoable via Cmd+Z (uses `window.pond.tx`).
- [ ] Selecting a different save swaps the draft correctly (no stale text).
- [ ] `pnpm --filter @pond/desktop typecheck` and `pnpm lint:check` pass.
