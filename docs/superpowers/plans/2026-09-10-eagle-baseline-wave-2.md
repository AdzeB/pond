# Eagle Baseline Wave 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not vendor Eagle source, templates, or SVG icons. Do not mix unrelated dirty-tree files into Wave 2 commits.

**Goal:** Ship the five missing Eagle first-party DAM operations Pond still lacks: Combine Images, Replace File, Pin to Top, Set as Folder Cover, Share, and Thumbnail Background.

**Architecture:** Main owns bytes and library queries. Renderer owns menus, gallery chrome, and folder presentation writes through existing prefs. Combine writes a new Save and leaves originals untouched. Pin and cover are folder presentation fields, not save columns. Share is Electron `shell.shareItem` on the original path, not Reveal in Finder. Thumbnail background is a gallery pref, not the inspector transparent-area control.

**Tech Stack:** TypeScript, Electron `^42.4.0`, sharp, Drizzle/SQLite, Pond UI menus, CSS Modules `data-*` states, Vitest, existing `query()` + `query-contracts.ts` pairs.

---

## Scope

| Operation | Eagle key | Pond label |
| --- | --- | --- |
| Combine Images | `context.image.merge` / `appmenu.edit>image>merge` | Combine Images |
| Replace File | `context.image.replaceFile` | Replace File |
| Pin to Top | folder item pin | Pin to Top / Unpin from Top |
| Folder cover | folder cover from selection | Set as Folder Cover / Remove Folder Cover |
| Share | `context.image.share` | Share |
| Thumbnail Background | `context.image.thumbnailBG` | Thumbnail Background: None, Black, Gray, White, Grid |

**Out of Wave 2:** plugins, Plugin Center, Navigator, GIF loop range, subtitles, Convert to PNG/JPG from WebP, collect/screenshots, fonts/RAW, Find Duplicates on empty gallery, Eagle Cloud, Pond cloud copy.

**Protect:** harvest, Sources, Agent, rebuildable index.

**UI rules:** Title Case. No ellipsis in chrome (`Replace File`, not `Replace File…`). No em dashes in user-facing copy. Pond nouns: Library, Save, Folder.

Wave 1 coverage file `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts` currently documents Combine/Share/Pin/Cover/Replace as a JSDoc note and Thumbnail Background as Wave 3. This wave turns those notes into assertions. Thumbnail Background is Wave 2 (program table), not Wave 3.

---

## Files this wave owns

- Create: `apps/desktop/src/main/core/combine-images.ts`
- Create: `apps/desktop/src/main/core/combine-images.test.ts`
- Create: `apps/desktop/src/main/core/replace-file.ts`
- Create: `apps/desktop/src/main/core/replace-file.test.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves-import.ts` (combine + replace queries)
- Modify: `apps/desktop/src/main/ipc/queries/saves-export.ts` (share query)
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `packages/schema/src/folder-presentation.ts`
- Modify: `packages/schema/src/viewer-prefs.ts`
- Modify: `apps/desktop/src/main/core/library-query.ts`
- Modify: `apps/desktop/src/main/core/library-query.test.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves.ts` (`saves.queryPage` / `saves.queryIds` pinned ids)
- Modify: `apps/desktop/src/renderer/src/features/library/state/folder-presentation.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`
- Modify: `apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-sidebar.tsx`
- Modify: `apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-sidebar.module.css`
- Create: `apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-cover.tsx`
- Create: `apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-cover.test.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/card/media/media.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/card/media/media.module.css`
- Modify: `apps/desktop/src/renderer/src/features/settings/lib/config-viewer.tsx`

Do not commit unrelated dirty files (menu accelerator rewrite, harvest, Eagle extracts, tmp PNGs).

---

### Task 1: Combine Images (join + skip rules)

**Files:**
- Create: `apps/desktop/src/main/core/combine-images.ts`
- Create: `apps/desktop/src/main/core/combine-images.test.ts`

Eagle joins JPG/PNG only and skips other formats. The joined file is a new Save. Originals stay on disk unchanged.

- [ ] **Step 1: Write the failing tests**

```ts
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { expect, it } from "vitest";
import {
  isCombinableImage,
  joinRasterImages,
} from "./combine-images";

it("accepts only jpeg and png", () => {
  expect(isCombinableImage("image/png", "a.png")).toBe(true);
  expect(isCombinableImage("image/jpeg", "a.jpg")).toBe(true);
  expect(isCombinableImage("image/webp", "a.webp")).toBe(false);
  expect(isCombinableImage("image/gif", "a.gif")).toBe(false);
  expect(isCombinableImage("image/vnd.adobe.photoshop", "a.psd")).toBe(false);
});

it("joins images left to right at the tallest height without touching originals", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pond-combine-"));
  try {
    const left = await sharp({
      create: { width: 10, height: 20, channels: 4, background: "red" },
    })
      .png()
      .toBuffer();
    const right = await sharp({
      create: { width: 10, height: 10, channels: 4, background: "blue" },
    })
      .png()
      .toBuffer();
    const leftPath = join(dir, "left.png");
    const rightPath = join(dir, "right.png");
    await writeFile(leftPath, left);
    await writeFile(rightPath, right);
    const combined = await joinRasterImages([leftPath, rightPath]);
    const meta = await sharp(combined).metadata();
    expect([meta.width, meta.height]).toEqual([30, 20]);
    expect(await readFile(leftPath)).toEqual(left);
    expect(await readFile(rightPath)).toEqual(right);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

```sh
pnpm --filter @pond/desktop exec vitest run src/main/core/combine-images.test.ts
```

Expected: FAIL, `combine-images` is not a module.

- [ ] **Step 3: Implement join helpers**

```ts
import sharp from "sharp";

