# Manual Capture + Local File Import Implementation Plan

> **For agentic workers:** Use the `executing-plans` skill to implement this
> plan task by task. Steps use checkbox (`- [ ]`) syntax. Shared conventions
> (verify commands, migration recipe, mutation/IPC patterns) live in
> `2026-05-31-eagle-features-overview.md`; read that first.

**Goal:** Let a user create a save that does not originate from a recognized
social URL: by dropping/picking local files, or by typing a manual entry
(title + optional note + tags + optional URL), and make quick capture actually
persist the note and tags it already collects.

**Architecture:** Introduce a new `"local"` source value so manual/local saves
have a home in the existing `(source, sourceId)` model. Add a single main
process core function `createManualSave` that mints a save row, writes any
files to disk via the existing `applySavePatch` primitive, marks it `complete`
without entering the pipeline, and writes `info.json`. Expose it through two
IPC handlers (`saves.importFiles` for dropped/picked file paths, and
`saves.createManual` for the form), rewire the renderer drop handler and quick
capture, and add a "+ from files" path to the quick-capture dialog. File bytes
never cross IPC: the renderer resolves dropped `File`s to absolute paths via
`webUtils.getPathForFile`, and the main process reads them.

**Tech Stack:** Electron 41 main/preload/renderer, better-sqlite3 + Drizzle,
React 19, TanStack Router/Store. No test runner: verify with
`pnpm --filter @pond/desktop typecheck`, `pnpm --filter @pond/schema typecheck`,
`pnpm lint:check`, and manual smoke in `pnpm --filter @pond/desktop dev`.

---

## File Structure

- Modify `packages/schema/src/db.ts`: add `"local"` to `SOURCES`.
- Modify `packages/schema/src/filters/meta.ts`: add a `local` source preset so
  the filter UI can show it.
- Create `apps/desktop/src/main/core/manual-import.ts`: `createManualSave`,
  `importFilesAsSaves`, mime/kind inference. One responsibility: building a
  complete save from local input.
- Modify `apps/desktop/src/main/ipc/queries/saves.ts`: replace the
  `saves.dropFiles` stub, add `saves.importFiles`, `saves.createManual`,
  `saves.pickFiles`; extend `saves.quickAdd` to persist note/tags and fall back
  to a manual save for unsupported URLs.
- Modify `apps/desktop/src/main/core/pipeline/specs.ts`: exclude `"local"`
  from source-sync planning (guard only; `createManualSave` never enqueues).
- Modify `apps/desktop/src/preload/index.ts`: expose `pathForFile`.
- Modify `apps/desktop/src/renderer/src/lib/use-card-actions.ts`: send file
  paths to `saves.importFiles`.
- Modify `apps/desktop/src/renderer/src/components/library/quick-capture/index.tsx`
 : add files button + manual (no-URL) submit.

---

## Task 1: Add the `"local"` source value

**Files:**
- Modify: `packages/schema/src/db.ts:10-19`

- [ ] **Step 1: Add `"local"` to the `SOURCES` tuple**

```ts
export const SOURCES = [
  "twitter",
  "instagram",
  "pinterest",
  "arena",
  "cosmos",
  "tiktok",
  "youtube",
  "local",
] as const;
export type Source = (typeof SOURCES)[number];
```

- [ ] **Step 2: Verify schema typecheck**

Run: `pnpm --filter @pond/schema typecheck`
Expected: PASS. If any `Record<Source, ...>` map elsewhere now errors as
non-exhaustive, that surfaces here. Note the file paths reported; they are
fixed in Task 2 and Task 7.

- [ ] **Step 3: Commit**

```bash
git add packages/schema/src/db.ts
git commit -m "feat(schema): add local source value for manual saves"
```

---

## Task 2: Teach the pipeline to ignore `"local"`

The pipeline plans ops per source. `"local"` saves never enqueue, but
`planOps`, sync source lists, and capture expectations are typed
`Record<Source, ...>` and must stay exhaustive after Task 1.

**Files:**
- Modify: `apps/desktop/src/main/core/pipeline/specs.ts`
- Modify: `apps/desktop/src/main/core/sync/index.ts` (the `LIST_HARVEST_SOURCES` array, if it is typed over all sources)

- [ ] **Step 1: Make `planOps` return no ops for `"local"`**

