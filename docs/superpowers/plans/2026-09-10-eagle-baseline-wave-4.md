# Eagle Baseline Wave 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not vendor Eagle source, templates, or SVG icons. Do not mix unrelated dirty-tree files into Wave 4 commits. Do not replace harvest, Sources, or Agent.

**Goal:** Ship Eagle’s remaining first-party Collect funnel: page-asset review before save, save-time folder and tag, element screenshots, Auto-Import settings, and a live-session smoke that proves screenshots, clipboard, and the watched folder.

**Architecture:** Extension and desktop both enqueue `CaptureDraft` rows. Page extract no longer silent-imports; it opens Collect on `mode: "collect"`. Collect shows the draft’s assets as a review grid and already owns folder/tag fields. The extension page-asset dialog sends tags and folder ids on `capture.accept`. Auto-Import prefs (`autoImport.set` / `status` / `pickFolder`) already exist; Settings must drive them instead of sending people to Sources. Native host grows `folders.list` so the extension can pick folders without a Pond cloud.

**Tech Stack:** TypeScript, Electron `^42.4.0`, Chrome extension (WXT), Pond UI, CSS Modules `data-*` states, Vitest, existing `query()` + `query-contracts.ts` pairs, `captures.accept`.

---

## Scope

| Operation | Eagle surface | Pond label |
| --- | --- | --- |
| Page-asset review | Collect images grid | Collect images / Collection Window asset grid |
| Save-time folder/tag | Extension collect metadata | Tags and Folders on the grid; Collect categorizes |
| Element screenshot | Browser element capture | Save page element screenshot |
| Auto-Import settings | Preferences auto-import | Watched Folder in Storage |
| Live proof | Capture session | `smoke-collect.cjs` plus tray Collect/screenshot |

**Out of Wave 4:** plugins, Plugin Center, harvest/Sources replacement, Eagle Cloud, Pond cloud copy, multi-folder Auto-Import watches, app lock / folder passwords as a Pond feature.

**Protect:** harvest, Sources, Agent, rebuildable index.

**UI rules:** Title Case. No ellipsis in chrome (`Save Selected`, not `Save selected…`). No em dashes. Pond nouns: Library, Save, Folder. Search placeholders may use `…`.

**Live-browser gap:** this machine cannot notarize a Chrome handoff. Task 5’s smoke covers desktop Collect, clipboard, screenshots, and Auto-Import. Extension unit tests cover tags, folders, and element regions. A human still loads the unpacked extension once.

---

## Working-tree commit policy

The live working copy is far ahead of HEAD. Implement against the live tree so `pnpm dev` stays current. Commit only Wave 4 hunks.

Never `git add -p`, `git add -i`, `git checkout .`, or `git restore .`.

For a **mixed tracked file** (Wave 4 plus unrelated dirty edits):

1. Copy the live file aside (`cp path path.wave4bak`).
2. `git checkout HEAD -- path` to get HEAD.
3. Re-apply **only** the Wave 4 edits from this plan onto HEAD.
4. `git add` that file plus any new Wave 4 files.
5. Commit.
6. Restore the backup (`mv path.wave4bak path`) and re-apply the Wave 4 edits onto the restored dirty file so `pnpm dev` still has them.

Untracked rewrite files stay untracked unless this wave created them.

---

## Files this wave owns

