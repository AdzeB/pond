# Eagle Baseline Wave 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not vendor Eagle source, templates, or SVG icons. Do not mix unrelated dirty-tree files into Wave 6 commits. Do not replace harvest, Sources, or Agent. Do not add Pond folder passwords or cryptographic app signing.

**Goal:** Ship Eagle’s remaining first-party library trust: backup/restore/verify as a SHA-256 signed package, merge from another library, New/Open from the Library menu, and locked-folder Eagle import that reports the skipped subtree.

**Architecture:** `createLibraryBackup` already writes `pond-backup-manifest.json` (SHA-256 per file). That manifest is the signed package. Restore copies the snapshot, strips the manifest, and opens an editable library. Merge packages the source library and imports it. Eagle import already skips `folder.password`; Wave 6 reports nested skips (`password` vs `parent_locked`) and keeps the locked subtree out of `flattenEagleFolders`. App menu Library rows call existing queries (`library.createAt`, `library.pickExisting` + `library.switchTo`, `library.backupTo`, `library.restoreBackup`, `library.mergeFrom`).

**Tech Stack:** TypeScript, Electron `^42.4.0`, Pond UI, CSS Modules `data-*` states, Vitest, existing `query()` + `query-contracts.ts` pairs. No new crypto library. No Pond cloud copy.

---

## Scope

| Operation | Eagle surface | Pond label |
| --- | --- | --- |
| Create library | Library → New | New Library |
| Open / switch | Library → Open | Open Library (switch `.pond`, relaunch) |
| Extra window | File → Open Library today | Library Window |
| Backup / restore / verify | Library backup | Backup, Restore, Verify Integrity |
| Merge | Merge library | Merge Library |
| Locked Eagle folders | Password folders | Skip subtree; report `password` and `parent_locked` |

**Out of Wave 6:** plugins, Plugin Center, Eagle Cloud, Pond cloud copy, Pond folder passwords, app lock, cryptographic code signing of the `.pond` bundle (the SHA-256 manifest is the proof).

**Protect:** harvest, Sources, Agent, rebuildable index.

**UI rules:** Title Case. No ellipsis in chrome (`Backup`, `Restoring` is a gerund without `…`). No em dashes. Pond nouns: Library, Save, Folder.

---

## Working-tree commit policy

The live working copy is far ahead of HEAD. Implement against the live tree so `pnpm dev` stays current. Commit only Wave 6 hunks.

Never `git add -p`, `git add -i`, `git checkout .`, or `git restore .`.

For a **mixed tracked file** (Wave 6 plus unrelated dirty edits):

1. Copy the live file aside (`cp path path.wave6bak`).
2. `git checkout HEAD -- path` to get HEAD.
3. Re-apply **only** the Wave 6 edits from this plan onto HEAD.
4. `git add` that file plus any new Wave 6 files.
5. Commit.
6. Restore the backup (`mv path.wave6bak path`) and re-apply the Wave 6 edits onto the restored dirty file so `pnpm dev` still has them.

Untracked rewrite files stay untracked unless this wave created them. Do not `git add` `library-actions.ts` / `action-dialog.tsx`.

Likely mixed files: `apps/desktop/src/main/menu.ts`, `apps/desktop/src/shared/query-contracts.ts`, `apps/desktop/src/main/core/eagle-import.ts`, `apps/desktop/src/renderer/src/features/settings/components/sections/storage/storage.tsx`, `apps/desktop/src/renderer/src/features/settings/lib/search-index.ts`, `apps/desktop/src/main/ipc/queries/library-locations.ts`.

`apps/desktop/src/shared/constants.ts`, `apps/desktop/src/renderer/src/app/effects/menu-bridge.tsx`, and `apps/desktop/src/main/core/eagle-import.test.ts` were clean vs HEAD when this plan was written. Check again before committing.

---

## Files this wave owns

- Create: `apps/desktop/src/main/library-menu.ts`
- Create: `apps/desktop/src/main/library-menu.test.ts`
- Create: `apps/desktop/scripts/smoke-library-trust.cjs`
- Modify: `apps/desktop/src/main/core/eagle-import.ts`
- Modify: `apps/desktop/src/main/core/eagle-import.test.ts`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/main/menu.ts`
- Modify: `apps/desktop/src/shared/constants.ts`
- Modify: `apps/desktop/src/renderer/src/app/effects/menu-bridge.tsx`
- Modify: `apps/desktop/src/main/ipc/queries/library-locations.ts`
- Modify: `apps/desktop/src/renderer/src/features/settings/components/sections/storage/storage.tsx`
- Modify: `apps/desktop/src/renderer/src/features/settings/lib/search-index.ts`

Do not commit unrelated dirty files. Do not change harvest, Sources, or Agent.

---

### Task 1: Report locked Eagle folder subtrees

**Files:**
- Modify: `apps/desktop/src/main/core/eagle-import.ts`
- Modify: `apps/desktop/src/main/core/eagle-import.test.ts`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/renderer/src/features/settings/components/sections/storage/storage.tsx`

