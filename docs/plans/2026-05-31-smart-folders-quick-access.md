# Smart Folders + Quick Access Implementation Plan

> **For agentic workers:** Use the `executing-plans` skill. Steps use checkbox
> (`- [ ]`) syntax. Read `2026-05-31-eagle-features-overview.md` first.

**Goal:** Let the user save the current filter as a named "smart folder" that
appears in the sidebar and reapplies the filter on click, and pin frequently
used smart folders to a Quick Access group. This is the persistence layer for
the filter engine that already exists.

**Architecture:** A smart folder is just a saved filter `Query` plus a name and
a `pinned` flag. Because the filter `Query` is already JSON-serializable and
applied via URL search params (`writeQuery`/`readQuery`), smart folders need no
new on-disk library content and no sync model. Store them in `Prefs` (a new
`smartFolders` section, exactly like the `autoTag` rules pattern), manage them
with `usePrefs("smartFolders")`, and navigate by serializing the saved `Query`
into the URL the same way the Tags page already does with `tagFilterSearch`.
Quick Access is the pinned subset, rendered as a second sidebar group.

**Tech Stack:** React 19, TanStack Router (search params), `@pond/schema/filters`,
Prefs via `settings.getPrefs`/`settings.setPrefs`. No test runner: verify with
`pnpm --filter @pond/desktop typecheck`, `pnpm --filter @pond/schema typecheck`,
`pnpm lint:check`, manual smoke.

---

## File Structure

- Modify `packages/schema/src/db.ts`: `SmartFolder` type + `smartFolders`
  prefs section + default.
- Create `apps/desktop/src/renderer/src/lib/smart-folders.ts`: CRUD over prefs,
  navigation, active-match helper.
- Modify `apps/desktop/src/renderer/src/components/library/sidebar/index.tsx`:
  Smart Folders + Quick Access groups with context menus.
- Modify the view menu to add "Save current filter as smart folder":
  `apps/desktop/src/renderer/src/components/library/view-menu/` (the menu body)
  + reuse `useView()` for the current query.
- Create `apps/desktop/src/renderer/src/components/library/smart-folders/save-dialog/index.tsx` + `styles.module.css`: name prompt.

---

## Task 1: Smart folder type + prefs

**Files:**
- Modify: `packages/schema/src/db.ts`

- [ ] **Step 1: Import the `Query` type and define `SmartFolder`**

At the top of `packages/schema/src/db.ts` add:

```ts
import type { Query } from "./filters/types";
```

Above the `Prefs` interface:

```ts
export interface SmartFolder {
  id: string;
  name: string;
  query: Query;
  icon?: string | null;
  pinned: boolean;
  sortOrder: number;
}
```

Inside `Prefs`:

```ts
  smartFolders: {
    items: SmartFolder[];
  };
```

Inside `DEFAULT_PREFS`:

```ts
  smartFolders: {
    items: [],
  },
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter @pond/schema typecheck && pnpm --filter @pond/desktop typecheck`
Expected: PASS. (Confirm there is no import cycle: `filters/types.ts` must not
import from `db.ts`. It does not, per the filters investigation.)

- [ ] **Step 3: Commit**

```bash
git add packages/schema/src/db.ts
git commit -m "feat(schema): add smartFolders to prefs"
```

---

## Task 2: Smart folder helpers

**Files:**
- Create: `apps/desktop/src/renderer/src/lib/smart-folders.ts`

- [ ] **Step 1: Write CRUD + navigation + active match**

```ts
import { ulid } from "ulid";
import type { SmartFolder } from "@pond/schema/db";
import type { Query } from "@pond/schema/filters/types";
import { writeQuery } from "@pond/schema/filters/url";
import { paramsToSearch } from "./search-schemas";

export function sortFolders(items: ReadonlyArray<SmartFolder>): SmartFolder[] {
  return [...items].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

export function makeSmartFolder(
  name: string,
  query: Query,
  existing: ReadonlyArray<SmartFolder>,
): SmartFolder {
  const maxOrder = existing.reduce((m, f) => Math.max(m, f.sortOrder), 0);
  return {
    id: ulid(),
    name: name.trim(),
    query,
    icon: null,
    pinned: false,
    sortOrder: maxOrder + 1,
  };
}

// Search object to navigate to when applying a folder. Mirrors tagFilterSearch.
export function smartFolderSearch(folder: SmartFolder): Record<string, string | string[]> {
  const params = writeQuery(new URLSearchParams(), folder.query);
  return paramsToSearch(params);
}

// Stable structural comparison for "which folder is active" highlighting.
export function queryEquals(a: Query | null, b: Query | null): boolean {
  return canonical(a) === canonical(b);
}

function canonical(q: Query | null): string {
  if (!q) return "";
  const clauses = [...q.clauses]
    .map((c) => JSON.stringify(c))
    .sort();
  return JSON.stringify({ kind: q.kind, clauses });
}
```

