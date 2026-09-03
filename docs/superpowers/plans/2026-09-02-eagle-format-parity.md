# Eagle Format Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee lossless Pond migration and manual import for every format supported by Eagle on macOS or Windows, including Eagle's official preview-extension formats.

**Architecture:** Keep original bytes as the source of truth and separate file classification from preview capability. A shared Eagle compatibility manifest defines the accepted extension contract; the classifier assigns media type, MIME type, and one of Pond's safe preview strategies. Browser-safe formats use native Pond viewers, OS-dependent/proprietary formats request native thumbnails and fall back to a file tile plus Open/Export without ever rejecting the original.

**Tech Stack:** TypeScript, Electron native thumbnails, React viewers, Sharp, FFmpeg poster extraction, Vitest, Biome.

---

### Task 1: Encode Eagle's format contract

**Files:**
- Create: `apps/desktop/src/shared/eagle-formats.ts`
- Create: `apps/desktop/src/shared/eagle-formats.test.ts`

- [ ] **Step 1: Write the manifest coverage test**

```ts
import { describe, expect, it } from "vitest";
import {
  EAGLE_CORE_EXTENSIONS,
  EAGLE_PLUGIN_EXTENSIONS,
  EAGLE_SUPPORTED_EXTENSIONS,
} from "./eagle-formats";

describe("Eagle format compatibility", () => {
  it("contains every installed Eagle macOS, Windows, and official plugin format", () => {
    expect(EAGLE_SUPPORTED_EXTENSIONS.size).toBe(
      new Set([...EAGLE_CORE_EXTENSIONS, ...EAGLE_PLUGIN_EXTENSIONS]).size,
    );
    expect(EAGLE_SUPPORTED_EXTENSIONS).toEqual(
      expect.objectContaining({ has: expect.any(Function) }),
    );
    for (const ext of ["psd", "cr3", "docx", "3mf", "epub", "swf"]) {
      expect(EAGLE_SUPPORTED_EXTENSIONS.has(ext)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run: `pnpm --filter @pond/desktop test -- src/shared/eagle-formats.test.ts`

Expected: FAIL because `eagle-formats.ts` does not exist.

- [ ] **Step 3: Add grouped, immutable extension arrays**

```ts
export const EAGLE_SUPPORTED_EXTENSIONS: ReadonlySet<string> = new Set([
  ...EAGLE_CORE_EXTENSIONS,
  ...EAGLE_PLUGIN_EXTENSIONS,
]);

export function eagleFormatGroup(extension: string): EagleFormatGroup | null {
  return GROUP_BY_EXTENSION.get(extension.toLowerCase()) ?? null;
}
```

Define `EAGLE_CORE_EXTENSIONS` as the exact 126-entry union extracted from the installed Eagle macOS and Windows manifests. Define `EAGLE_PLUGIN_EXTENSIONS` from the official format-extension catalog, including EPUB, SWF, LIVP, archive/web formats, and the video-thumbnail extension's additional codecs. Group every entry exactly once in `EAGLE_FORMAT_GROUPS`.

```ts
export const EAGLE_SUPPORTED_EXTENSIONS = new Set<string>([
  ...EAGLE_CORE_EXTENSIONS,
  ...EAGLE_PLUGIN_EXTENSIONS,
]);
```

- [ ] **Step 4: Run the manifest test**

Run: `pnpm --filter @pond/desktop test -- src/shared/eagle-formats.test.ts`

Expected: PASS.

### Task 2: Classify every Eagle format without unsafe rendering

**Files:**
- Modify: `apps/desktop/src/shared/file-format.ts`
- Modify: `apps/desktop/src/shared/file-format.test.ts`
- Modify: `apps/desktop/src/renderer/src/lib/media/units.ts`
- Modify: `apps/desktop/src/renderer/src/lib/media/units.test.ts`
- Modify: `apps/desktop/src/renderer/src/lib/media/file-viewer.ts`
- Modify: `apps/desktop/src/renderer/src/lib/media/file-viewer.test.ts`

- [ ] **Step 1: Add table-driven classifier tests for the entire manifest**

```ts
it.each([...EAGLE_SUPPORTED_EXTENSIONS])("classifies Eagle format .%s", (ext) => {
  const result = classifyLibraryFile(`asset.${ext}`);
  expect(result.extension).toBe(ext);
  expect(result.mimeType).not.toBe("");
  expect(["direct-image", "native-image", "video", "audio", "pdf", "font", "text", "generic"]).toContain(result.previewKind);
});
```

- [ ] **Step 2: Run the focused tests and confirm unsupported-category failures**

Run: `pnpm --filter @pond/desktop test -- src/shared/file-format.test.ts src/renderer/src/lib/media/file-viewer.test.ts src/renderer/src/lib/media/units.test.ts`

Expected: FAIL for missing Eagle category routing.

- [ ] **Step 3: Expand classifier maps and preserve safe fallback behavior**

```ts
const GENERIC_IMAGES = new Map([
  ["psd", "image/vnd.adobe.photoshop"],
  ["cr3", "image/x-canon-cr3"],
]);