const COMBINABLE = new Set(["image/jpeg", "image/jpg", "image/png"]);

export function isCombinableImage(
  mimeType: string | null | undefined,
  path: string,
): boolean {
  const mime = mimeType?.trim().toLowerCase() ?? "";
  if (COMBINABLE.has(mime)) return true;
  const lower = path.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png");
}

export async function joinRasterImages(paths: string[]): Promise<Buffer> {
  if (paths.length < 2) {
    throw new Error("Select at least two JPG or PNG images.");
  }
  const sources = await Promise.all(
    paths.map(async (path) => {
      const image = sharp(path).rotate();
      const meta = await image.metadata();
      return { path, width: meta.width ?? 1, height: meta.height ?? 1 };
    }),
  );
  const height = Math.max(...sources.map((source) => source.height));
  const resized = await Promise.all(
    sources.map(async (source) => {
      const buffer = await sharp(source.path)
        .rotate()
        .resize({ height, fit: "inside" })
        .ensureAlpha()
        .png()
        .toBuffer({ resolveWithObject: true });
      return buffer;
    }),
  );
  const width = resized.reduce((sum, item) => sum + item.info.width, 0);
  const composites = [];
  let left = 0;
  for (const item of resized) {
    composites.push({ input: item.data, left, top: 0 });
    left += item.info.width;
  }
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}
```

Do not add `combineImages(ids)` yet. That lands in Task 2.

- [ ] **Step 4: Re-run tests and confirm they pass**

```sh
pnpm --filter @pond/desktop exec vitest run src/main/core/combine-images.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add apps/desktop/src/main/core/combine-images.ts apps/desktop/src/main/core/combine-images.test.ts
git commit -m "$(cat <<'EOF'
feat: join JPG and PNG images into a new raster strip

EOF
)"
```

---

### Task 2: Combine Images query and Save menu

**Files:**
- Modify: `apps/desktop/src/main/core/combine-images.ts` (orchestration)
- Modify: `apps/desktop/src/main/ipc/queries/saves-import.ts`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`

- [ ] **Step 1: Add the failing menu assertion**

In `eagle-baseline-menu.test.ts`, add an `imageSave` helper next to `fileSave`:

```ts
function imageSave(id: string): Save {
  return {
    ...fileSave(),
    id,
    sourceId: id,
    mediaType: "image",
    files: [
      {
        kind: "cover",
        path: `${id}.png`,
        mimeType: "image/png",
        sha256: id,
        size: 1,
      },
    ],
  };
}
```

Add:

```ts
it("shows Combine Images when two PNG saves are selected", () => {
  const items = buildSaveMenu([imageSave("one"), imageSave("two")], {
    clipboardEmpty: true,
  });
  expect(labels(items)).toContain("Combine Images");
});

it("hides Combine Images for a single file save", () => {
  const items = buildSaveMenu(fileSave(), { clipboardEmpty: true });
  expect(labels(items)).not.toContain("Combine Images");
});
```

Keep the existing plugin/Open With tests.

- [ ] **Step 2: Run the menu test and confirm it fails**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

Expected: FAIL, `Combine Images` is missing.

- [ ] **Step 3: Add contracts**

In `QueryInputs` next to `"saves.createManual"`:

```ts
"saves.combineImages": { ids: string[]; folderId?: string | null };
```

In `QueryResults` next to `"saves.createManual"`:

```ts
"saves.combineImages": OkResult & {
  id?: string;
  skipped?: number;
  error?: string;
};
```

- [ ] **Step 4: Orchestrate combine in main**

Append to `combine-images.ts`:

```ts
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saves } from "@pond/schema/db";
import { inArray } from "drizzle-orm";
import { getDb } from "../db";
import { resolveSaveFilePath } from "../ipc/helpers";
import { addSavesToFolder } from "./folders";
import { createManualSave } from "./manual-import";

export async function combineImages(input: {
  ids: string[];
  folderId?: string | null;
}): Promise<{
  ok: boolean;
  id?: string;
  skipped?: number;
  error?: string;
}> {
  const unique = [...new Set(input.ids.filter(Boolean))];
  const db = await getDb();
  const rows = db.select().from(saves).where(inArray(saves.id, unique)).all();
  const byId = new Map(rows.map((row) => [row.id, row]));
  const paths: string[] = [];
  let skipped = 0;
  for (const id of unique) {
    const row = byId.get(id);
    const file = row?.files?.[0];
    if (!row || !isCombinableImage(file?.mimeType, file?.path ?? "")) {
      skipped += 1;
      continue;
    }
    const target = await resolveSaveFilePath(id, 0);
    if (!target.ok) {
      skipped += 1;
      continue;
    }
    paths.push(target.path);
  }
  if (paths.length < 2) {
    return {
      ok: false,
      skipped,
      error: "Select at least two JPG or PNG images.",
    };
  }
  const directory = await mkdtemp(join(tmpdir(), "pond-combine-"));
  try {
    const bytes = await joinRasterImages(paths);
    const path = join(directory, "combined.png");
    await writeFile(path, bytes);
    const created = await createManualSave({
      title: "Combined Images",
      filePaths: [path],
    });
    if (!created.ok || !created.id) {
      return {
        ok: false,
        skipped,
        error: created.error || "Couldn’t combine these images.",
      };
    }
    if (input.folderId) {
      await addSavesToFolder(input.folderId, [created.id]);
    }
    return { ok: true, id: created.id, skipped };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
```