- Create: `apps/desktop/src/main/core/page-extract.test.ts`
- Create: `apps/desktop/src/main/core/capture-metadata.test.ts`
- Create: `apps/extension/utils/element-region.ts`
- Create: `apps/desktop/src/renderer/src/features/settings/components/sections/storage/auto-import.tsx`
- Create: `apps/desktop/src/renderer/src/features/settings/components/sections/storage/auto-import.test.tsx`
- Create: `apps/desktop/scripts/smoke-collect.cjs`
- Modify: `packages/schema/src/capture.ts`
- Modify: `packages/schema/src/native.ts`
- Modify: `apps/desktop/src/main/core/page-extract.ts`
- Modify: `apps/desktop/src/main/ipc/queries/saves-import.ts`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/renderer/src/features/library/components/new-menu/actions.ts`
- Modify: `apps/desktop/src/renderer/src/app/windows/collect-shell/collect-shell.tsx`
- Modify: `apps/desktop/src/renderer/src/app/windows/collect-shell/collect-shell.module.css`
- Modify: `apps/desktop/src/renderer/src/app/windows/collect-shell/collect-shell.test.tsx`
- Modify: `apps/desktop/src/main/native/rpc.ts`
- Modify: `apps/desktop/src/main/native/rpc.test.ts`
- Modify: `apps/desktop/src/main/native/ports.ts`
- Modify: `apps/extension/utils/page-assets.ts`
- Modify: `apps/extension/entrypoints/background.ts`
- Modify: `apps/extension/utils/browser-screenshot.ts`
- Modify: `apps/desktop/src/renderer/src/features/settings/lib/config-storage.tsx`
- Modify: `apps/desktop/src/renderer/src/features/settings/components/sections/storage/storage.tsx`
- Modify: `apps/desktop/src/renderer/src/features/settings/lib/search-index.ts`
- Modify: `apps/desktop/src/main/tray-menu.ts`
- Modify: `apps/desktop/src/main/tray.ts`

Do not commit unrelated dirty files.

---

### Task 1: Page extract opens Collect instead of silent import

**Files:**
- Create: `apps/desktop/src/main/core/page-extract.test.ts`
- Modify: `apps/desktop/src/main/core/page-extract.ts`
- Modify: `apps/desktop/src/shared/query-contracts.ts`
- Modify: `apps/desktop/src/renderer/src/features/library/components/new-menu/actions.ts`

Silent import of the first 40 images ≥200px is the hole. `captures.accept` with `mode: "collect"` already opens Collection Window. Keep the hidden BrowserWindow scrape. Do not call `createManualSave` from page extract.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { pageAssetsDraft, pickPageImages } from "./page-extract";

const huge = { src: "https://cdn.example/a.jpg", width: 800, height: 600 };
const tiny = { src: "https://cdn.example/b.jpg", width: 40, height: 40 };
const data = { src: "data:image/png;base64,xx", width: 800, height: 600 };

describe("pickPageImages", () => {
  it("keeps http images at or above the minimum edge", () => {
    expect(pickPageImages([tiny, huge, data])).toEqual([huge]);
  });

  it("caps the review set", () => {
    const images = Array.from({ length: 50 }, (_, index) => ({
      src: `https://cdn.example/${index}.jpg`,
      width: 400,
      height: 400,
    }));
    expect(pickPageImages(images)).toHaveLength(40);
  });
});

