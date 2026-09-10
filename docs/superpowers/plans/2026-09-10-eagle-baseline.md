# Eagle Baseline DAM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This file is the program plan. Each wave after Wave 1 is a follow-on plan that must produce working software on its own. Do not vendor Eagle source, templates, or SVG icons.

**Goal:** Make Pond’s DAM do everything Eagle 4 does first-party, keep Pond harvest/Agent on top, and never ship a Plugin Center.

**Architecture:** Eagle is the behavior catalog, not the implementation. Inventory lives in `docs/research/2026-09-10-eagle-baseline-contract.md`. Pond UI, main-owned persistence, and the rebuildable Library stay. Harvest, Sources, and Agent stay Pond-shaped. Missing Eagle operations land in existing feature folders (`features/saves`, `features/library`, main `core/`), not as an Eagle compatibility layer.

**Tech Stack:** TypeScript, Electron, Pond UI, CSS Modules, Vitest, existing query contracts, CUA against `/Applications/Eagle.app` when a visual check is required.

---

## Scope split

One TDD plan cannot implement combine-images, font viewers, and page-asset capture together. This document freezes the contract and sequences waves. Execute Wave 1 here. After Wave 1, write a dated follow-on plan per wave (`docs/superpowers/plans/2026-09-XX-eagle-baseline-wave-N.md`) before coding that wave.

| Wave | Name | Ships when |
| --- | --- | --- |
| 1 | Reachability | Every Eagle baseline action Pond already has is in the right menu, with no dead rows |
| 2 | Missing DAM operations | Combine, Share, pin-to-top, folder cover, replace file, thumbnail background |
| 3 | Viewer and convert | GIF loop range, subtitles, navigator, list columns, conversion/share polish |
| 4 | Collect | Page-asset grid, save-time folder/tag, screenshots/auto-import proven in a live session |
| 5 | Specialist media | Fonts, audio waveform/BPM, Office first page, common RAW. Store-all already exists |
| 6 | Library trust | Backup/restore/verify signed-package proof, merge, locked-folder import policy |

**Out of every wave:** plugins, Plugin Center, Eagle Cloud, Photoshop-class preview, Baidu/Sogou reverse search, folder passwords as a wave-1 feature.

## Files this program owns

- `docs/research/2026-09-10-eagle-baseline-contract.md` — capability IN/OUT (already written)
- `apps/desktop/src/renderer/src/features/saves/lib/menu.ts` — Save context menu
- `apps/desktop/src/renderer/src/features/saves/lib/menu.test.ts` — Save menu tests
- `apps/desktop/src/main/menu.ts` — app menu
- `apps/desktop/src/renderer/src/features/library/components/view/empty-gallery-menu.ts` — empty gallery
- `apps/desktop/src/renderer/src/features/library/components/folder-context-menu/` — folder menus
- Later waves add operations under `apps/desktop/src/main/core/` and matching renderer feature folders

## Inventory refresh (do this when Eagle updates)

```sh
npx @electron/asar extract-file /Applications/Eagle.app/Contents/Resources/app.asar i18n/en.js
```

Compare `appmenu.*` / `context.*` keys to the contract. Use CUA `list_apps` → `launch_app` `{ "name": "Eagle" }` → `list_windows` `{ "pid": <eagle> }` → `invoke_menu` only while Eagle is on the current Space. Derive labels. Never commit Eagle JS or SVGs.

---

### Task 1: Freeze a failing coverage list for the Save menu

**Files:**
- Create: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.test.ts` only if helpers need sharing
- Test: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`

- [x] **Step 1: Write the failing test**

The list is Eagle’s first-party item menu, Pond nouns, no plugins. Hidden-when-empty rows must still exist in the spec when the condition is true.