Preserve selection order from `input.ids`, not database order.

Register in `saves-import.ts` next to `"saves.createManual"`:

```ts
"saves.combineImages": query(
  z.object({
    ids: StringListParam,
    folderId: NullableStringParam,
  }),
  async (params) => {
    const { combineImages } = await import("../../core/combine-images");
    return combineImages({
      ids: params.ids,
      folderId: params.folderId || null,
    });
  },
),
```

`savesQueries` already spreads `savesImportQueries`. No extra registration.

- [ ] **Step 5: Add the Save menu row**

In `menu.ts`:

1. Import `IconImagesOutline18` (already exported from `@pond/icons/outline/18`). If typecheck cannot find it, use `IconImageOutline18`.
2. Import `libraryChrome` from `@/features/library/state/library-chrome`.
3. Count combinable saves:

```ts
function combinableImageCount(items: readonly Save[]): number {
  return items.filter((item) =>
    item.files.some(
      (file) =>
        file.mimeType === "image/png" ||
        file.mimeType === "image/jpeg" ||
        file.mimeType === "image/jpg" ||
        /\.(png|jpe?g)$/i.test(file.path),
    ),
  ).length;
}
```

4. Insert a top-level row after `copyItems` and before Paste Tags:

```ts
{
  label: "Combine Images",
  icon: glyph(IconImagesOutline18),
  hidden: combinableImageCount(saves) < 2,
  onClick: () => {
    const nav = libraryChrome.getState().nav;
    void window.pond
      .query("saves.combineImages", {
        ids,
        folderId: nav.kind === "folder" ? nav.id : null,
      })
      .then((result) => {
        if (!result.ok) {
          notify({
            id: "combine-images",
            title: result.error ?? "Couldn’t combine these images.",
          });
          return;
        }
        const skipped =
          result.skipped && result.skipped > 0
            ? ` Skipped ${result.skipped} that are not JPG or PNG.`
            : "";
        notify({
          id: "combine-images",
          title: `Combined ${ids.length} images.${skipped}`,
        });
      });
  },
},
```

Do not put Combine Images inside More. Hidden when fewer than two combinable images are in the menu targets.

- [ ] **Step 6: Re-run tests**

```sh
pnpm --filter @pond/desktop exec vitest run src/main/core/combine-images.test.ts src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```sh
git add apps/desktop/src/main/core/combine-images.ts \
  apps/desktop/src/main/ipc/queries/saves-import.ts \
  apps/desktop/src/shared/query-contracts.ts \
  apps/desktop/src/renderer/src/features/saves/lib/menu.ts \
  apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
git commit -m "$(cat <<'EOF'
feat: add Combine Images to the Save menu

EOF
)"
```

---

### Task 3: Replace File

**Files:**
- Create: `apps/desktop/src/main/core/replace-file.ts`
- Create: `apps/desktop/src/main/core/replace-file.test.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves-import.ts`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`

Keep tags, folders, notes, and title. Swap the original bytes. Dialog copy has no ellipsis.

- [ ] **Step 1: Write the failing classification test**

`replace-file.test.ts` does not open a real library. It locks the kind chosen for replacement:

```ts
import { expect, it } from "vitest";
import { replacementKind } from "./replace-file";

it("replaces the first non-auxiliary file kind", () => {
  expect(
    replacementKind([
      { kind: "custom_thumbnail", path: "thumb.png" },
      { kind: "cover", path: "photo.jpg" },
      { kind: "media", path: "extra.png" },
    ]),
  ).toBe("cover");
});

it("returns null when there is no original file", () => {
  expect(replacementKind([{ kind: "custom_thumbnail", path: "thumb.png" }])).toBe(
    null,
  );
});
```

- [ ] **Step 2: Run it and confirm it fails**

```sh
pnpm --filter @pond/desktop exec vitest run src/main/core/replace-file.test.ts
```

Expected: FAIL, module missing.

- [ ] **Step 3: Implement replace helpers and persist**

```ts
import { stat } from "node:fs/promises";
import { saves, type SaveFile } from "@pond/schema/db";
import {
  classifyLibraryFile,
  libraryFilename,
} from "@shared/file-format";
import { eq } from "drizzle-orm";
import mime from "mime-types";
import { getDb } from "../db";
import { persistSave } from "./persist-save";

const AUXILIARY = new Set([
  "custom_thumbnail",
  "avatar",
  "source_icon",
  "poster",
]);

export function replacementKind(
  files: readonly Pick<SaveFile, "kind" | "path">[],
): string | null {
  return files.find((file) => !AUXILIARY.has(file.kind))?.kind ?? null;
}

export async function replaceSaveFile(input: {
  id: string;
  sourcePath: string;
}): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  const row = db
    .select()
    .from(saves)
    .where(eq(saves.id, input.id))
    .all()[0];
  const kind = replacementKind(row?.files ?? []);
  if (!kind) return { ok: false, error: "This save has no file to replace." };
  const format = classifyLibraryFile(
    input.sourcePath,
    mime.lookup(input.sourcePath) || null,
  );
  const info = await stat(input.sourcePath).catch(() => null);
  if (!info?.isFile() || info.size === 0) {
    return { ok: false, error: "Choose a non-empty file." };
  }
  const updated = await persistSave(
    input.id,
    { mediaType: format.mediaType },
    {
      actorReason: "user:replace-file",
      replaceFilesWithKind: kind,
      newFiles: [
        {
          kind,
          filename: libraryFilename(input.sourcePath, "original"),
          sourcePath: input.sourcePath,
          mimeType: format.mimeType,
        },
      ],
    },
  );
  return updated
    ? { ok: true }
    : { ok: false, error: "Couldn’t replace this file." };
}
```