describe("pageAssetsDraft", () => {
  it("queues collect-mode asset items with the page-asset tag", () => {
    expect(
      pageAssetsDraft({
        id: "draft-1",
        originUrl: "https://example.test/gallery",
        images: [huge],
      }),
    ).toEqual({
      id: "draft-1",
      originUrl: "https://example.test/gallery",
      mode: "collect",
      metadata: { tags: ["page-asset"], folderIds: [] },
      items: [{ kind: "asset", url: huge.src }],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/page-extract.test.ts`

Expected: FAIL because `pickPageImages` / `pageAssetsDraft` are not exported.

- [ ] **Step 3: Write minimal implementation**

In `apps/desktop/src/main/core/page-extract.ts` replace the silent `createManualSave` loop. Keep `MIN_EDGE = 200`, `MAX_ASSETS = 40`, `LOAD_MS = 15_000`.

```ts
import { randomUUID } from "node:crypto";
import { BrowserWindow } from "electron";
import log from "electron-log/main.js";
import { z } from "zod";
import { captures } from "./captures";

const MIN_EDGE = 200;
const MAX_ASSETS = 40;
const LOAD_MS = 15_000;

const PageImagesSchema = z
  .array(z.object({ src: z.string(), width: z.number(), height: z.number() }))
  .nullable();

export function pickPageImages(
  images: { src: string; width: number; height: number }[],
  minEdge = MIN_EDGE,
  maxAssets = MAX_ASSETS,
) {
  return images
    .filter(
      (img) =>
        img.width >= minEdge &&
        img.height >= minEdge &&
        /^https?:/i.test(img.src),
    )
    .slice(0, maxAssets);
}

export function pageAssetsDraft(input: {
  id: string;
  originUrl: string;
  images: { src: string; width: number; height: number }[];
}) {
  return {
    id: input.id,
    originUrl: input.originUrl,
    mode: "collect" as const,
    metadata: { tags: ["page-asset"], folderIds: [] },
    items: pickPageImages(input.images).map((img) => ({
      kind: "asset" as const,
      url: img.src,
    })),
  };
}

export async function extractPageAssets(url: string): Promise<{
  ok: boolean;
  imported: number;
  skipped: number;
  queued: number;
  draftId?: string;
  error?: string;
}> {
  let href: string;
  try {
    href = new URL(url).toString();
  } catch {
    return {
      ok: false,
      imported: 0,
      skipped: 0,
      queued: 0,
      error: "invalid_url",
    };
  }
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: { sandbox: true, contextIsolation: true },
  });
  try {
    await win.loadURL(href, { extraHeaders: "pragma: no-cache\n" });
    const images = PageImagesSchema.parse(
      await Promise.race([
        win.webContents.executeJavaScript(
          `([...document.images]).map((img) => ({
          src: img.currentSrc || img.src,
          width: img.naturalWidth,
          height: img.naturalHeight,
        }))`,
          true,
        ),
        new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), LOAD_MS),
        ),
      ]),
    );
    if (!images)
      return {
        ok: false,
        imported: 0,
        skipped: 0,
        queued: 0,
        error: "timeout",
      };
    const draft = pageAssetsDraft({
      id: randomUUID(),
      originUrl: href,
      images,
    });
    const skipped = images.length - draft.items.length;
    if (draft.items.length === 0)
      return { ok: true, imported: 0, skipped, queued: 0 };
    const receipt = await captures.accept(draft);
    return {
      ok: true,
      imported: 0,
      skipped,
      queued: draft.items.length,
      draftId: receipt.id,
    };
  } catch (err) {
    log.warn("[pond page-extract] failed", href, err);
    return {
      ok: false,
      imported: 0,
      skipped: 0,
      queued: 0,
      error: "extract_failed",
    };
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}
```

In `query-contracts.ts` widen `ImportResult` (or only the extract result) with optional `queued` and `draftId`:

```ts
interface ImportResult extends OkResult {
  imported: number;
  skipped: number;
  queued?: number;
  draftId?: string;
}
```

`saves-import.ts` already returns `extractPageAssets(url)`. No handler rewrite if the return type matches.

In `new-menu/actions.ts` `importPageAssets`, toast Collect instead of Saved:

```ts
async function importPageAssets(url: string): Promise<void> {
  const href = url.trim();
  if (!href) throw new Error("Enter a website link.");
  notify({ id: "new-import", title: "Extracting page assets", timeout: 0 });
  const result = await window.pond.query("saves.extractPageAssets", {
    url: href,
  });
  if (!result.ok && !result.queued && !result.imported) {
    throw new Error("Couldn't extract images from that page. Try again.");
  }
  notify({
    id: "new-import",
    title: result.queued
      ? `Opened Collect with ${result.queued} ${result.queued === 1 ? "image" : "images"}`
      : "No images large enough",
    timeout: 5000,
  });
}
```

Empty-gallery confirm stays `Import`. Dialog title stays `Import Page Assets`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/page-extract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/main/core/page-extract.ts \
  apps/desktop/src/main/core/page-extract.test.ts \
  apps/desktop/src/shared/query-contracts.ts \
  apps/desktop/src/renderer/src/features/library/components/new-menu/actions.ts
git commit -m "$(cat <<'EOF'
feat(desktop): open Collect for page-asset review

Silent import skipped folder and tag. Queue the scrape as a collect draft.

EOF
)"
```

If `query-contracts.ts` or `actions.ts` are mixed, use the Wave 4 bak/checkout/re-apply policy.

---

### Task 2: Collect shows the draft asset grid

**Files:**
- Modify: `apps/desktop/src/renderer/src/app/windows/collect-shell/collect-shell.tsx`
- Modify: `apps/desktop/src/renderer/src/app/windows/collect-shell/collect-shell.module.css`
- Modify: `apps/desktop/src/renderer/src/app/windows/collect-shell/collect-shell.test.tsx`

Collection Window already edits tags, folders, rating, notes. It does not show which images are about to save. Load the newest draft automatically. Render a grid of draft items. Use CSS module classes (`grid`, `asset`), not inline layout for the new grid. Use `useScrollFade` on the grid if it scrolls.

- [ ] **Step 1: Write the failing test**

Add to `collect-shell.test.tsx`:

```ts
it("opens the newest draft and shows its page assets", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const query = vi.fn(async (name: string, input?: { id?: string }) => {
    if (name === "captures.list")
      return [
        { id: "old", state: "complete", total: 1, completed: 1, duplicateCount: 0 },
        { id: "new", state: "draft", total: 2, completed: 0, duplicateCount: 0 },
      ];
    if (name === "folders.list") return [{ id: "refs", name: "Refs" }];
    if (name === "captures.draft" && input?.id === "new")
      return {
        id: "new",
        mode: "collect",
        items: [
          { kind: "asset", url: "https://cdn.example/one.jpg" },
          { kind: "asset", url: "https://cdn.example/two.jpg" },
        ],
        metadata: { tags: ["page-asset"], folderIds: [] },
      };
    return { ok: true };
  });
  vi.stubGlobal("pond", { query });
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<CollectShell />));
    await act(async () => {});
    expect(query).toHaveBeenCalledWith("captures.draft", { id: "new" });
    const images = [...host.querySelectorAll("img")].map((node) => node.src);
    expect(images).toEqual([
      "https://cdn.example/one.jpg",
      "https://cdn.example/two.jpg",
    ]);
    expect(host.textContent).toContain("2 images");
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
```

Keep the existing Categorize-button test. Auto-open must not load two drafts at once.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/app/windows/collect-shell/collect-shell.test.tsx`

Expected: FAIL (no images, no auto draft).

- [ ] **Step 3: Write minimal implementation**

In `collect-shell.tsx`:

1. Import `useScrollFade` from `@/hooks/use-scroll-fade` and `CaptureDraft` / `CaptureItemSchema` types from `@pond/schema/capture`.
2. Store `items` from `captures.draft`.
3. After `captures.list`, if `!draftId`, pick the last `state === "draft"` job and call `editDraft`.
4. Render:

```tsx
{draftId && items.length > 0 ? (
  <div className={styles.grid} {...scrollFade} aria-label="Page assets">
    {items.map((item, index) => {
      const src =
        item.kind === "asset" || item.kind === "url"
          ? item.url
          : item.kind === "image"
            ? item.dataUrl
            : undefined;
      return (
        <figure key={`${item.kind}-${index}`} className={styles.asset}>
          {src ? <img src={src} alt="" /> : <span>{item.kind}</span>}
        </figure>
      );
    })}
  </div>
) : null}
```

5. Copy under the heading when a draft is open: `` `${items.length} ${items.length === 1 ? "image" : "images"}` ``.

CSS (`grid`, `asset` only; states stay `data-*`):

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  max-height: 220px;
  min-height: 0;
  overflow: auto;
  -webkit-app-region: no-drag;
}

.asset {
  margin: 0;
  border: 1px solid var(--ds-gray-4);
  border-radius: var(--ds-radius-md);
  overflow: hidden;
  background: var(--ds-gray-2);
}

.asset img {
  display: block;
  width: 100%;
  height: 96px;
  object-fit: contain;
}
```

Folder list currently uses inline styles. Do not restyle it in this task.

`useScrollFade` on `.grid` because it clips.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/app/windows/collect-shell/collect-shell.test.tsx`

Expected: PASS, including the existing draft metadata test.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/src/app/windows/collect-shell/collect-shell.tsx \
  apps/desktop/src/renderer/src/app/windows/collect-shell/collect-shell.module.css \
  apps/desktop/src/renderer/src/app/windows/collect-shell/collect-shell.test.tsx
git commit -m "$(cat <<'EOF'
feat(desktop): show Collect draft assets before save

Page-asset review needs the queued images on screen, not only tag fields.

EOF
)"
```

---

### Task 3: Extension save-time tags and folders

**Files:**
- Create: `apps/desktop/src/main/core/capture-metadata.test.ts`
- Modify: `packages/schema/src/capture.ts`
- Modify: `packages/schema/src/native.ts`
- Modify: `apps/desktop/src/main/native/rpc.ts`
- Modify: `apps/desktop/src/main/native/rpc.test.ts`
- Modify: `apps/desktop/src/main/native/ports.ts`
- Modify: `apps/extension/utils/page-assets.ts`
- Modify: `apps/extension/entrypoints/background.ts`

`CaptureMetadataSchema` already has `tags` and `folderIds`. The extension always sends empty arrays. Collect checkbox already sets `mode: "collect"`. Add a tags field and folder checkboxes sourced from native `folders.list`.

- [ ] **Step 1: Write the failing tests**

`apps/desktop/src/main/core/capture-metadata.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseCaptureTags } from "@pond/schema/capture";

describe("parseCaptureTags", () => {
  it("splits, trims, and drops blanks", () => {
    expect(parseCaptureTags(" design, reference , ,print ")).toEqual([
      "design",
      "reference",
      "print",
    ]);
  });

  it("caps at 200 tags", () => {
    const input = Array.from({ length: 201 }, (_, index) => `tag-${index}`).join(
      ",",
    );
    expect(parseCaptureTags(input)).toHaveLength(200);
  });
});
```

Add to `rpc.test.ts` inside `dispatchNative`:

```ts
it("returns folders.list from the injected port", async () => {
  const foldersList = vi.fn().mockResolvedValue([{ id: "refs", name: "Refs" }]);
  await expect(
    dispatchNative({ type: "folders.list" }, ports({ foldersList })),
  ).resolves.toEqual({
    ok: true,
    data: [{ id: "refs", name: "Refs" }],
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/capture-metadata.test.ts src/main/native/rpc.test.ts`

Expected: FAIL (`parseCaptureTags` missing, `folders.list` invalid).

- [ ] **Step 3: Write minimal implementation**

In `packages/schema/src/capture.ts`:

```ts
export function parseCaptureTags(value: string): string[] {
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.slice(0, 200);
}
```

In `packages/schema/src/native.ts` add:

```ts
z.object({ type: z.literal("folders.list") }),
```

to `nativeRequestSchema`.

In `rpc.ts` `NativePorts`:

```ts
foldersList?: () => Promise<{ id: string; name: string }[]>;
```

Dispatch case:

```ts
case "folders.list":
  if (!ports.foldersList) return { ok: false, error: "folders_unavailable" };
  return { ok: true, data: await ports.foldersList() };
```

In `ports.ts`:

```ts
foldersList: async () => {
  const { listFolders } = await import("../core/folders");
  return (await listFolders()).map((folder) => ({
    id: folder.id,
    name: folder.name,
  }));
},
```

`rpc.test.ts` `ports()` needs no `foldersList` by default (optional).

`page-assets.ts`:

1. Widen `PageAssetSelection`:

```ts
export interface PageAssetSelection {
  urls: string[];
  collect: boolean;
  originUrl: string;
  title: string;
  tags: string[];
  folderIds: string[];
}
```

2. Change `pickPageAssets` to `pickPageAssets(catalog?: { folders: { id: string; name: string }[] })`.

3. In the footer, after the categorize checkbox, add:

```ts
const tagsLabel = document.createElement("label");
tagsLabel.textContent = "Tags ";
const tagsInput = document.createElement("input");
tagsInput.type = "text";
tagsInput.placeholder = "design, reference";
tagsLabel.append(tagsInput);
footer.append(count, collectLabel, tagsLabel, save);
```

If `catalog?.folders.length`, add a `Folders` fieldset of checkboxes (`name` visible, `id` as value). No ellipsis on `Save Selected`. Heading stays `Collect images`. Button text `Save Selected`.

4. `save.onclick` finish payload:

```ts
finish({
  urls: [...selected],
  collect: collect.checked,
  originUrl: location.href,
  title: document.title,
  tags: parseCaptureTags(tagsInput.value),
  folderIds: [...folderBox].filter((box) => box.checked).map((box) => box.value),
});
```

Import `parseCaptureTags` from `@pond/schema/capture`. Collect the checkbox NodeList into an array named `folderBox`.

`background.ts` `capturePageAssets`:

```ts
async function capturePageAssets(tabId: number) {
  const folders = await nativeCall({ type: "folders.list" });
  const catalog = folders.ok
    ? { folders: folders.data as { id: string; name: string }[] }
    : { folders: [] };
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: pickPageAssets,
    args: [catalog],
  });
  const picked = result?.result;
  if (!picked?.urls.length) return;
  const response = await nativeCall({
    type: "capture.accept",
    cookies: await cookiesForUrl(picked.originUrl),
    draft: {
      id: crypto.randomUUID(),
      originUrl: picked.originUrl,
      mode: picked.collect ? "collect" : "quick",
      metadata: { tags: picked.tags, folderIds: picked.folderIds },
      items: picked.urls.map((url) => ({ kind: "asset", url })),
    },
  });
  flashBadge(
    tabId,
    response.ok ? "ok" : "x",
    response.ok ? "#1f9d55" : "#cc3333",
  );
}
```

Do not use a type assertion if `nativeCall` already returns `unknown` you can parse with zod. Prefer:

```ts
const FolderCatalogSchema = z.object({
  folders: z.array(z.object({ id: z.string(), name: z.string() })),
});
```

in background, or parse `folders.data` with `z.array(z.object({ id: z.string(), name: z.string() }))`.

`executeScript` `func` must be serializable. `pickPageAssets` already is injected; importing `parseCaptureTags` inside it bundles into the injected function. If WXT inlines the module, that is fine. If injection fails because of imports, copy the five-line splitter into `page-assets.ts` and keep `parseCaptureTags` as the shared tested function called from background on `picked.tags` as a string instead.

Preferred fallback if injection cannot import schema: keep tags as a raw string on `PageAssetSelection.tagText` and parse in `background.ts` with `parseCaptureTags`. Then `pickPageAssets` stays DOM-only with no imports.

Use that fallback. `PageAssetSelection.tagText: string` plus `folderIds: string[]`. Background:

```ts
metadata: {
  tags: parseCaptureTags(picked.tagText),
  folderIds: picked.folderIds,
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/capture-metadata.test.ts src/main/native/rpc.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/schema/src/capture.ts packages/schema/src/native.ts \
  apps/desktop/src/main/core/capture-metadata.test.ts \
  apps/desktop/src/main/native/rpc.ts apps/desktop/src/main/native/rpc.test.ts \
  apps/desktop/src/main/native/ports.ts \
  apps/extension/utils/page-assets.ts \
  apps/extension/entrypoints/background.ts
git commit -m "$(cat <<'EOF'
feat(extension): send folders and tags at collect time

The page-asset grid saved into Uncategorized because metadata was empty.

EOF
)"
```

---

### Task 4: Save page element screenshot

**Files:**
- Modify: `packages/schema/src/capture.ts` (add `regionFromElement` next to the tag helper, or keep in a tiny export used by both)
- Modify: `apps/desktop/src/main/core/capture-metadata.test.ts` (add region cases)
- Modify: `apps/extension/utils/browser-screenshot.ts`
- Modify: `apps/extension/entrypoints/background.ts`

Region crop already exists (`pickBrowserRegion` + `cropScreenshot`). Element capture is click-an-element, then the same crop. Context menu label: `Save Page Element Screenshot`.

- [ ] **Step 1: Write the failing tests**

Add to `capture-metadata.test.ts`:

```ts
import { regionFromElement } from "@pond/schema/capture";

describe("regionFromElement", () => {
  it("clamps a DOM rect to the viewport", () => {
    expect(
      regionFromElement(
        { x: -20, y: 10, width: 400, height: 50 },
        { width: 200, height: 100 },
      ),
    ).toEqual({
      x: 0,
      y: 10,
      width: 200,
      height: 50,
      viewportWidth: 200,
      viewportHeight: 100,
    });
  });

  it("rejects an empty hit", () => {
    expect(
      regionFromElement(
        { x: 10, y: 10, width: 0, height: 10 },
        { width: 200, height: 100 },
      ),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/capture-metadata.test.ts`

Expected: FAIL (`regionFromElement` missing).

- [ ] **Step 3: Write minimal implementation**

In `packages/schema/src/capture.ts`:

```ts
export interface ElementRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function regionFromElement(
  rect: ElementRegion,
  viewport: { width: number; height: number },
) {
  const x = Math.min(viewport.width, Math.max(0, rect.x));
  const y = Math.min(viewport.height, Math.max(0, rect.y));
  const width = Math.min(viewport.width - x, Math.max(0, rect.width));
  const height = Math.min(viewport.height - y, Math.max(0, rect.height));
  if (width < 1 || height < 1) return null;
  return {
    x,
    y,
    width,
    height,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  };
}
```

In `browser-screenshot.ts` add `pickPageElement` modeled on `pickBrowserRegion`: overlay `cursor: pointer`, label `Click an element to capture. Esc to cancel.`, on click `event.preventDefault()`, `const target = document.elementFromPoint(...)` skipping the overlay, `getBoundingClientRect()`, `regionFromElement`. Copy `regionFromElement` into this file only if the injected script cannot import schema (same injection rule as Task 3). Prefer importing from `@pond/schema/capture` if WXT bundles it; otherwise duplicate the clamp in `browser-screenshot.ts` and keep the schema function as the tested source used from tests.

Background: add menu id `pond-element` with title `Save Page Element Screenshot` in the same `contexts: ["page", "image"]` loop.

`captureBrowserScreenshot` gains mode `"element"`:

```ts
const selection =
  mode === "region"
    ? (await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: pickBrowserRegion,
      }))[0]?.result
    : mode === "element"
      ? (await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: pickPageElement,
        }))[0]?.result
      : null;
```

Reuse the existing region crop path when `selection` is a region. `onClicked` maps `pond-element` to `"element"`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @pond/desktop exec vitest run src/main/core/capture-metadata.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/schema/src/capture.ts \
  apps/desktop/src/main/core/capture-metadata.test.ts \
  apps/extension/utils/browser-screenshot.ts \
  apps/extension/entrypoints/background.ts
git commit -m "$(cat <<'EOF'
feat(extension): capture a page element screenshot

Region drag already existed. Click-to-element fills the remaining Collect capture.

EOF
)"
```

---

### Task 5: Auto-Import settings and live Collect smoke

**Files:**
- Create: `apps/desktop/src/renderer/src/features/settings/components/sections/storage/auto-import.tsx`
- Create: `apps/desktop/src/renderer/src/features/settings/components/sections/storage/auto-import.test.tsx`
- Create: `apps/desktop/scripts/smoke-collect.cjs`
- Modify: `apps/desktop/src/renderer/src/features/settings/lib/config-storage.tsx`
- Modify: `apps/desktop/src/renderer/src/features/settings/components/sections/storage/storage.tsx`
- Modify: `apps/desktop/src/renderer/src/features/settings/lib/search-index.ts`
- Modify: `apps/desktop/src/main/tray-menu.ts`
- Modify: `apps/desktop/src/main/tray.ts`

Storage “Watched folders” currently says “Manage folder imports in Sources” and routes to harvest. Auto-Import is `prefs.autoImport`, not a Source. Replace that row with a real Watched Folder control. Hide path/mode until enabled. Tray currently has no Collect or screenshot entries.

- [ ] **Step 1: Write the failing settings test**

`auto-import.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { AutoImportSettings } from "./auto-import";

it("hides path controls until Auto-Import is on", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const query = vi.fn(async (name: string) => {
    if (name === "autoImport.status")
      return { enabled: false, path: "", mode: "copy", history: [] };
    return { ok: true };
  });
  vi.stubGlobal("pond", { query });
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<AutoImportSettings />));
    expect(host.textContent).toContain("Watched Folder");
    expect(host.textContent).not.toContain("Copy files");
    expect(host.textContent).not.toContain("Move files");
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});