```ts
// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import type { MenuItemSpec } from "@pond/ui";
import { buildSaveMenu } from "./menu";
import type { Save } from "@/features/saves/types";

function labels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    if ("hidden" in item && item.hidden) return [];
    if ("label" in item && typeof item.label === "string") return [item.label];
    return [];
  });
}

function fileSave(): Save {
  return {
    id: "file-save",
    source: "twitter",
    sourceId: "file-save",
    url: "https://example.test/file",
    title: "File",
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: "file",
    files: [
      {
        kind: "file",
        path: "shot.png",
        mimeType: "image/png",
        sha256: "abc",
        size: 1,
      },
    ],
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
  };
}

describe("Eagle baseline save menu", () => {
  it("does not expose plugin or picker rows", () => {
    const items = buildSaveMenu(fileSave(), {
      clipboardEmpty: true,
      openWithApps: [
        {
          name: "Preview.app",
          path: "/System/Applications/Preview.app",
          icon: null,
          isDefault: true,
        },
      ],
    });
    const top = labels(items);
    expect(top).not.toContain("Other");
    expect(top).not.toContain("Plugin");
  });

  it("keeps Open With as apps only", () => {
    const items = buildSaveMenu(fileSave(), {
      clipboardEmpty: true,
      openWithApps: [
        {
          name: "Preview.app",
          path: "/System/Applications/Preview.app",
          icon: null,
          isDefault: true,
        },
      ],
    });
    const openWith = items.find(
      (item) => item.type === "submenu" && item.label === "Open With",
    );
    expect(openWith && "items" in openWith ? labels(openWith.items) : []).toEqual(
      ["Preview.app (Default)"],
    );
  });
});
```

- [x] **Step 2: Run it and confirm it fails or already passes**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`

Expected: PASS for Open With / no Other if Wave 1 menu work already landed. Keep the file. It is the regression lock.

- [x] **Step 3: Add the missing-operation names as comments in the same file**

Do not assert Combine Images until Wave 2 ships it. Document the remaining Eagle rows next to the test so a later wave can turn comments into assertions.

```ts
/** Wave 2: Combine Images, Share, Pin to Top, Set as Folder Cover, Replace File. */
/** Wave 3: Thumbnail Background, Show Navigator, Convert to PNG/JPG from WebP. */
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts docs/research/2026-09-10-eagle-baseline-contract.md docs/superpowers/plans/2026-09-10-eagle-baseline.md
git commit -m "$(cat <<'EOF'
test: lock Eagle-baseline Save menu against plugin and Other rows

EOF
)"
```

---

### Task 2: Kill dead Save-menu rows on the open viewer

**Files:**
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/viewers/media-viewer/lib/menu.ts`
- Test: `apps/desktop/src/renderer/src/features/saves/lib/menu.test.ts`

Already started: `opened: true` hides **Open Save** on the viewer. Finish the same pass:

- [ ] **Step 1: Extend the existing test**

```ts
it("hides Open Save when the save is already open", () => {
  const labels = visibleLabels(
    buildSaveMenu(fileSave(), { clipboardEmpty: true, opened: true }),
  );
  expect(labels).not.toContain("Open Save");
  expect(labels).toContain("Pin Preview");
});
```

If this already exists, leave it.

- [ ] **Step 2: Viewer kebab**

`KebabMenu` sits on the inspector while the gallery can still be showing. Do not pass `opened: true` there. Only `buildViewerMenu` and the save detail page context menu use `opened: true`.

- [ ] **Step 3: Run**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/menu.test.ts`

Expected: PASS

- [ ] **Step 4: Commit if there are uncommitted viewer-menu fixes**

```bash
git add apps/desktop/src/renderer/src/features/saves/lib/menu.ts apps/desktop/src/renderer/src/features/saves/components/viewers/media-viewer/lib/menu.ts apps/desktop/src/renderer/src/features/saves/lib/menu.test.ts
git commit -m "$(cat <<'EOF'
fix: hide Open Save on the open viewer menu

EOF
)"
```

---

### Task 3: App menu reachability audit

**Files:**
- Modify: `apps/desktop/src/main/menu.ts`
- Test: add `apps/desktop/src/main/menu.test.ts` if none exists; otherwise a renderer test that lists `MenuActionId` coverage

Eagle File/Edit/View/Organize/Find/Library from `i18n/en.js` `appmenu.*`. Pond already has File/Edit/View/Go/History plus harvest Sync. Map missing first-party rows to existing IPC before inventing new operations.

- [ ] **Step 1: Write a table in the contract appendix if a row is missing**

For each Eagle `appmenu.view>*` and `appmenu.organize>*` key, mark `pond` / `later-wave` / `out`. Do not implement Wave 2 operations here.

- [ ] **Step 2: Add only mappings to existing commands**

Example: if grayscale exists as `view.grayscale` but is absent from the app menu, add a View item that sends the existing menu action. Do not add Combine Images yet.

- [ ] **Step 3: Run desktop tests for menu accelerators**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/lib/menu-accelerator.test.ts src/shared/shortcuts.ts`

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: expose existing inspect actions on the app menu