Tags, folders, notes, and title stay because they are omitted from the patch.

- [ ] **Step 4: Add the query next to `saves.setCustomThumbnail`**

Contracts:

```ts
"saves.replaceFile": IdInput;
```

```ts
"saves.replaceFile": OkResult & { canceled?: boolean; error?: string };
```

Query (dialog pattern copied from `saves.setCustomThumbnail`, any file, no ellipsis):

```ts
"saves.replaceFile": query(z.object({ id: StringParam }), async (params) => {
  const win = BrowserWindow.getFocusedWindow() ?? undefined;
  const options = {
    properties: ["openFile" as const],
    message: "Choose a replacement file",
  };
  const picked = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);
  const path = picked.filePaths[0];
  if (picked.canceled || !path) return { ok: false, canceled: true };
  const { replaceSaveFile } = await import("../../core/replace-file");
  return replaceSaveFile({ id: params.id, sourcePath: path });
}),
```

- [ ] **Step 5: Menu row and coverage**

In `moreItems`, after Set Custom Thumbnail:

```ts
{
  label: "Replace File",
  icon: glyph(IconFileOutline18),
  hidden: batch || !hasFiles,
  onClick: () => {
    void window.pond.query("saves.replaceFile", { id: save.id }).then((result) => {
      if (result.canceled) return;
      if (!result.ok) {
        notify({
          id: "replace-file",
          title: result.error ?? "Couldn’t replace this file.",
        });
      }
    });
  },
},
```

Coverage test:

```ts
it("exposes Replace File on a single file save", () => {
  const items = buildSaveMenu(fileSave(), { clipboardEmpty: true });
  expect(labels(items)).toContain("Replace File");
});
```

`labels()` in this file does not recurse into More. Change `labels()` so it **does** include submenu item labels (same as `visibleLabels` in `menu.test.ts`), or assert via a local `submenuLabels(items, "More")` helper. Prefer expanding `labels()` to recurse into `submenu` / `group` so later Wave 2 rows inside More are visible to the coverage file. Keep skipping `hidden` rows.

After that change, the plugin test still must not see `Other` or `Plugin`.

- [ ] **Step 6: Run tests**

```sh
pnpm --filter @pond/desktop exec vitest run src/main/core/replace-file.test.ts src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts src/renderer/src/features/saves/lib/menu.test.ts
```

Expected: PASS. Re-run `menu.test.ts` because `labels()` recursion must not break existing hidden-row behavior there; that file has its own helpers.

- [ ] **Step 7: Commit**

```sh
git add apps/desktop/src/main/core/replace-file.ts \
  apps/desktop/src/main/core/replace-file.test.ts \
  apps/desktop/src/main/ipc/queries/saves-import.ts \
  apps/desktop/src/shared/query-contracts.ts \
  apps/desktop/src/renderer/src/features/saves/lib/menu.ts \
  apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
git commit -m "$(cat <<'EOF'
feat: replace a Save file without dropping tags or folders

EOF
)"
```

---

### Task 4: Pin to Top query order

**Files:**
- Modify: `packages/schema/src/folder-presentation.ts`
- Modify: `apps/desktop/src/renderer/src/features/library/state/folder-presentation.ts`
- Modify: `apps/desktop/src/main/core/library-query.ts`
- Modify: `apps/desktop/src/main/core/library-query.test.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves.ts`

`FolderPresentationSchema` today has icon, layout, sort, zoom, includeSubfolders, randomSeed, `manualOrder`. It does **not** have pin or cover. Add both here even though cover UI is Task 5, so prefs parse in one schema change.

- [ ] **Step 1: Write the failing pin-order test**

In `library-query.test.ts`, inside the existing `describe.skipIf(!nativeAvailable())` block:

```ts
it("floats pinned ids to the front of any sort", async () => {
  const { db } = setup();
  const request = {
    query: EMPTY_QUERY,
    sortKey: "savedAt",
    sortDir: "desc" as const,
    limit: 5,
  };
  const unpinned = await queryLibraryPage(db, "library", request, [], []);
  expect(unpinned.ids[0]).toBe("1199");
  const pinned = await queryLibraryPage(db, "library", request, [], ["0003", "0001"]);
  expect(pinned.ids.slice(0, 4)).toEqual(["0003", "0001", "1199", "1198"]);
});
```

`setup()` inserts 1200 saves with `savedAt = i`, ids `0000`…`1199`. Default desc puts `1199` first. Pinned ids keep array order, then the existing sort continues.

- [ ] **Step 2: Run it and confirm it fails**

```sh
ELECTRON_RUN_AS_NODE=1 pnpm --filter @pond/desktop exec electron node_modules/vitest/vitest.mjs run src/main/core/library-query.test.ts
```

If native sqlite is available under Node, `pnpm --filter @pond/desktop exec vitest run src/main/core/library-query.test.ts` is enough. Match however the existing file is run in this checkout. Expected: FAIL (arity or order).