Confirm the import path `@pond/schema/filters/url` matches how the renderer
already imports filter helpers (the investigation shows `tagFilterSearch` is
imported from the filters module; mirror that exact specifier).

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`

```bash
git add apps/desktop/src/renderer/src/lib/smart-folders.ts
git commit -m "feat(smart-folders): crud, navigation, and active-match helpers"
```

---

## Task 3: "Save current filter as smart folder"

**Files:**
- Create: `apps/desktop/src/renderer/src/components/library/smart-folders/save-dialog/index.tsx`
- Create: `.../save-dialog/styles.module.css`
- Modify: the View menu body (`apps/desktop/src/renderer/src/components/library/view-menu/`), where filter actions live.

- [ ] **Step 1: Build the name dialog**

```tsx
import { useState } from "react";
import type { Query } from "@pond/schema/filters/types";
import { usePrefs } from "@/pool/prefs";
import { makeSmartFolder } from "@/lib/smart-folders";
import styles from "./styles.module.css";

export function SaveSmartFolderDialog({
  query,
  open,
  onOpenChange,
}: {
  query: Query;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [smartFolders, patch] = usePrefs("smartFolders");
  const [name, setName] = useState("");

  if (!open) return null;

  const save = () => {
    if (!name.trim()) return;
    const folder = makeSmartFolder(name, query, smartFolders.items ?? []);
    patch({ items: [...(smartFolders.items ?? []), folder] });
    setName("");
    onOpenChange(false);
  };

  return (
    <div className={styles.backdrop} onClick={() => onOpenChange(false)}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className={styles.input}
          placeholder="Smart folder name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") onOpenChange(false);
          }}
        />
        <button type="button" onClick={save} disabled={!name.trim()}>
          Save
        </button>
      </div>
    </div>
  );
}
```

Prefer the project's `Dialog` primitive (used by command palette / quick
capture) over the raw backdrop if it is readily importable; the logic is the
contract.

```css
.backdrop {
  position: fixed; inset: 0; display: grid; place-items: center;
  background: rgba(0, 0, 0, 0.3); z-index: 50;
}
.dialog {
  display: flex; gap: 8px; padding: 12px;
  background: var(--bg-elevated); border-radius: 10px;
  border: 1px solid var(--stroke-secondary);
}
.input { min-width: 240px; }
```

- [ ] **Step 2: Add the trigger in the View menu**

In the View menu body, where filter controls live, add a menu item that opens
the dialog with the current query. The view menu already exposes the query via
`useView()` (`state.query`). Add local `useState` for dialog open and render
`<SaveSmartFolderDialog query={state.query} open={open} onOpenChange={setOpen} />`.
Disable the item when `state.query.clauses.length === 0`.

- [ ] **Step 3: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/smart-folders apps/desktop/src/renderer/src/components/library/view-menu
git commit -m "feat(smart-folders): save the current filter as a smart folder"
```

---

## Task 4: Sidebar Smart Folders + Quick Access groups

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/library/sidebar/index.tsx`

- [ ] **Step 1: Render the groups**

Add below the existing static `Sidebar.Group`. Read folders from prefs, sort,
split by `pinned`, and navigate with `smartFolderSearch`. Use the existing
`Sidebar.Link`, `Sidebar.LinkIcon`, `Sidebar.LinkLabel`, and `useNavigate`.

```tsx
  const [smartFolders, patchFolders] = usePrefs("smartFolders");
  const navigate = useNavigate();
  const folders = useMemo(
    () => sortFolders(smartFolders.items ?? []),
    [smartFolders.items],
  );
  const pinned = folders.filter((f) => f.pinned);
  const unpinned = folders.filter((f) => !f.pinned);

  const goTo = useCallback(
    (folder: SmartFolder) =>
      navigate({ to: "/", search: () => smartFolderSearch(folder), viewTransition: true }),
    [navigate],
  );

  const removeFolder = (id: string) =>
    patchFolders({ items: (smartFolders.items ?? []).filter((f) => f.id !== id) });
  const togglePin = (id: string) =>
    patchFolders({
      items: (smartFolders.items ?? []).map((f) =>
        f.id === id ? { ...f, pinned: !f.pinned } : f,
      ),
    });