it("shows copy or move and the watched path when enabled", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const query = vi.fn(async (name: string) => {
    if (name === "autoImport.status")
      return {
        enabled: true,
        path: "/Users/me/Inbox",
        mode: "copy",
        history: [{ at: 1, name: "shot.png", mode: "copy", ok: true, id: "s1" }],
      };
    return { ok: true };
  });
  vi.stubGlobal("pond", { query });
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<AutoImportSettings />));
    expect(host.textContent).toContain("/Users/me/Inbox");
    expect(host.textContent).toContain("Copy files");
    expect(host.textContent).toContain("shot.png");
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/settings/components/sections/storage/auto-import.test.tsx`

Expected: FAIL (module missing).

- [ ] **Step 3: Write Auto-Import settings, tray entries, and smoke**

`auto-import.tsx` uses Pond UI `Button`, `Settings`, `Select`. Query `autoImport.status`. Mutations call `autoImport.set` and `autoImport.pickFolder`. Copy:

- Title: `Watched Folder`
- Description: `Import files that appear in one folder on this Mac.`
- Switch label: `Watch a Folder` (or the Settings.ItemTitle `Watched Folder` with a switch)
- Nested when on: path text, `Choose Folder` button, `Select` with `Copy files` / `Move files` (values `copy` / `move`)
- History: last 8 `history` names as a status list. Success is the file name. Failure is `${name} failed`.

Do not send people to `/sources`.

Replace the Storage row in `storage.tsx` (`setting-storage-watched-folder`) with `<AutoImportSettings />` **or** add a `config-storage.tsx` group:

```tsx
{
  title: "Auto-Import",
  fullWidth: true,
  render: () => <AutoImportSettings />,
},
```

and delete the dead Sources row from `LocationRow` so there is only one Watched Folder control.

Search index already has `Watched Folder`. Change its description to `Import files that appear in one folder on this Mac.`

Tray (`tray-menu.ts`) insert after Open Library:

```ts
{
  ...sym("square.and.arrow.down"),
  label: "Collection Window",
  click: () => void opts.onOpenCollection?.(),
},
{
  ...sym("camera"),
  label: "Screenshot Display",
  click: () => void opts.onScreenshotDisplay?.(),
},
{
  ...sym("camera.viewfinder"),
  label: "Screenshot Area",
  click: () => void opts.onScreenshotArea?.(),
},
{
  ...sym("macwindow"),
  label: "Screenshot Window",
  click: () => void opts.onScreenshotWindow?.(),
},
{ type: "separator" },
```

Extend `TrayOptions` in `tray.ts` with those optional callbacks. Wire them in the existing `ensureTray` caller (search `onOpenLibrary` in `apps/desktop/src/main`) to the same functions File menu uses: `openCollectionWindow`, `captureDisplay`, `openCaptureWindow`, `captureWindow`.

`apps/desktop/scripts/smoke-collect.cjs` follows `smoke-folder-tags.cjs`: `POND_SANDBOX` temp dir, 45s timeout, `executeJavaScript` on `index.html`.

Script body must assert:

1. `folders.create` name `Inbox`
2. `captures.accept` collect draft with one `note` item `{ kind: "note", text: "Collect smoke", title: "Smoke note" }` (notes do not need a network). Expect `state === "draft"`.
3. `captures.resume` with `{ tags: ["smoke"], folderIds: [inbox.id] }`. `captures.list` eventually `complete` or call `saves.get` on `saveIds[0]` and expect tags to include `smoke`.
4. `saves.importClipboard` after writing a PNG is OS-dependent. Instead create a file with `saves.createManual` from a temp path **and** set Auto-Import: write `watch/hello.txt`, `autoImport.set({ enabled: true, path: watchDir, mode: "copy" })`, wait/poll `autoImport.status` history for `hello.txt` with `ok: true`. If the worker needs more than 3s of stability, poll up to 15s.
5. `capture.display` may fail in CI without screen permission. Treat `error === "cancelled"` or a permission string as skip; do not fail the smoke unless the query is missing.

Print `COLLECT_SMOKE_OK` and `app.exit(0)` on success.

- [ ] **Step 4: Run unit tests**

Run: `pnpm --filter @pond/desktop exec vitest run src/renderer/src/features/settings/components/sections/storage/auto-import.test.tsx`

Expected: PASS.

Smoke (optional on this machine if Electron is built):

```sh
pnpm --filter @pond/desktop exec electron scripts/smoke-collect.cjs
```

Expected: `COLLECT_SMOKE_OK`. If the desktop bundle is stale, unit tests still gate the PR. Do not fail the commit on an unbuilt smoke.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/src/features/settings/components/sections/storage/auto-import.tsx \
  apps/desktop/src/renderer/src/features/settings/components/sections/storage/auto-import.test.tsx \
  apps/desktop/src/renderer/src/features/settings/lib/config-storage.tsx \
  apps/desktop/src/renderer/src/features/settings/components/sections/storage/storage.tsx \
  apps/desktop/src/renderer/src/features/settings/lib/search-index.ts \
  apps/desktop/src/main/tray-menu.ts \
  apps/desktop/src/main/tray.ts \
  apps/desktop/scripts/smoke-collect.cjs
git commit -m "$(cat <<'EOF'
feat(desktop): wire Auto-Import settings and Collect smoke

Settings sent watches to Sources. Drive the existing auto-import prefs instead.

EOF
)"
```

If `tray.ts` / `storage.tsx` / `search-index.ts` / `config-storage.tsx` are mixed, use the bak policy.

---

## Spec coverage

- Page-asset grid: Task 1 queues Collect; Task 2 renders the draft images; extension already has a page grid (Task 3 fills metadata).
- Save-time folder/tag: Task 3 extension + existing Collect fields.
- Screenshots: File menu already has display/area/window; Task 4 adds element; Task 5 adds tray + smoke.
- Auto-Import: Task 5 Settings + smoke.
- Live session: Task 5 smoke. Extension Chrome handoff remains a human checklist (load unpacked extension, Collect images, element screenshot).

## Placeholder scan

No TBD. `regionFromElement` / `parseCaptureTags` names are stable across tasks. `queued` is the extract contract used by the Import Page Assets toast.