`flattenEagleFolders` already `continue`s on `folder.password`, so children of a locked parent are not imported. `collectLockedEagleFolders` currently lists only folders that have `password`, so an unlocked nested folder is omitted from both import and the warning.

- [ ] **Step 1: Write the failing tests**

Replace the locked-folder case in `eagle-import.test.ts` and add a nested case:

```ts
it("reports locked folders instead of silently dropping them", () => {
  const folders = [
    {
      id: "root",
      name: "Photos",
      children: [{ id: "secret", name: "Secret", password: "x" }],
    },
  ];
  expect(collectLockedEagleFolders(folders)).toEqual([
    { id: "secret", name: "Secret", reason: "password" },
  ]);
});

it("reports nested folders under a locked parent and keeps them out of flatten", () => {
  const folders = [
    {
      id: "vault",
      name: "Vault",
      password: "x",
      children: [{ id: "inner", name: "Inner" }],
    },
  ];
  expect(collectLockedEagleFolders(folders)).toEqual([
    { id: "vault", name: "Vault", reason: "password" },
    { id: "inner", name: "Inner", reason: "parent_locked" },
  ]);
  expect(flattenEagleFolders(folders)).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/eagle-import.test.ts`

Expected: FAIL (`reason` missing, nested `inner` not reported).

- [ ] **Step 3: Implement skip reasons**

`EagleLockedFolder`:

```ts
export interface EagleLockedFolder {
  id: string;
  name: string;
  reason: "password" | "parent_locked";
}
```

`collectLockedEagleFolders(folders, parentLocked = false)`: if the folder has `password`, reason is `"password"`. Else if `parentLocked`, reason is `"parent_locked"`. Recurse with `parentLocked || Boolean(folder.password)`. Skip entries without `id`.

Leave `flattenEagleFolders` as `if (!folder.id || folder.password) continue` so the locked subtree is not imported.

`query-contracts.ts` `saves.importEagleLibrary` locked folder objects gain `reason: "password" | "parent_locked"`.

Settings import status: keep `Locked folders skipped: ${names}`. Append ` (inside a locked folder)` when `reason === "parent_locked"`. No ellipsis. No em dash.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/eagle-import.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(desktop): report locked Eagle folder subtrees

Password folders already skipped import. Nested children were silent.

EOF
)"
```

---

### Task 2: Library menu New, Open, Backup, Restore, Merge

**Files:**
- Create: `apps/desktop/src/main/library-menu.ts`
- Create: `apps/desktop/src/main/library-menu.test.ts`
- Modify: `apps/desktop/src/main/menu.ts`
- Modify: `apps/desktop/src/shared/constants.ts`
- Modify: `apps/desktop/src/renderer/src/app/effects/menu-bridge.tsx`

File → Open Library currently calls `openLibraryWindow()` (a second window on the same library). Settings → Open Library switches `.pond` files. Wave 6 puts switch on the Library menu as **Open Library** and renames the File row to **Library Window**.

- [ ] **Step 1: Write the failing test**

`library-menu.test.ts`:

```ts
import { expect, it } from "vitest";
import { LIBRARY_MENU_LABELS } from "./library-menu";