- [ ] **Step 3: Extend the schema and folder defaults**

`packages/schema/src/folder-presentation.ts`:

```ts
export const FolderPresentationSchema = z.object({
  icon: z
    .enum(["folder", "bookmark", "album", "tag", "download", "code"])
    .optional(),
  layout: z.enum(["waterfall", "grid", "justified", "list"]).catch("waterfall"),
  sortKey: z.string().catch("savedAt"),
  sortDir: z.enum(["asc", "desc"]).catch("desc"),
  zoom: z.number().finite().catch(130),
  includeSubfolders: z.boolean().catch(true),
  randomSeed: z.string().catch("pond"),
  manualOrder: z.array(z.string()).catch([]),
  pinnedIds: z.array(z.string()).catch([]),
  coverSaveId: z.string().nullable().catch(null),
});
```

`folder-presentation.ts` renderer defaults:

```ts
const defaults: FolderPresentation = {
  layout: "waterfall",
  sortKey: "savedAt",
  sortDir: "desc",
  zoom: 130,
  includeSubfolders: true,
  randomSeed: "pond",
  manualOrder: [],
  pinnedIds: [],
  coverSaveId: null,
};
```

Existing stored folder views parse with `.catch([])` / `.catch(null)`, so old prefs stay valid.

- [ ] **Step 4: Teach `queryLibraryPage` about pins**

Keep the fourth argument as `manualOrder`. Add a fifth:

```ts
export async function queryLibraryPage(
  db: Db,
  libraryId: string,
  request: LibraryQueryRequest,
  manualOrder: readonly string[] = [],
  pinnedIds: readonly string[] = [],
): Promise<LibraryQueryPage> {
```

Same fifth argument on `queryLibraryIds`.

Change `queryOrder` to take `pinnedIds` and include them in `signature`:

```ts
function queryOrder(
  request: LibraryQueryRequest,
  manualOrder: readonly string[],
  pinnedIds: readonly string[] = [],
) {
  const orderKey =
    request.sortKey === "manual" ? prepareManualOrder(manualOrder) : "";
  const pinKey = JSON.stringify(pinnedIds);
  return {
    column: librarySortColumn(request.sortKey, {
      randomSeed: request.randomSeed,
      orderKey,
    }),
    pinRank: sql`coalesce((select cast(key as integer) from json_each(${pinKey}) where value = ${saves.id} limit 1), 1000000000)`,
    signature: `${request.sortKey}:${request.sortDir}:${request.randomSeed ?? "pond"}:${orderKey}:${pinKey}`,
  };
}
```

`orderBy` in both `queryLibraryPage` and `queryLibraryIds` becomes:

```ts
.orderBy(
  asc(pinRank),
  asc(sql`${column} is null`),
  ascending ? asc(column) : desc(column),
  desc(saves.id),
)
```

Use the same `ascending` boolean already computed in `queryLibraryPage`. In `queryLibraryIds`, keep `request.sortDir === "asc"`.

Empty `pinnedIds` (`[]`) makes every row rank `1000000000`, so existing tests stay ordered as today.

- [ ] **Step 5: Pass pinned ids from `saves.queryPage`**

In `saves.ts`, both `saves.queryPage` and `saves.queryIds` currently pass `manualOrder` only when `sortKey === "manual"`. Keep that. Always pass pins when `orderFolderId` is set:

```ts
"saves.queryPage": query(LibraryQueryParams, async (params) => {
  const view = params.orderFolderId
    ? (await getPrefs()).folderViews[params.orderFolderId]
    : undefined;
  return queryLibraryPage(
    await getDb(),
    basename(resolvePaths().indexDb, ".db"),
    params,
    params.sortKey === "manual" ? (view?.manualOrder ?? []) : [],
    view?.pinnedIds ?? [],
  );
}),
```

Mirror for `saves.queryIds`.

- [ ] **Step 6: Re-run query tests**

```sh
pnpm --filter @pond/desktop exec vitest run src/main/core/library-query.test.ts
```

Expected: PASS, including the new pin test and the existing paging test.

- [ ] **Step 7: Commit**

```sh
git add packages/schema/src/folder-presentation.ts \
  apps/desktop/src/renderer/src/features/library/state/folder-presentation.ts \
  apps/desktop/src/main/core/library-query.ts \
  apps/desktop/src/main/core/library-query.test.ts \
  apps/desktop/src/main/ipc/queries/saves.ts
git commit -m "$(cat <<'EOF'
feat: pin folder saves ahead of the active gallery sort

EOF
)"
```

If `view-store.test.ts` constructs a presentation object and a later typecheck requires `pinnedIds`, add `pinnedIds: []` and `coverSaveId: null` there in this commit.

---

### Task 5: Pin / cover Save menu and sidebar cover

**Files:**
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`
- Create: `apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-cover.tsx`
- Create: `apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-cover.test.ts`
- Modify: `apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-sidebar.tsx`
- Modify: `apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-sidebar.module.css`

Rows are visible only when `libraryChrome` nav is a folder, or when the test passes `folderId`.

- [ ] **Step 1: Failing menu tests**

Extend `BuildSaveMenuOptions` in tests:

```ts
it("hides pin and cover outside a folder", () => {
  const items = buildSaveMenu(fileSave(), { clipboardEmpty: true });
  expect(labels(items)).not.toContain("Pin to Top");
  expect(labels(items)).not.toContain("Set as Folder Cover");
});