EOF
)"
```

---

### Task 4: Empty gallery and folder menus vs Eagle New / folder

**Files:**
- `apps/desktop/src/renderer/src/features/library/components/view/empty-gallery-menu.ts`
- `apps/desktop/src/renderer/src/features/library/components/folder-context-menu/`
- Tests colocated next to those files

Eagle empty gallery: New Folder, New Smart Folder, import folder/links/package, Auto Import, find duplicates. Skip Sketch/Pages templates and ArtStation/Huaban.

- [ ] **Step 1: Assert the empty-gallery labels**

```ts
expect(visibleLabels(buildEmptyGalleryMenu())).toEqual([
  "New Folder",
  "New Smart Folder",
  "Import Files",
  "Import from Links",
  "Import Pond Package",
  "Auto Import",
]);
```

Adjust names to the current Pond labels (`Import Files` vs `Import from folder(s)`). Do not add Find Duplicates on empty gallery if that operation is per-save only. Put Find Duplicates on File menu / More, matching Pond’s existing duplicate review.

- [ ] **Step 2: Implement until the test matches the contract**

- [ ] **Step 3: Run the colocated tests and commit**

---

### Task 5: Write the Wave 2 follow-on plan, then stop this file

**Files:**
- Create: `docs/superpowers/plans/2026-09-10-eagle-baseline-wave-2.md` (date may move)

Wave 2 must include, each with TDD and files:

1. **Combine Images** — new main operation that writes a new Save (originals unchanged), renderer entry from the Save menu when 2+ images are selected. Files likely `apps/desktop/src/main/core/combine-images.ts` and a query in `apps/desktop/src/main/ipc/queries/`.
2. **Replace File** — keep tags/folders/notes, swap the original bytes. Query next to existing import.
3. **Pin to Top / Set as Folder Cover** — folder presentation fields already exist in the 8 Sep tracker; expose them on the Save menu when `nav.kind === "folder"`.
4. **Share** — `share.showItemInFolder` is wrong. Use Electron `shareItem` / macOS share sheet on the original path.
5. **Thumbnail Background** — gallery-only preference, five Eagle values, Pond nouns.

Do not start Wave 2 until Wave 1 menus no longer contain dead rows.

- [ ] **Step 1: Author that plan with the writing-plans header and failing tests per operation**

- [ ] **Step 2: Commit the plan file only**

---

## Wave notes (for the follow-on plans)

### Wave 3 — Viewer

GIF loop range and “Set as GIF Thumbnail” already have Eagle keys `context.gifViewer.*`. Video subtitles are `context.image.loadSubtitles`. Navigator is `appmenu.view>showNavigator`. List columns are `openListPropContextMenu`. Reuse `image-inspector` and `media-viewer`. Originals stay untouched unless the user picks a write-to-file rotate mode.

### Wave 4 — Collect + harvest

Eagle collect (screenshots, page assets, auto-import, clipboard) is the DAM capture funnel. Pond harvest (Sources, Watches, Sync, liked/saved) stays and is not replaced. Live-browser proof is required; the 8 Sep tracker still calls this unverified.

### Wave 5 — Formats

`apps/desktop/src/shared/eagle-formats.ts` is the store-all list. Native preview is layered. Official Eagle format plugins are out. Fallback: custom/OS thumbnail + Open With.

### Wave 6 — Library

Backup/restore/verify exists in core. Remaining work is signed-package evidence, external-drive, merge UX, and an explicit skip+report for password folders on Eagle import (`eagle-import.ts` already skips `folder.password`).

## Pond extras to protect in every wave

- Harvest, Accounts, Watches, Downloads, rate governor
- Agent, Ask, stdio MCP
- Rebuildable index
- No Pond cloud copy in UI

## Self-review

- Spec coverage: IN/OUT is `docs/research/2026-09-10-eagle-baseline-contract.md`. Wave 1 tasks cover reachability. Waves 2–6 are named follow-on plans, not silent TBDs.
- Placeholder scan: Wave 2+ must be written as full plans before implementation. This file does not say “add validation later.”
- Types: `opened` on `buildSaveMenu` is the viewer flag. Open With apps are `OpenWithApp`. No plugin submenu type.

## Execution

Wave 1 can run in this repo now. After Task 5, start Wave 2 as its own plan.