const GENERIC_DOCUMENTS = new Map([
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
]);
```

Return `mediaType: "image"` with `previewKind: "generic"` for proprietary/RAW images, and `mediaType: "document"` with `previewKind: "generic"` for Office/design documents. Keep HTML/MHTML/SWF generic so imported active content never executes inside Pond.

- [ ] **Step 4: Restrict media slides to actual renderable previews**

```ts
export function isImageFile(file: SaveFile): boolean {
  if (file.kind === "cover") return true;
  const kind = classifyLibraryFile(file.path, file.mimeType).previewKind;
  return kind === "direct-image" || kind === "native-image";
}
```

Route generic image/document/model/web formats through `StoredFileViewer` so failed OS thumbnail generation cannot produce a blank detail page.

- [ ] **Step 5: Run the focused classifier and renderer tests**

Run: `pnpm --filter @pond/desktop test -- src/shared/file-format.test.ts src/renderer/src/lib/media/file-viewer.test.ts src/renderer/src/lib/media/units.test.ts`

Expected: PASS.

### Task 3: Make Eagle bundle partitioning exact and lossless

**Files:**
- Modify: `apps/desktop/src/main/core/eagle-import.ts`
- Modify: `apps/desktop/src/main/core/eagle-import.test.ts`
- Modify: `apps/desktop/src/main/core/manual-import.test.ts`

- [ ] **Step 1: Add tests for generated thumbnail names and legitimate originals**

```ts
expect(partitionEagleItemFiles([
  "metadata.json",
  "thumbnail-concept.psd",
  "item_thumbnail.png",
])).toEqual({
  mediaFiles: ["thumbnail-concept.psd"],
  thumbnail: "item_thumbnail.png",
});
```

- [ ] **Step 2: Run the import tests and verify the broad thumbnail matcher fails**

Run: `pnpm --filter @pond/desktop test -- src/main/core/eagle-import.test.ts src/main/core/manual-import.test.ts`

Expected: FAIL because the legitimate original is currently mistaken for Eagle's generated thumbnail.

- [ ] **Step 3: Match only Eagle's generated thumbnail convention**

```ts
const thumbnail = visible.find((name) => name.endsWith("_thumbnail.png")) ?? null;
```

Keep every other visible, readable, non-empty file. Continue preserving title, URL, note, tags, folders, dimensions, source ID, original filename, and original bytes.

- [ ] **Step 4: Add a manifest-wide storage policy test**

```ts
for (const ext of EAGLE_SUPPORTED_EXTENSIONS) {
  expect(storageKindForImport(classifyLibraryFile(`asset.${ext}`), 0)).toBeTruthy();
}
```

- [ ] **Step 5: Run import tests**

Run: `pnpm --filter @pond/desktop test -- src/main/core/eagle-import.test.ts src/main/core/manual-import.test.ts`

Expected: PASS.

### Task 4: Publish the compatibility matrix

**Files:**
- Modify: `docs/supported-formats.md`
- Use: `docs/research/2026-09-02-eagle-format-compatibility.md`

- [ ] **Step 1: Document the four support guarantees**

Document separately: lossless storage, card preview, in-app viewer, and Open/Export fallback. State that OS/provider-dependent previews may fall back to a type tile without affecting the original.

- [ ] **Step 2: Add the exact Eagle extension matrix**

List every extension by category and label formats that depend on native thumbnails or external applications. Include official plugin formats such as EPUB and SWF, and compressed-file formats as generic lossless assets.

- [ ] **Step 3: Verify documentation and code use the same manifest**

Run: `rg -n "Eagle compatibility|Original-file guarantee|PSD|CR3|DOCX|3MF|EPUB|SWF" docs/supported-formats.md`

Expected: every named compatibility category appears.

### Task 5: Complete verification

**Files:**
- Verify all files modified above.

- [ ] **Step 1: Run focused tests**

Run: `pnpm --filter @pond/desktop test -- src/shared/eagle-formats.test.ts src/shared/file-format.test.ts src/main/core/eagle-import.test.ts src/main/core/manual-import.test.ts src/renderer/src/lib/media/file-viewer.test.ts src/renderer/src/lib/media/units.test.ts`

Expected: PASS.

- [ ] **Step 2: Run desktop typecheck**

Run: `pnpm --filter @pond/desktop typecheck`

Expected: PASS.

- [ ] **Step 3: Run Biome on touched files**

Run: `pnpm exec biome ci apps/desktop/src/shared/eagle-formats.ts apps/desktop/src/shared/eagle-formats.test.ts apps/desktop/src/shared/file-format.ts apps/desktop/src/shared/file-format.test.ts apps/desktop/src/main/core/eagle-import.ts apps/desktop/src/main/core/eagle-import.test.ts apps/desktop/src/renderer/src/lib/media/units.ts apps/desktop/src/renderer/src/lib/media/units.test.ts apps/desktop/src/renderer/src/lib/media/file-viewer.ts apps/desktop/src/renderer/src/lib/media/file-viewer.test.ts docs/supported-formats.md`

Expected: PASS.

- [ ] **Step 4: Run the complete desktop test suite**

Run: `pnpm --filter @pond/desktop test`

Expected: PASS, with the repository's intentional skips unchanged.

- [ ] **Step 5: Run the production build**

Run: `pnpm --filter @pond/desktop build`

Expected: PASS.

- [ ] **Step 6: Review the diff for losslessness and security**

Confirm the importer never converts or discards an original, generated previews remain cache-only, active formats never execute in the renderer, and unsupported previews always expose Open/Export.