it("shows Pin to Top and Set as Folder Cover inside a folder", () => {
  const items = buildSaveMenu(fileSave(), {
    clipboardEmpty: true,
    folderId: "landscapes",
    pinnedIds: [],
    coverSaveId: null,
  });
  expect(labels(items)).toContain("Pin to Top");
  expect(labels(items)).toContain("Set as Folder Cover");
});

it("toggles pin and cover labels for the active save", () => {
  const items = buildSaveMenu(fileSave(), {
    clipboardEmpty: true,
    folderId: "landscapes",
    pinnedIds: ["file-save"],
    coverSaveId: "file-save",
  });
  expect(labels(items)).toContain("Unpin from Top");
  expect(labels(items)).toContain("Remove Folder Cover");
  expect(labels(items)).not.toContain("Pin to Top");
});
```

- [ ] **Step 2: Run and confirm fail**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

- [ ] **Step 3: Options + rows**

Add to `BuildSaveMenuOptions`:

```ts
folderId?: string | null;
pinnedIds?: readonly string[];
coverSaveId?: string | null;
```

Inside `buildSaveMenu`, resolve folder context:

```ts
const nav = libraryChrome.getState().nav;
const resolvedFolderId =
  folderId !== undefined
    ? folderId
    : nav.kind === "folder"
      ? nav.id
      : null;
const folderView = resolvedFolderId
  ? getPrefsSnapshot()?.folderViews[resolvedFolderId]
  : undefined;
const resolvedPinned = pinnedIds ?? folderView?.pinnedIds ?? [];
const resolvedCover =
  coverSaveId !== undefined ? coverSaveId : (folderView?.coverSaveId ?? null);
const inFolder = Boolean(resolvedFolderId);
const isPinned = !batch && resolvedPinned.includes(save.id);
const isCover = !batch && resolvedCover === save.id;
```

Insert after Combine Images (still top-level, not More):

```ts
{
  label: isPinned ? "Unpin from Top" : "Pin to Top",
  icon: glyph(IconPinOutline18),
  hidden: !inFolder || batch,
  onClick: () => {
    if (!resolvedFolderId) return;
    const next = isPinned
      ? resolvedPinned.filter((id) => id !== save.id)
      : [save.id, ...resolvedPinned.filter((id) => id !== save.id)];
    void saveFolderPresentation(resolvedFolderId, { pinnedIds: [...next] });
  },
},
{
  label: isCover ? "Remove Folder Cover" : "Set as Folder Cover",
  icon: glyph(IconCoverOutline18),
  hidden: !inFolder || batch,
  onClick: () => {
    if (!resolvedFolderId) return;
    void saveFolderPresentation(resolvedFolderId, {
      coverSaveId: isCover ? null : save.id,
    });
  },
},
```

Import `IconCoverOutline18` and `saveFolderPresentation`.

Production call sites (gallery context menu, kebab, viewer) do not need new props. They read chrome. Tests pass `folderId` so they stay deterministic.

- [ ] **Step 4: Cover URL helper test**

`folder-cover.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { Save } from "@/features/saves/types";
import { folderCoverUrl } from "./folder-cover";

function coverSave(): Save {
  return {
    id: "cover-save",
    source: "local",
    sourceId: "cover-save",
    url: "pond:local/cover-save",
    title: "Cover",
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: "image",
    files: [
      {
        kind: "cover",
        path: "photo.png",
        mimeType: "image/png",
        sha256: "abcdef1234567890",
        size: 1,
      },
    ],
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
  };
}

describe("folder cover url", () => {
  it("points at the cover file", () => {
    expect(folderCoverUrl(coverSave())).toMatch(/^pond:\/\/cover-save\/photo\.png/);
  });
});
```

- [ ] **Step 5: Implement `folder-cover.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import { FolderIcon } from "@/features/library/components/folder-sidebar/folder-icons";
import { pickPrimaryFile } from "@/features/saves/lib/media/units";
import { buildPondUrl, thumbUrlFor } from "@/features/saves/lib/media/url";
import type { Save } from "@/features/saves/types";
import styles from "./folder-sidebar.module.css";

export function folderCoverUrl(save: Save): string | null {
  const file = pickPrimaryFile(save);
  if (!file) return null;
  return thumbUrlFor(buildPondUrl(save.id, file), 36);
}

export function FolderCover({
  icon,
  coverSaveId,
}: {
  icon?: string;
  coverSaveId?: string | null;
}) {
  const [save, setSave] = useState<Save | null>(null);
  useEffect(() => {
    if (!coverSaveId) {
      setSave(null);
      return;
    }
    let cancelled = false;
    void window.pond.query("saves.get", { id: coverSaveId }).then((row) => {
      if (!cancelled) setSave(row);
    });
    return () => {
      cancelled = true;
    };
  }, [coverSaveId]);
  const src = useMemo(() => (save ? folderCoverUrl(save) : null), [save]);
  if (src) {
    return <img className={styles.cover} src={src} alt="" />;
  }
  return <FolderIcon name={icon} />;
}
```

`saves.get` already returns `WireSave | null`. `Save` in the renderer is that wire shape.

CSS in `folder-sidebar.module.css`:

```css
.cover {
  width: 18px;
  height: 18px;
  object-fit: cover;
  border-radius: var(--ds-radius-sm);
}
```

In `folder-sidebar.tsx`, replace:

```tsx
<FolderIcon name={folderViews[folder.id]?.icon} />
```

with:

```tsx
<FolderCover
  icon={folderViews[folder.id]?.icon}
  coverSaveId={folderViews[folder.id]?.coverSaveId}