In `specs.ts`, find `planOps` / `CAPTURE_EXPECTATIONS`. Add a `local` entry so
the `Record<Source, ...>` is exhaustive and yields an empty plan:

```ts
// local saves are created complete by createManualSave; they never run the
// URL pipeline, so they have no ops and no capture expectations.
local: { required: [], recommended: [] },
```

For `planOps`, ensure the source switch/map returns `[]` for `"local"`.

- [ ] **Step 2: Exclude `"local"` from sync source iteration**

Wherever sources are iterated for harvest/sync (e.g. `LIST_HARVEST_SOURCES`
in `apps/desktop/src/main/core/sync/index.ts` and source-sync prefs loops),
filter out `"local"`. If a list is declared explicitly (not derived from
`SOURCES`), it already excludes `"local"`; just confirm.

- [ ] **Step 3: Verify**

Run: `pnpm --filter @pond/desktop typecheck`
Expected: PASS, with no "missing property 'local'" errors remaining.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/main/core
git commit -m "feat(pipeline): treat local source as a no-op origin"
```

---

## Task 3: `createManualSave` core

**Files:**
- Create: `apps/desktop/src/main/core/manual-import.ts`

- [ ] **Step 1: Write the module**

```ts
import { extname } from "node:path";
import { readFile, stat } from "node:fs/promises";
import { type MediaType, type NewSave, type Save, saves } from "@pond/schema/db";
import { ulid } from "ulid";
import { getDb } from "../db";
import { broadcastSyncAction } from "./executor";
import { writeInfoFiles } from "../lib/library";
import { infoDocFromSave, type InfoFile } from "../lib/library-format";
import { applySavePatch } from "./pipeline/workers/apply";
import { syncActions } from "@pond/schema/db";

const IMAGE_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};
const VIDEO_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
};

function classifyExt(ext: string): {
  mediaType: MediaType;
  mimeType: string;
} | null {
  const lower = ext.toLowerCase();
  if (IMAGE_EXT[lower]) return { mediaType: "image", mimeType: IMAGE_EXT[lower] };
  if (VIDEO_EXT[lower]) return { mediaType: "video", mimeType: VIDEO_EXT[lower] };
  return null;
}

function blobFilename(mediaType: MediaType, ext: string, index: number): string {
  if (mediaType === "video") {
    return index === 0 ? `video${ext}` : `video-${index}${ext}`;
  }
  return index === 0 ? `cover${ext}` : `media-${index}${ext}`;
}

export interface ManualSaveInput {
  title?: string | null;
  url?: string | null;
  note?: string | null;
  tags?: string[];
  // Absolute paths on disk the main process can read.
  filePaths?: string[];
}

export interface ManualSaveResult {
  ok: boolean;
  id?: string;
  error?: string;
}

// Build a complete save from local input without touching the URL pipeline.
export async function createManualSave(
  input: ManualSaveInput,
): Promise<ManualSaveResult> {
  const db = await getDb();
  const id = ulid();
  const sourceId = id; // unique within (source="local"); ulid is collision-safe
  const now = new Date();

  const title = input.title?.trim() || null;
  const note = input.note?.trim() || null;
  const tags = normalizeTags(input.tags ?? []);

  const readable: Array<{
    path: string;
    mediaType: MediaType;
    mimeType: string;
    bytes: Buffer;
  }> = [];
  for (const p of input.filePaths ?? []) {
    const cls = classifyExt(extname(p));
    if (!cls) continue;
    try {
      const info = await stat(p);
      if (!info.isFile() || info.size === 0) continue;
      readable.push({ path: p, ...cls, bytes: await readFile(p) });
    } catch {
      /* skip unreadable files */
    }
  }

  if (readable.length === 0 && !title && !note && !input.url) {
    return { ok: false, error: "empty_input" };
  }

  const mediaType: MediaType =
    readable.length === 0
      ? "link"
      : readable.length > 1
        ? "mixed"
        : readable[0].mediaType;

  const insertValues: NewSave = {
    id,
    source: "local",
    sourceId,
    url: input.url?.trim() || `pond:local/${id}`,
    title,
    notes: note,
    mediaType,
    status: readable.length === 0 ? "complete" : "ingesting",
    tags,
    files: [],
    coverIndex: 0,
    ingestStartedAt: now,
    ingestCompletedAt: readable.length === 0 ? now : null,
    savedAt: now,
    createdAt: now,
  };
  db.insert(saves).values(insertValues).run();

  const insertedAction = db
    .insert(syncActions)
    .values({
      modelName: "save",
      modelId: id,
      action: "I",
      data: insertValues as unknown,
      actor: "user",
      actorReason: "manual:create",
      batchId: ulid(),
    })
    .returning()
    .all()[0];
  if (insertedAction) broadcastSyncAction(insertedAction);

  if (readable.length > 0) {
    const newFiles = readable.map((f, i) => ({
      kind: (f.mediaType === "video"
        ? "video"
        : i === 0
          ? "cover"
          : "media") as Save["files"][number]["kind"],
      filename: blobFilename(f.mediaType, extname(f.path).toLowerCase(), i),
      bytes: f.bytes,
      mimeType: f.mimeType,
    }));
    const fileSize = readable.reduce((sum, f) => sum + f.bytes.byteLength, 0);
    await applySavePatch(
      id,
      { status: "complete", ingestCompletedAt: new Date(), fileSize },
      { actorReason: "manual:import", newFiles },
    );
  }

  const finalRow = (await db.select().from(saves).where(eq(saves.id, id)))[0];
  if (finalRow) await writeItemInfo(finalRow);

  return { ok: true, id };
}