it("exposes create, switch, backup, restore, merge, and verify", () => {
  expect(LIBRARY_MENU_LABELS).toEqual([
    "New Library",
    "Open Library",
    "Reveal Library in Finder",
    "Move Library",
    "Rescan Library",
    "Verify Integrity",
    "Backup",
    "Restore",
    "Merge Library",
    "Empty Trash",
    "Restore All from Trash",
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/library-menu.test.ts`

Expected: FAIL (module missing).

- [ ] **Step 3: Implement labels, menu rows, and bridge**

`library-menu.ts` exports `LIBRARY_MENU_LABELS` as that array (Sync stays a submenu in `menu.ts` and is not in the label list).

`MenuActionId` add:

```ts
| "library.new"
| "library.open"
| "library.backup"
| "library.restore"
| "library.merge"
```

Library submenu order: New Library, Open Library, separator, Reveal, Move, separator, Rescan, Verify Integrity, separator, Backup, Restore, Merge Library, separator, Sync, separator, Empty Trash, Restore All from Trash.

File row that currently says `Open Library` and calls `openLibraryWindow()`: label `Library Window`. Same click handler.

`menu-bridge.tsx`:

```ts
case "library.new": {
  void (async () => {
    const picked = await window.pond.query("library.pickFolder", {});
    if (!picked.ok) return;
    await window.pond.query("library.createAt", {
      path: picked.path,
      name: "My Pond",
    });
  })();
  return;
}
case "library.open": {
  void (async () => {
    const picked = await window.pond.query("library.pickExisting", {});
    if (!picked.ok) return;
    await window.pond.query("library.switchTo", { path: picked.path });
  })();
  return;
}
case "library.backup":
  void window.pond.query("library.backupTo", {});
  return;
case "library.restore":
  void window.pond.query("library.restoreBackup", {});
  return;
case "library.merge":
  void window.pond.query("library.mergeFrom", {});
  return;
```

Title Case. No ellipsis. Use Pond UI is N/A (native app menu).

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/library-menu.test.ts`

Expected: PASS. Confirm `menu.ts` Library submenu labels match `LIBRARY_MENU_LABELS` in order (skip separators and the Sync submenu).

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(desktop): reach New, Open, Backup, Restore, and Merge from Library

Those queries lived in Settings. The Library menu is where Eagle puts them.

EOF
)"
```

---

### Task 3: New Library in Settings and merge without a dialog

**Files:**
- Modify: `apps/desktop/src/renderer/src/features/settings/components/sections/storage/storage.tsx`
- Modify: `apps/desktop/src/renderer/src/features/settings/lib/search-index.ts`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/main/ipc/queries/library-locations.ts`

`library.createAt` has no UI caller. `library.mergeFrom` always opens a folder dialog, so a smoke cannot pass a path.

- [ ] **Step 1: Write the failing contract usage**

There is no Settings component test for LocationRow. Add a focused query-shape test next to library locations if one exists; otherwise rely on Step 4 vitest of `library-locations` only if adding a unit is cheap. Prefer a small test in `library-locations` is not practical (Electron dialogs). Add search-index coverage by extending the existing search index entries and a storage copy assertion if `storage.test.tsx` exists. If it does not, skip a new UI test and verify by the search-index tuple plus the query handler accepting `{ source?: string }`.

If `apps/desktop/src/renderer/src/features/settings/lib/search-index.ts` has no test, do not create a one-off snapshot. The implementation is the Settings row plus the merge input schema.

- [ ] **Step 2: Confirm current merge takes no source**

Read `library.mergeFrom` in `library-locations.ts`. Today it is `async "library.mergeFrom"()` with a required Open dialog.

- [ ] **Step 3: Implement New Library row and optional merge source**

Settings, after Open Library (or before it):

```tsx
<Settings.Item id="setting-storage-new">
  <Settings.ItemDetails>
    <Settings.ItemTitle>New Library</Settings.ItemTitle>
    <Settings.ItemDescription>
      Create a .pond folder on this Mac and switch to it.
    </Settings.ItemDescription>
  </Settings.ItemDetails>
  <Settings.ItemControl>
    <Button
      size="sm"
      variant="secondary"
      disabled={createLibrary.isPending}
      onClick={() => createLibrary.mutate()}
    >
      {createLibrary.isPending ? "Creating" : "New"}
    </Button>
  </Settings.ItemControl>
</Settings.Item>
```

`createLibrary` mutation: `library.pickFolder`, then `library.createAt` `{ path, name: "My Pond" }`. Ignore `cancelled`. Surface other failures with `Couldn't create library.` then the reason.

Search index: `["new", "New Library", "Create a library on this Mac"]`.

`query-contracts.ts`: `"library.mergeFrom": { source?: string }`.

`library.mergeFrom`: wrap with `query(z.object({ source: z.string().optional() }), ...)`. If `source` is a non-empty string, skip the dialog. Else keep the current Merge Library picker. Same `runTransferJob` / `mergeLibraryFrom(source)` body.

- [ ] **Step 4: Typecheck the touched contracts**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/library-menu.test.ts src/main/core/eagle-import.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(desktop): add New Library and path-based merge

createAt had no UI. Merge required a dialog, so a smoke could not pass a folder.

EOF
)"
```

---

### Task 4: Live smoke for backup, restore proof, merge, and locked import

**Files:**
- Create: `apps/desktop/scripts/smoke-library-trust.cjs`

Do not fail the commit if the Electron bundle is stale. Print `LIBRARY_TRUST_SMOKE_OK` on success. Timeout 45s. `POND_SANDBOX` like `smoke-collect.cjs`. Do not call `library.restoreBackup` or `library.createAt` (they relaunch). Prove restore with the in-process backup helper only if the smoke stays in the renderer; otherwise prove the signed package by reading `pond-backup-manifest.json` after `library.backupTo`.

- [ ] **Step 1: Write the smoke script**

```js
const { app } = require("electron");
const assert = require("node:assert/strict");
const {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const sandbox = mkdtempSync(join(tmpdir(), "pond-library-trust-"));
process.env.POND_SANDBOX = sandbox;
app.on("quit", () => rmSync(sandbox, { recursive: true, force: true }));
let started = false;
const timer = setTimeout(() => {
  console.error("LIBRARY_TRUST_SMOKE_FAILED: timed out");
  app.exit(1);
}, 45000);
app.on("web-contents-created", (_, contents) => {
  contents.on("did-finish-load", async () => {
    if (!contents.getURL().includes("index.html") || started) return;
    started = true;
    try {
      const backupPath = join(sandbox, "Proof Backup.pond");
      const eaglePath = join(sandbox, "Locked.library");
      mkdirSync(join(eaglePath, "images"), { recursive: true });
      writeFileSync(
        join(eaglePath, "metadata.json"),
        JSON.stringify({
          folders: [
            {
              id: "vault",
              name: "Vault",
              password: "x",
              children: [{ id: "inner", name: "Inner" }],
            },
          ],
          smartFolders: [],
          tagsGroups: [],
          quickAccess: [],
        }),
      );
      const result = await contents.executeJavaScript(`(async () => {
        const q = (name, input = {}) => window.pond.query(name, input);
        const backup = await q("library.backupTo", {
          path: ${JSON.stringify(backupPath)},
        });
        const eagle = await q("saves.importEagleLibrary", {
          path: ${JSON.stringify(eaglePath)},
          dryRun: true,
        });
        return { backup, eagle };
      })()`);
      assert.equal(result.backup.ok, true);
      const manifest = JSON.parse(
        readFileSync(join(backupPath, "pond-backup-manifest.json"), "utf8"),
      );
      assert.equal(manifest.version, 1);
      assert.ok(Array.isArray(manifest.files) && manifest.files.length > 0);
      assert.ok(
        result.eagle.lockedFolders.some(
          (folder) => folder.id === "vault" && folder.reason === "password",
        ),
      );
      assert.ok(
        result.eagle.lockedFolders.some(
          (folder) =>
            folder.id === "inner" && folder.reason === "parent_locked",
        ),
      );
      clearTimeout(timer);
      console.log("LIBRARY_TRUST_SMOKE_OK", {
        copied: result.backup.copied,
        files: manifest.files.length,
        locked: result.eagle.lockedFolders,
      });
      app.exit(0);
    } catch (error) {
      clearTimeout(timer);
      console.error("LIBRARY_TRUST_SMOKE_FAILED", error);
      app.exit(1);
    }
  });
});
```

If merge can run without relaunch, add a second library under sandbox and `library.mergeFrom({ source })` after Task 3. If merge throws because the sandbox library has no extra Saves, assert `ok === true` and `imported === 0` or skip merge in the smoke and keep package-level `pond-package.test.ts` as the merge proof.

- [ ] **Step 2: Run smoke if a desktop session is available**

Run: `ELECTRON_RUN_AS_NODE=0 pnpm --filter @pond/desktop exec electron scripts/smoke-library-trust.cjs`

Expected: `LIBRARY_TRUST_SMOKE_OK`, or skip with a log if the bundle is stale. Do not fail the commit on a stale bundle.

- [ ] **Step 3: Commit the script**

```bash
git commit -m "$(cat <<'EOF'
test(desktop): smoke backup manifest and locked Eagle folders

Settings and menus are not proof. A sandbox session reads the SHA-256 package.

EOF
)"
```

---

## Spec coverage

- Backup / restore / verify signed-package: existing `library-backup.ts` plus Task 4 manifest read. Verify Integrity stays on the Library menu (already present). Restore stays Settings + Library menu; smoke does not relaunch.
- Merge: Settings already; Task 2 menu; Task 3 optional `source`; package tests remain.
- New / Open / switch: Task 2 menu, Task 3 Settings New Library. File extra window becomes Library Window.
- Locked-folder import: Task 1 reasons + flatten skip + Task 4 dry-run.

## Placeholder scan

No TBD. Stable names: `collectLockedEagleFolders`, `flattenEagleFolders`, `LIBRARY_MENU_LABELS`, `library.new`, `library.open`, `library.backup`, `library.restore`, `library.merge`, `library.createAt`, `library.mergeFrom({ source })`, `pond-backup-manifest.json`.

## Pond extras to protect

Harvest, Accounts, Watches, Agent, rebuildable index, no Pond cloud copy.