```

Then render:

```tsx
      {pinned.length > 0 ? (
        <Sidebar.Group>
          <Sidebar.GroupLabel>Quick Access</Sidebar.GroupLabel>
          {pinned.map((f) => (
            <SmartFolderLink
              key={f.id}
              folder={f}
              onOpen={goTo}
              onUnpin={() => togglePin(f.id)}
              onRemove={() => removeFolder(f.id)}
            />
          ))}
        </Sidebar.Group>
      ) : null}

      {unpinned.length > 0 ? (
        <Sidebar.Group>
          <Sidebar.GroupLabel>Smart Folders</Sidebar.GroupLabel>
          {unpinned.map((f) => (
            <SmartFolderLink
              key={f.id}
              folder={f}
              onOpen={goTo}
              onPin={() => togglePin(f.id)}
              onRemove={() => removeFolder(f.id)}
            />
          ))}
        </Sidebar.Group>
      ) : null}
```

If `Sidebar.GroupLabel` does not exist, use whatever label element the sidebar
already uses for section headers, or render a plain styled `<span>`; do not
invent a new exported primitive.

- [ ] **Step 2: Add the `SmartFolderLink` sub-component**

A `Sidebar.Link` wrapped in the project's context-menu primitive (the same one
used by `TrashLink`) exposing Pin/Unpin and Remove:

```tsx
function SmartFolderLink({
  folder,
  onOpen,
  onPin,
  onUnpin,
  onRemove,
}: {
  folder: SmartFolder;
  onOpen: (f: SmartFolder) => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onRemove: () => void;
}) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        render={
          <Sidebar.Link onClick={() => onOpen(folder)}>
            <Sidebar.LinkIcon><Folder /></Sidebar.LinkIcon>
            <Sidebar.LinkLabel>{folder.name}</Sidebar.LinkLabel>
          </Sidebar.Link>
        }
      />
      <ContextMenu.Content>
        {onPin ? <ContextMenu.Item onSelect={onPin}>Pin to Quick Access</ContextMenu.Item> : null}
        {onUnpin ? <ContextMenu.Item onSelect={onUnpin}>Unpin</ContextMenu.Item> : null}
        <ContextMenu.Item onSelect={onRemove}>Remove</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}
```

Match the exact context-menu primitive and `Sidebar.Link` props used by the
existing `TrashLink` in this file. Import `Folder` from `lucide-react`.

- [ ] **Step 3: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS.

- [ ] **Step 4: Manual smoke**

Run dev. Apply a filter (e.g. source = twitter + a tag). Open the View menu,
"Save current filter as smart folder", name it. It appears under Smart Folders.
Navigate away (click Library), then click the smart folder: the same filter
reapplies (URL shows the `f.*` params and the grid narrows). Right-click ->
Pin: it moves to Quick Access. Right-click -> Remove: it disappears. Relaunch
and confirm folders persist (prefs are stored in SQLite settings).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/sidebar/index.tsx
git commit -m "feat(smart-folders): sidebar smart folders and quick access groups"
```

---

## Task 5: Active-state highlight (polish)

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/library/sidebar/index.tsx`

- [ ] **Step 1: Mark the folder whose query matches the URL**

Read the current query from the URL the way the library view does
(`useSearch({ strict: false })` -> `searchToParams` -> `readQuery`), then set an
active flag on the matching `SmartFolderLink` using `queryEquals`:

```tsx
  const search = useSearch({ strict: false });
  const currentQuery = useMemo(() => readQuery(searchToParams(search)), [search]);
  // pass active={queryEquals(currentQuery, folder.query)} into SmartFolderLink
```

Apply the sidebar's existing active styling (the same `data-active` or
`aria-current` mechanism `Sidebar.Link` already uses for routes).

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`. In dev, applying
a folder highlights it; changing a filter chip removes the highlight.

```bash
git add apps/desktop/src/renderer/src/components/library/sidebar/index.tsx
git commit -m "feat(smart-folders): highlight the active smart folder"
```

---

## Self-Review Checklist

- [ ] Saving the current filter creates a folder; empty filter is not saveable.
- [ ] Clicking a folder reapplies its exact filter (URL params match).
- [ ] Pin/unpin moves a folder between Quick Access and Smart Folders.
- [ ] Folders persist across relaunch (stored in prefs).
- [ ] No import cycle between `db.ts` and `filters/types.ts`.
- [ ] All typechecks and `pnpm lint:check` pass.

## Notes / Follow-ups

- Reordering within a group (drag) is out of scope; `sortOrder` exists so it can
  be added later.
- Quick Access could later also pin tags or sources; today it pins smart
  folders only, which covers the core "frequently used view" need.
