# Bulk + CSV Export Implementation Plan

> **For agentic workers:** Use the `executing-plans` skill. Steps use checkbox
> (`- [ ]`) syntax. Read `2026-05-31-eagle-features-overview.md` first.

**Goal:** Let the user export many saves at once: copy their primary files into
a chosen folder, and export a CSV catalog of the selected (or filtered) saves.
Today only single-file export via a Save dialog exists.

**Architecture:** Two new main process IPC handlers reuse the existing
`resolveSaveFilePath` resolver (`apps/desktop/src/main/ipc/helpers.ts`) and a
folder picker. `saves.exportFiles` copies each save's `coverIndex` file into a
chosen directory, de-duplicating filenames. `saves.exportCsv` writes a CSV of
save metadata to a chosen path. The renderer triggers both from the existing
`BulkActionBar` (which already loops `useSelectedIds()` for bulk tag/trash) and
from a command-palette command. CSV serialization is a small pure helper so it
is easy to reason about.

**Tech Stack:** Electron `dialog`, Node `fs/promises`, React 19, existing
selection pool + bulk-action-bar. No test runner: verify with
`pnpm --filter @pond/desktop typecheck`, `pnpm lint:check`, manual smoke.

---

## File Structure

- Create `apps/desktop/src/main/lib/csv.ts`: `toCsv(rows, columns)` pure helper.
- Modify `apps/desktop/src/main/ipc/queries/saves.ts`: `saves.exportFiles`, `saves.exportCsv`.
- Modify `apps/desktop/src/renderer/src/components/library/bulk-action-bar/index.tsx`: Export files + Export CSV buttons.
- Modify `apps/desktop/src/renderer/src/components/command-palette/registry/save-context.ts`: bulk export commands.

---

## Task 1: CSV serializer

**Files:**
- Create: `apps/desktop/src/main/lib/csv.ts`

- [ ] **Step 1: Write the helper**

```ts
// Minimal RFC-4180 CSV. Quotes fields containing comma, quote, CR, or LF, and
// doubles embedded quotes. Values are coerced to string; null/undefined empty.
export function toCsv(
  rows: ReadonlyArray<Record<string, unknown>>,
  columns: ReadonlyArray<string>,
): string {
  const lines: string[] = [columns.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCsv(row[c])).join(","));
  }
  return lines.join("\r\n");
}

function escapeCsv(value: unknown): string {
  if (value == null) return "";
  const s = Array.isArray(value) ? value.join("; ") : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`

```bash
git add apps/desktop/src/main/lib/csv.ts
git commit -m "feat(export): add CSV serializer helper"
```

---

## Task 2: Export IPC handlers

**Files:**
- Modify: `apps/desktop/src/main/ipc/queries/saves.ts`

- [ ] **Step 1: Add `saves.exportFiles`**

Copies the `coverIndex` file of each requested save into a chosen folder.

```ts
  async "saves.exportFiles"(params) {
    const ids = Array.isArray(params.ids)
      ? (params.ids as unknown[]).map(String).filter(Boolean)
      : [];
    if (ids.length === 0) return { ok: false, error: "no_selection" };

    const { dialog } = await import("electron");
    const { copyFile } = await import("node:fs/promises");
    const { join, extname, basename } = await import("node:path");
    const { getDb } = await import("../../db");
    const { saves: savesTable } = await import("@pond/schema/db");
    const { inArray } = await import("drizzle-orm");

    const picked = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    if (picked.canceled || !picked.filePaths[0]) return { ok: false, error: "canceled" };
    const dir = picked.filePaths[0];

    const db = await getDb();
    const rows = db
      .select()
      .from(savesTable)
      .where(inArray(savesTable.id, ids))
      .all();

    const used = new Set<string>();
    let exported = 0;
    for (const row of rows) {
      const target = await resolveSaveFilePath(row.id, row.coverIndex ?? 0);
      if (!target.ok) continue;
      const ext = extname(target.path);
      const base = sanitizeName(row.title ?? basename(target.path, ext)) || row.id;
      let name = `${base}${ext}`;
      let n = 1;
      while (used.has(name.toLowerCase())) name = `${base}-${n++}${ext}`;
      used.add(name.toLowerCase());
      await copyFile(target.path, join(dir, name));
      exported++;
    }
    return { ok: true, exported, dir };
  },
```

Add a `sanitizeName` helper near the top of the file (or inline it):

```ts
function sanitizeName(s: string): string {
  return s.replace(/[/\\?%*:|"<>]/g, "_").trim().slice(0, 120);
}
```

`resolveSaveFilePath` is already imported in this file (used by
`saves.exportFile`).

- [ ] **Step 2: Add `saves.exportCsv`**