async function writeItemInfo(save: Save): Promise<void> {
  const manifest: InfoFile[] = (save.files ?? []).map((f) => ({
    kind: f.kind,
    path: f.path,
    sha256: f.sha256,
    size: f.size,
    ...(f.mimeType ? { mimeType: f.mimeType } : {}),
    ...(f.width ? { width: f.width } : {}),
    ...(f.height ? { height: f.height } : {}),
  }));
  await writeInfoFiles(save.id, infoDocFromSave(save, manifest), save.rawJson);
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.replace(/^#+/, "").trim().toLowerCase();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}
```

- [ ] **Step 2: Fix the missing `eq` import**

The snippet uses `eq`. Add it to the drizzle import:

```ts
import { eq } from "drizzle-orm";
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --filter @pond/desktop typecheck`
Expected: PASS. If the `kind` cast errors, confirm `SaveFile["kind"]` is
`string` (it is, per `packages/schema/src/db.ts:47-55`) and simplify the cast
to `f.mediaType === "video" ? "video" : i === 0 ? "cover" : "media"` without
the `as`.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/main/core/manual-import.ts
git commit -m "feat(import): add createManualSave core for local files and manual entries"
```

---

## Task 4: Expose `pathForFile` in preload

Electron 41 removed `File.path`. The renderer must resolve dropped files to
absolute paths via `webUtils.getPathForFile`.

**Files:**
- Modify: `apps/desktop/src/preload/index.ts`

- [ ] **Step 1: Import `webUtils` and add the bridge method**

At the top of the file, add `webUtils` to the electron import. Inside the `api`
object (next to `query`), add:

```ts
  pathForFile(file: File): string {
    return webUtils.getPathForFile(file);
  },
```

- [ ] **Step 2: Verify the type is exported**

`PondApi` is `typeof api`, so `pathForFile` is included automatically. Confirm
the renderer's `Window["pond"]` type picks it up.

Run: `pnpm --filter @pond/desktop typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/preload/index.ts
git commit -m "feat(preload): expose webUtils.getPathForFile as pond.pathForFile"
```

---

## Task 5: IPC handlers for import + manual + picker

**Files:**
- Modify: `apps/desktop/src/main/ipc/queries/saves.ts`

- [ ] **Step 1: Replace the `saves.dropFiles` stub and add handlers**

Replace the existing stub (`apps/desktop/src/main/ipc/queries/saves.ts:227-231`):

```ts
  async "saves.importFiles"(params) {
    const paths = Array.isArray(params.paths)
      ? (params.paths as unknown[]).map(String).filter(Boolean)
      : [];
    if (paths.length === 0) return { ok: false, error: "no_files" };
    const { createManualSave } = await import("../../core/manual-import");
    const ids: string[] = [];
    for (const p of paths) {
      const res = await createManualSave({ filePaths: [p] });
      if (res.ok && res.id) ids.push(res.id);
    }
    return { ok: ids.length > 0, ids };
  },

  async "saves.createManual"(params) {
    const { createManualSave } = await import("../../core/manual-import");
    return createManualSave({
      title: params.title != null ? String(params.title) : null,
      url: params.url != null ? String(params.url) : null,
      note: params.note != null ? String(params.note) : null,
      tags: Array.isArray(params.tags) ? (params.tags as string[]) : [],
      filePaths: Array.isArray(params.filePaths)
        ? (params.filePaths as string[])
        : [],
    });
  },

  async "saves.pickFiles"() {
    const { dialog } = await import("electron");
    const result = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Media",
          extensions: [
            "jpg", "jpeg", "png", "gif", "webp", "avif", "svg",
            "mp4", "webm", "mov", "m4v",
          ],
        },
      ],
    });
    if (result.canceled) return { ok: false, paths: [] };
    return { ok: true, paths: result.filePaths };
  },
```

Keep a back-compat `saves.dropFiles` alias so any stale renderer build degrades
gracefully:

```ts
  async "saves.dropFiles"(params) {
    return (this as Record<string, (p: typeof params) => unknown>)[
      "saves.importFiles"
    ]?.(params) ?? { ok: false, error: "no_files" };
  },
```

If `this`-binding is awkward in the registry object, instead define a shared
`async function importFilesImpl(paths: string[])` above the map and call it from
both `saves.importFiles` and `saves.dropFiles`.

- [ ] **Step 2: Wire note/tags into `saves.quickAdd` + manual fallback**

Replace the body of `saves.quickAdd` (`apps/desktop/src/main/ipc/queries/saves.ts:254-271`):

```ts
  async "saves.quickAdd"(params) {
    const url = String(params.url ?? "").trim();
    const note = params.note != null ? String(params.note) : null;
    const tags = Array.isArray(params.tags) ? (params.tags as string[]) : [];
    if (!url) {
      // No URL: treat as a manual note/title entry.
      const { createManualSave } = await import("../../core/manual-import");
      const res = await createManualSave({ title: note ?? null, note, tags });
      return res.ok ? { ok: true, id: res.id } : { ok: false, error: "no_url" };
    }
    try {
      const result = await enqueueSaveByUrl(url, { trigger: "user:quickAdd" });
      const { setSaveTags } = await import("../../core/tags");
      if (tags.length > 0) await setSaveTags(result.id, tags);
      if (note) {
        const { applySavePatch } = await import(
          "../../core/pipeline/workers/apply"
        );
        await applySavePatch(result.id, { notes: note }, {
          actorReason: "user:quickAdd-note",
        });
      }
      return { ok: true, id: result.id, created: result.created };
    } catch (err) {
      if (err instanceof UnsupportedError) {
        // Unsupported URL: keep it as a manual save instead of dropping it.
        const { createManualSave } = await import("../../core/manual-import");
        const res = await createManualSave({ url, title: note ?? url, note, tags });
        return res.ok
          ? { ok: true, id: res.id }
          : { ok: false, error: "unsupported_url" };
      }
      throw err;
    }
  },
```

Confirm `UnsupportedError` is already imported in this file (it is used by the
original handler).

- [ ] **Step 3: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/main/ipc/queries/saves.ts
git commit -m "feat(import): IPC for local file import, manual saves, and quick-add note/tags"
```

---

## Task 6: Renderer drop handler sends paths

**Files:**
- Modify: `apps/desktop/src/renderer/src/lib/use-card-actions.ts:240-250`

- [ ] **Step 1: Resolve dropped files to paths and call `saves.importFiles`**

In the drop handler, replace the `items`/`saves.dropFiles` block. Before it,
derive paths from the `DataTransfer` file list:

```ts
      const fileList = Array.from(e.dataTransfer?.files ?? []);
      const paths = fileList
        .map((f) => {
          try {
            return window.pond.pathForFile(f);
          } catch {
            return "";
          }
        })
        .filter(Boolean);
      if (paths.length > 0) {
        const result = (await window.pond.query("saves.importFiles", {
          paths,
        })) as { ok: boolean; ids?: string[] };
        const count = result.ids?.length ?? 0;
        if (count > 0) {
          toast.add({
            title: `Imported ${count} file${count === 1 ? "" : "s"}`,
          });
        } else {
          toast.error({ title: "Couldn't import those files" });
        }
        return;
      }
```

Keep the existing URL-drop fallthrough (drops that carry a URL still go to
`saves.quickAdd`).

- [ ] **Step 2: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS.

- [ ] **Step 3: Manual smoke**

Run: `pnpm --filter @pond/desktop dev`. Drag a PNG and an MP4 from Finder onto
the library grid. Expected: a toast "Imported 2 files", two new cards appear
with thumbnails, and the items survive an app relaunch (proves `info.json` was
written and the scan rebuilds them).

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/lib/use-card-actions.ts
git commit -m "feat(import): import dropped local files into the library"
```

---

## Task 7: Quick capture supports files + manual entries

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/library/quick-capture/index.tsx`

- [ ] **Step 1: Add a "Choose files" affordance and manual submit**

Add state for picked paths and a button that calls the picker:

```tsx
  const [filePaths, setFilePaths] = useState<string[]>([]);

  const chooseFiles = useCallback(async () => {
    const res = (await window.pond.query("saves.pickFiles", {})) as {
      ok: boolean;
      paths: string[];
    };
    if (res.ok && res.paths.length > 0) setFilePaths(res.paths);
  }, []);
```

Render a button inside the dialog body (above the actions row) that shows the
chosen count:

```tsx
        <button type="button" className={styles["pick-files"]} onClick={chooseFiles}>
          {filePaths.length > 0
            ? `${filePaths.length} file${filePaths.length === 1 ? "" : "s"} selected`
            : "Choose files"}
        </button>
```

Add the `.pick-files` class to the component's own `styles.module.css`.

- [ ] **Step 2: Update `submit` to allow URL-less saves**

Replace the early `if (!trimmed) return;` guard and the submit call so the
dialog accepts files or a note even without a URL:

```tsx
  const submit = useCallback(async () => {
    const trimmed = url.trim();
    const tagList = tags
      .split(/[\s,]+/)
      .map((t) => t.replace(/^#+/, "").toLowerCase())
      .filter(Boolean);
    if (!trimmed && filePaths.length === 0 && !note.trim()) return;
    setBusy(true);
    try {
      const result =
        filePaths.length > 0
          ? ((await window.pond.query("saves.createManual", {
              url: trimmed || null,
              note: note.trim() || null,
              tags: tagList,
              filePaths,
            })) as { ok: boolean; id?: string; error?: string })
          : ((await window.pond.query("saves.quickAdd", {
              url: trimmed,
              note: note.trim(),
              tags: tagList,
            })) as { ok: boolean; id?: string; error?: string });
      if (result.ok) {
        setUrl("");
        setNote("");
        setTags("");
        setFilePaths([]);
        setOpen(false);
      } else {
        toast.error({ title: "Couldn't save that" });
      }
    } finally {
      setBusy(false);
    }
  }, [url, note, tags, filePaths, toast]);
```

(Adjust the surrounding state setter names to match the actual component; the
explore confirmed `url`, `note`, `tags`, `setOpen`, `setBusy` exist.)

- [ ] **Step 3: Verify**

Run: `pnpm --filter @pond/desktop typecheck && pnpm lint:check`
Expected: PASS.

- [ ] **Step 4: Manual smoke**

Run dev. Open quick capture (Cmd+N or the sidebar +). (a) Enter only a note and
two tags, no URL: expect a new "link" save whose note and tags persist (check
the inspector). (b) Click "Choose files", pick an image, add a tag, submit:
expect a new image save with that tag. (c) Paste a normal Twitter URL with a
note + tag: expect the URL save to ingest and the note/tags to be present once
complete.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/src/components/library/quick-capture
git commit -m "feat(capture): quick capture supports files and url-less manual saves"
```

---

## Self-Review Checklist

- [ ] Dropped files import and survive relaunch (info.json written).
- [ ] Quick capture note + tags persist for URL saves and manual saves.
- [ ] Unsupported URLs become manual saves instead of erroring out.
- [ ] `"local"` saves never appear in sync/harvest loops.
- [ ] `pnpm --filter @pond/desktop typecheck`, `pnpm --filter @pond/schema typecheck`, and `pnpm lint:check` all pass.

## Notes / Follow-ups (out of scope here)

- Width/height for imported images are left null. The color-search plan adds
  `sharp` and can backfill dimensions + palette for `"local"` saves in the same
  pass.
- A dedicated `local` source icon/preset label can be themed later; Task 1 +
  the filter preset make it selectable now.