/>
```

Keep the color span wrapper.

- [ ] **Step 6: Run tests**

```sh
pnpm --filter @pond/desktop exec vitest run \
  src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts \
  src/renderer/src/features/library/components/folder-sidebar/folder-cover.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```sh
git add apps/desktop/src/renderer/src/features/saves/lib/menu.ts \
  apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts \
  apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-cover.tsx \
  apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-cover.test.ts \
  apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-sidebar.tsx \
  apps/desktop/src/renderer/src/features/library/components/folder-sidebar/folder-sidebar.module.css
git commit -m "$(cat <<'EOF'
feat: pin saves and set a folder cover from the Save menu

EOF
)"
```

---

### Task 6: Share via macOS share sheet

**Files:**
- Modify: `apps/desktop/src/main/ipc/queries/saves-export.ts`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`

`shell.showItemInFolder` is Reveal in Finder. Share is `shell.shareItem` (Electron 42, macOS/Windows). Types in this tree may omit it; guard at runtime.

- [ ] **Step 1: Failing menu test**

```ts
it("exposes Share when the save has a file", () => {
  expect(
    labels(buildSaveMenu(fileSave(), { clipboardEmpty: true })),
  ).toContain("Share");
});
```

- [ ] **Step 2: Run and confirm fail**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

- [ ] **Step 3: Contracts + query**

```ts
"saves.share": { id: string; fileIndex?: number };
```

```ts
"saves.share": OkResult & { error?: string };
```

In `saves-export.ts`, import `shell` from `electron`. Add:

```ts
"saves.share": query(
  z.object({ id: StringParam, fileIndex: FileIndexParam }),
  async (params) => {
    const target = await resolveSaveFilePath(params.id, params.fileIndex);
    if (!target.ok) {
      return { ok: false, error: "This save has no file to share." };
    }
    const shareItem = (
      shell as typeof shell & {
        shareItem?: (itemPath: string) => Promise<void>;
      }
    ).shareItem;
    if (typeof shareItem !== "function") {
      return { ok: false, error: "Share is unavailable on this Mac." };
    }
    try {
      await shareItem(target.path);
      return { ok: true };
    } catch (error) {
      log.warn("[pond ipc] saves.share failed", error);
      return { ok: false, error: "Couldn’t share this file." };
    }
  },
),
```

`FileIndexParam` is already imported in this file. `savesQueries` already spreads `savesExportQueries`.

Wave 2 shares the clicked save’s original, not a multi-file share sheet.

- [ ] **Step 4: Menu row**

Import `IconShareRightOutline18`. Place Share after Reveal in Finder (`REVEAL_LABEL`) in `openItems`:

```ts
{
  label: "Share",
  icon: glyph(IconShareRightOutline18),
  hidden: !hasFiles || batch,
  onClick: () => {
    void window.pond
      .query("saves.share", {
        id: save.id,
        fileIndex: fileIndex ?? undefined,
      })
      .then((result) => {
        if (!result.ok) {
          notify({
            id: "share",
            title: result.error ?? "Couldn’t share this file.",
          });
        }
      });
  },
},
```

- [ ] **Step 5: Run tests**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```sh
git add apps/desktop/src/main/ipc/queries/saves-export.ts \
  apps/desktop/src/shared/query-contracts.ts \
  apps/desktop/src/renderer/src/features/saves/lib/menu.ts \
  apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
git commit -m "$(cat <<'EOF'
feat: share a Save through the macOS share sheet

EOF
)"
```

---

### Task 7: Thumbnail Background (gallery)

**Files:**
- Modify: `packages/schema/src/viewer-prefs.ts`
- Modify: `apps/desktop/src/renderer/src/features/settings/lib/config-viewer.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/card/media/media.tsx`
- Modify: `apps/desktop/src/renderer/src/features/saves/components/card/media/media.module.css`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/menu.ts`
- Modify: `apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts`

Inspector `viewer.transparentBackground` stays as-is (Theme / Checkerboard / White / Black on the open viewer). This pref is gallery cards only.

- [ ] **Step 1: Failing menu test**

```ts
it("exposes Thumbnail Background on the gallery menu only", () => {
  const gallery = buildSaveMenu(fileSave(), { clipboardEmpty: true });
  expect(labels(gallery)).toContain("Thumbnail Background");
  const submenu = gallery.find(
    (item) => item.type === "submenu" && item.label === "Thumbnail Background",
  );
  expect(
    submenu && "items" in submenu
      ? submenu.items.flatMap((item) =>
          "label" in item && typeof item.label === "string" ? [item.label] : [],
        )
      : [],
  ).toEqual(["None", "Black", "Gray", "White", "Grid"]);
  const opened = buildSaveMenu(fileSave(), {
    clipboardEmpty: true,
    opened: true,
  });
  expect(labels(opened)).not.toContain("Thumbnail Background");
});
```

If `labels()` now recurses, the five values will also appear in the flattened list. Keep the submenu assertion either way.

Delete the Wave 2/Wave 3 JSDoc comments at the top of this describe. The tests are the list.