```ts
  async "saves.exportCsv"(params) {
    const ids = Array.isArray(params.ids)
      ? (params.ids as unknown[]).map(String).filter(Boolean)
      : null;

    const { dialog } = await import("electron");
    const { writeFile } = await import("node:fs/promises");
    const { getDb } = await import("../../db");
    const { saves: savesTable } = await import("@pond/schema/db");
    const { inArray, isNull, desc } = await import("drizzle-orm");
    const { toCsv } = await import("../../lib/csv");

    const db = await getDb();
    const rows =
      ids && ids.length > 0
        ? db.select().from(savesTable).where(inArray(savesTable.id, ids)).all()
        : db
            .select()
            .from(savesTable)
            .where(isNull(savesTable.deletedAt))
            .orderBy(desc(savesTable.savedAt))
            .all();

    const columns = [
      "id", "source", "url", "title", "author", "description",
      "notes", "tags", "mediaType", "width", "height", "fileSize",
      "status", "savedAt",
    ];
    const records = rows.map((r) => ({
      ...r,
      tags: (r.tags ?? []).join("; "),
      savedAt: r.savedAt ? new Date(r.savedAt).toISOString() : "",
    }));
    const csv = toCsv(records, columns);

    const picked = await dialog.showSaveDialog({
      defaultPath: "pond-export.csv",
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (picked.canceled || !picked.filePath) return { ok: false, error: "canceled" };
    await writeFile(picked.filePath, csv, "utf8");
    return { ok: true, count: rows.length, path: picked.filePath };
  },
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS. If `r.savedAt` is already a `Date` (Drizzle `timestamp_ms`
mode), `new Date(r.savedAt)` still works; keep the guard.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/main/ipc/queries/saves.ts
git commit -m "feat(export): bulk file export and CSV export IPC"
```

---

## Task 3: Bulk action bar buttons

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/library/bulk-action-bar/index.tsx`

- [ ] **Step 1: Add Export files + Export CSV actions**

Mirror the existing bulk-tag/bulk-trash handlers (which read `useSelectedIds()`).
Add:

```tsx
  const exportFiles = useCallback(async () => {
    const ids = selection.snapshot();
    if (ids.length === 0) return;
    const res = (await window.pond.query("saves.exportFiles", { ids })) as {
      ok: boolean;
      exported?: number;
    };
    if (res.ok) {
      toast.add({ title: `Exported ${res.exported ?? 0} file${res.exported === 1 ? "" : "s"}` });
    }
  }, [toast]);

  const exportCsv = useCallback(async () => {
    const ids = selection.snapshot();
    const res = (await window.pond.query("saves.exportCsv", { ids })) as {
      ok: boolean;
      count?: number;
    };
    if (res.ok) toast.add({ title: `Exported ${res.count ?? 0} rows to CSV` });
  }, [toast]);
```

Render two buttons next to the existing tag/trash buttons, matching their
markup. Confirm `selection` and `toast` are already in scope in this file (the
investigation shows it uses `useSelectedIds` and `selection.clear`).

- [ ] **Step 2: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS.

- [ ] **Step 3: Manual smoke**

Run dev. Select several image saves. The bulk bar shows Export files + Export
CSV. Click Export files, pick a folder: the chosen folder contains one copied
file per save with sane, de-duplicated names. Click Export CSV, pick a path:
open the CSV and confirm one row per selected save with tags joined by `;` and
fields with commas properly quoted.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/bulk-action-bar/index.tsx
git commit -m "feat(export): bulk export buttons in the action bar"
```

---

## Task 4: Command-palette entries

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/command-palette/registry/save-context.ts`

- [ ] **Step 1: Add commands mirroring the existing bulk commands**

This file already has `save.bulk-trash` / `save.bulk-refresh` using
`ctx.selectedIds`. Add:

```ts
  {
    id: "save.bulk-export-files",
    label: "Export selected files",
    group: "Selection",
    when: (ctx) => ctx.selectedIds.length > 0,
    perform: async ({ selectedIds, close }) => {
      await window.pond.query("saves.exportFiles", { ids: selectedIds });
      close();
    },
  },
  {
    id: "save.export-csv",
    label: "Export CSV",
    group: "Selection",
    perform: async ({ selectedIds, close }) => {
      await window.pond.query("saves.exportCsv", { ids: selectedIds });
      close();
    },
  },
```

Match the exact `Command` shape, `group` names, and `ctx` field names already
used in this file (e.g. whether it is `selectedIds` or another property).

- [ ] **Step 2: Verify + manual smoke**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`. In dev, with a
selection, Cmd+K -> "Export selected files" works; "Export CSV" with no
selection exports the full (non-trashed) library.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/command-palette/registry/save-context.ts
git commit -m "feat(export): command-palette entries for bulk export"
```

---

## Self-Review Checklist

- [ ] Bulk file export copies one primary file per save with de-duplicated names.
- [ ] CSV quotes fields containing commas/quotes/newlines correctly.
- [ ] CSV with an empty selection exports the full non-trashed library.
- [ ] Saves with no resolvable file are skipped, not fatal.
- [ ] All typechecks and `pnpm lint:check` pass.