- [ ] **Step 2: Run and confirm fail**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
```

- [ ] **Step 3: Pref + settings**

`viewer-prefs.ts`:

```ts
export const ViewerPrefsSchema = z.object({
  spaceBehavior: z.enum(["toggle", "hold"]).catch("toggle"),
  wheelBehavior: z.enum(["scroll", "zoom", "navigate"]).catch("scroll"),
  rememberImagePosition: z.boolean().catch(true),
  imageRendering: z.enum(["smooth", "pixelated"]).catch("smooth"),
  transparentBackground: z
    .enum(["none", "checkerboard", "white", "black"])
    .catch("none"),
  thumbnailBackground: z
    .enum(["none", "black", "gray", "white", "grid"])
    .catch("none"),
  autoplayVideo: z.boolean().catch(true),
  hoverVideo: z.boolean().catch(true),
  rememberPlayback: z.boolean().catch(true),
  loopShortVideos: z.boolean().catch(true),
  stretchVideo: z.boolean().catch(false),
});
```

In `config-viewer.tsx`, add a Gallery group on `viewer` **after** the Images group, **not** as a new option on Transparent Areas:

```ts
group.prefs("viewer", {
  title: "Gallery",
  items: [
    {
      control: "select",
      key: "thumbnailBackground",
      title: "Thumbnail Background",
      description: "Fill behind gallery thumbnails, including transparent images.",
      options: [
        { value: "none", label: "None" },
        { value: "black", label: "Black" },
        { value: "gray", label: "Gray" },
        { value: "white", label: "White" },
        { value: "grid", label: "Grid" },
      ],
    },
  ],
}),
```

- [ ] **Step 4: Card + CSS**

In `PreparedCardThumb`, `usePrefs("viewer")` and set the attribute only when not `none`:

```tsx
const [viewer] = usePrefs("viewer");
const thumbnailBackground = viewer.thumbnailBackground ?? "none";
```

On the `.thumb` div:

```tsx
data-thumbnail-bg={
  thumbnailBackground !== "none" ? thumbnailBackground : undefined
}
```

CSS (keep `.thumb` background as `--ds-gray-2` for None):

```css
.thumb {
  &[data-thumbnail-bg="black"] {
    background-color: #000;
  }

  &[data-thumbnail-bg="gray"] {
    background-color: #808080;
  }

  &[data-thumbnail-bg="white"] {
    background-color: #fff;
  }

  &[data-thumbnail-bg="grid"] {
    background-color: #fff;
    background-image:
      linear-gradient(45deg, #ccc 25%, transparent 25%),
      linear-gradient(-45deg, #ccc 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #ccc 75%),
      linear-gradient(-45deg, transparent 75%, #ccc 75%);
    background-position:
      0 0,
      0 8px,
      8px -8px,
      -8px 0;
    background-size: 16px 16px;
  }
}
```

Do not put `data-thumbnail-bg` on the inspector. `image-inspector` keeps `data-background={prefs.transparentBackground}`.

- [ ] **Step 5: Menu submenu**

```ts
const thumbnailBackground =
  getPrefsSnapshot()?.viewer.thumbnailBackground ?? "none";
const thumbnailBackgroundItems: MenuItemSpec[] = (
  [
    ["none", "None"],
    ["black", "Black"],
    ["gray", "Gray"],
    ["white", "White"],
    ["grid", "Grid"],
  ] as const
).map(([value, label]) => ({
  type: "checkbox",
  label,
  checked: thumbnailBackground === value,
  onCheckedChange: () => {
    void savePrefsSection("viewer", { thumbnailBackground: value });
  },
}));
```

Put the submenu in `moreItems` (gallery More), hidden on the open viewer and on batch:

```ts
{
  type: "submenu",
  label: "Thumbnail Background",
  icon: glyph(IconGridOutline18),
  hidden: opened || batch,
  items: thumbnailBackgroundItems,
},
```

`IconGridOutline18` is already imported in `menu.ts`. Import `savePrefsSection`.

- [ ] **Step 6: Run tests**

```sh
pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts src/renderer/src/features/saves/lib/menu.test.ts
```

Expected: PASS. Open Save stays hidden when `opened: true`. Thumbnail Background is absent there.

- [ ] **Step 7: Commit**

```sh
git add packages/schema/src/viewer-prefs.ts \
  apps/desktop/src/renderer/src/features/settings/lib/config-viewer.tsx \
  apps/desktop/src/renderer/src/features/saves/components/card/media/media.tsx \
  apps/desktop/src/renderer/src/features/saves/components/card/media/media.module.css \
  apps/desktop/src/renderer/src/features/saves/lib/menu.ts \
  apps/desktop/src/renderer/src/features/saves/lib/eagle-baseline-menu.test.ts
git commit -m "$(cat <<'EOF'
feat: add gallery thumbnail background fills from Eagle

EOF
)"
```

---

## Self-review

- Spec coverage: Combine, Replace File, Pin to Top, Set as Folder Cover, Share, Thumbnail Background each have a task. Wave 3 items stay out.
- Placeholder scan: no TBD, no “add tests later,” no “similar to Task N” without code.
- Types: `saves.combineImages` / `saves.replaceFile` / `saves.share` match across contracts, queries, and menu `window.pond.query` calls. `pinnedIds` + `coverSaveId` match schema, defaults, query fifth arg, and menu options. `thumbnailBackground` is not `transparentBackground`.
- Originals: combine writes a new Save; replace swaps bytes on the same id; share does not copy.

## After this plan

Wave 3 (`docs/superpowers/plans/YYYY-MM-DD-eagle-baseline-wave-3.md`) owns GIF loop range, Set as GIF Thumbnail, Load Subtitles, Show Navigator, list columns, Convert to PNG/JPG from WebP.
